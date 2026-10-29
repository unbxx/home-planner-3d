#!/usr/bin/env node
// Home planner 3D connector: lets Claude change and furnish a home in the planner, on your own computer.
//
// Claude Desktop or Claude Code start this program and talk to it over stdin and stdout (the Model Context Protocol).
// It serves the planner on http://127.0.0.1:47380, opens it in your browser, and passes each of Claude's tool calls to
// that tab, which carries it out with the planner's own editing and sends the answer back. Nothing goes anywhere else.
// No dependencies: Node 18 or later.
//
// Settings, as environment variables:
//   PLANNER_FILE  a planner .html file on this computer to serve instead of the website
//   PLANNER_URL   the planner to serve (default: the public site)
//   PLANNER_PORT  the first port to try (default 47380)
//   NO_OPEN=1     do not open the browser (the tab is opened by hand)
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

const VERSION = '1.1.0';
const PLANNER_URL = process.env.PLANNER_URL || 'https://unbxx.github.io/home-planner-3d/';
const PLANNER_FILE = /\$\{/.test(process.env.PLANNER_FILE || '') ? '' : (process.env.PLANNER_FILE || '').trim(); // an unset Claude Desktop setting arrives as ${user_config.…}
const FIRST_PORT = +process.env.PLANNER_PORT || 47380;
// the page's key is kept between runs, so an open planner tab links up again when Claude restarts the connector
const TOKEN = (() => {
  const file = path.join(os.tmpdir(), 'home-planner-3d.token');
  try { const t = fs.readFileSync(file, 'utf8').trim(); if (/^[0-9a-f]{32}$/.test(t)) return t; } catch (e) { /* first run */ }
  const t = crypto.randomBytes(16).toString('hex');
  try { fs.writeFileSync(file, t, { mode: 0o600 }); } catch (e) { /* a new key each run then */ }
  return t;
})();
const log = (...a) => process.stderr.write('[home-planner] ' + a.join(' ') + '\n');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- the planner page, served on 127.0.0.1 with a key only it knows ---------- */
let port = 0, pageCache = null;
const SAVED_PAGE = path.join(os.tmpdir(), 'home-planner-3d.html'); // the last page from the website, for when it cannot be reached
async function plannerHtml() {
  if (PLANNER_FILE) return fs.readFileSync(PLANNER_FILE.replace(/^~(?=$|\/)/, os.homedir()), 'utf8');
  if (pageCache && Date.now() - pageCache.at < 60000) return pageCache.html;
  try {
    const res = await fetch(PLANNER_URL, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`the planner could not be loaded from ${PLANNER_URL} (${res.status})`);
    pageCache = { html: await res.text(), at: Date.now() };
    try { fs.writeFileSync(SAVED_PAGE, pageCache.html); } catch (e) { /* only a spare copy */ }
    return pageCache.html;
  } catch (err) {
    if (fs.existsSync(SAVED_PAGE)) { log('using the saved planner page:', err.message); return fs.readFileSync(SAVED_PAGE, 'utf8'); }
    throw err;
  }
}
/* ---------- 3D Warehouse: one model at a time, by the link the user pasted ---------- */
// 3D Warehouse does not let web pages fetch its files, so the planner asks here for the one model the user chose.
// Only its own two hosts are asked, and only for that model's details and its public 3D copy (a GLB it makes for models under about 10 MB).
const WAREHOUSE = 'https://3dwarehouse.sketchup.com/warehouse/v1.0/entities/';
const WAREHOUSE_FILES = /^https:\/\/download-warehouse\.sketchup\.com\/warehouse\/v1\.0\/content\/public\//;
async function warehouseModel(id) {
  if (!/^[A-Za-z0-9-]{6,64}$/.test(id || '')) throw new Error('That is not a link to a 3D Warehouse model.');
  const r = await fetch(WAREHOUSE + id + '?showBinaryMetadata=true', { signal: AbortSignal.timeout(20000) });
  if (r.status === 404) throw new Error('3D Warehouse has no model at that link.');
  if (!r.ok) throw new Error(`3D Warehouse answered ${r.status}.`);
  const e = await r.json(), b = e.binaries || {}, pub = (k) => (b[k] && WAREHOUSE_FILES.test(b[k].contentUrl || '') ? b[k].contentUrl : null);
  return { id: e.id || id, title: e.title || 'Model', author: (e.creator && e.creator.displayName) || '', page: `https://3dwarehouse.sketchup.com/model/${e.id || id}`, thumb: pub('bot_lt') || pub('bot_st'), glb: pub('glb') };
}
async function warehouseRoute(url, res) {
  try {
    const m = await warehouseModel(url.searchParams.get('id'));
    if (url.pathname === '/lib/3dw') { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify({ ...m, glb: !!m.glb })); return; }
    if (!m.glb) throw new Error('3D Warehouse has no 3D copy of this model.');
    const r = await fetch(m.glb, { signal: AbortSignal.timeout(90000) });
    if (!r.ok) throw new Error(`3D Warehouse answered ${r.status} for the model file.`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 100 * 1048576) throw new Error('The model file is over 100 MB.');
    log(`3D Warehouse: ${m.title} (${(buf.length / 1048576).toFixed(1)} MB)`);
    res.writeHead(200, { 'Content-Type': 'model/gltf-binary', 'Cache-Control': 'no-store' }).end(buf);
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' }).end(err.name === 'TimeoutError' ? '3D Warehouse did not answer in time.' : err.message);
  }
}

const clients = new Set();
const pending = new Map();
let seq = 0;
const server = http.createServer(async (req, res) => {
  // only this computer, by its own name for itself; a page from elsewhere cannot use the connector
  const host = (req.headers.host || '').toLowerCase();
  if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) { res.writeHead(403).end(); return; }
  const url = new URL(req.url, `http://${host}`), keyOk = url.searchParams.get('token') === TOKEN;
  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      const html = (await plannerHtml()).replace(/<head>/i, `<head>\n<meta name="planner-connector" content="${TOKEN}">`);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(html);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/mcp/events' && keyOk) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(': connected\n\n');
      clients.add(res);
      const beat = setInterval(() => res.write(': still here\n\n'), 15000);
      req.on('close', () => { clearInterval(beat); clients.delete(res); });
      log('planner tab connected');
      return;
    }
    if (req.method === 'GET' && url.pathname === '/mcp/hello' && keyOk) { res.writeHead(204).end(); return; }
    if (req.method === 'GET' && (url.pathname === '/lib/3dw' || url.pathname === '/lib/3dw/glb') && keyOk) { await warehouseRoute(url, res); return; }
    if (req.method === 'POST' && url.pathname === '/mcp/result' && keyOk) {
      let body = '';
      req.setEncoding('utf8');
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        res.writeHead(204).end();
        let msg; try { msg = JSON.parse(body); } catch (e) { return; }
        const p = pending.get(msg.id);
        if (!p) return;
        pending.delete(msg.id);
        log(`${p.tool}: ${Date.now() - p.at} ms (to the page ${msg.got - p.at}, in it ${msg.ms}, back ${Date.now() - msg.got - msg.ms})`);
        if (msg.ok) p.resolve(msg.result); else p.reject(new Error(msg.error || 'the planner could not do that'));
      });
      return;
    }
    res.writeHead(404).end();
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' }).end('The planner could not be loaded: ' + err.message + '\nIt needs an internet connection the first time; after that a saved copy is used when the website cannot be reached.');
  }
});
function listen(p) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(p, '127.0.0.1', () => { server.removeListener('error', reject); resolve(p); });
  });
}
async function start() {
  for (let p = FIRST_PORT; p < FIRST_PORT + 10; p++) {
    try { port = await listen(p); log(`planner at http://127.0.0.1:${port}/`); return; } catch (e) { if (e.code !== 'EADDRINUSE') throw e; }
  }
  throw new Error('no free port for the planner');
}
const plannerUrl = () => `http://127.0.0.1:${port}/`;

/* ---------- the browser tab ---------- */
let openedAt = 0;
function openBrowser() {
  if (process.env.NO_OPEN) return;
  const u = plannerUrl();
  const cmd = process.platform === 'darwin' ? ['open', [u]] : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', u]] : ['xdg-open', [u]];
  try { spawn(cmd[0], cmd[1], { stdio: 'ignore', detached: true }).unref(); } catch (e) { log('could not open the browser:', e.message); }
}
async function tab() {
  if (clients.size) return [...clients].pop();
  if (Date.now() - openedAt > 20000) { openedAt = Date.now(); openBrowser(); }
  for (let i = 0; i < 60; i++) { await sleep(500); if (clients.size) { await sleep(400); return [...clients].pop(); } }
  throw new Error(`The planner is not open. Open ${plannerUrl()} in your browser and try again.`);
}
async function callPage(tool, args, timeout = 60000) {
  const client = await tab(), id = ++seq;
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { pending.delete(id); reject(new Error('The planner did not answer in time. Is its tab still open?')); }, timeout);
    pending.set(id, { tool, at: Date.now(), resolve: (v) => { clearTimeout(t); resolve(v); }, reject: (e) => { clearTimeout(t); reject(e); } });
    client.write(`data: ${JSON.stringify({ id, tool, args })}\n\n`);
  });
}

/* ---------- the tools Claude sees ---------- */
const CM = 'centimetres; x runs east and z south from the inside north-west corner of the home';
const point = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 };
const INSTRUCTIONS = `Home planner 3D: a home in 3D at real size, open in the user's browser. Everything is in ${CM}.
Start with get_home (and list_furniture before placing furniture). Change walls, doors, windows, columns, beams and rooms with edit_house; furniture with place_furniture, update_furniture and remove_furniture; colours with paint and set_floor.
Look at the result with screenshot (a 3D, plan or walk view, of a room if you like) and adjust: check overlaps reported for furniture, and keep about 70-90 cm free to walk past things.
Furniture faces south at rot_deg 0 (90 = west, 180 = north, 270 = east), or say facing. A piece with its back against the north wall (z = 0) facing south has its centre at z = depth / 2.
Every change shows at once in the user's tab and can be undone with undo. export_home saves the whole home as a file to share.
Ready-made models: search_library finds free Poly Haven models; place_library_model places one at its real size, or a 3D Warehouse model from a link the user gives you (3D Warehouse itself cannot be searched from here).`;
const TOOLS = [
  { name: 'get_home', description: `Read the home open in the planner: its rooms (outline and area), walls (along their middle, with ids, thickness and their doors and windows), fixed parts (columns, beams, kitchen, bathroom), placed furniture, paint and floors. In ${CM}. Call it first, and again after changes.`,
    inputSchema: { type: 'object', properties: {} }, annotations: { readOnlyHint: true } },
  { name: 'list_furniture', description: 'The furniture that can be placed: each preset with its name, category, default size in cm (width, depth, height) and its options (fronts, handles, colours, shapes and so on). Categories: Living, Dining, Sleeping, Work, Storage, Kitchen, Bathroom, On the wall, Parts of the house, Plants, Outside, Other.',
    inputSchema: { type: 'object', properties: { category: { type: 'string', description: 'only this category' } } }, annotations: { readOnlyHint: true } },
  { name: 'edit_house', description: `Change the house itself, in one go, with a list of operations (${CM}). Walls are kept along their middle: moving one takes its corners and the walls joined to it along, and rooms follow their walls. Operations ("op"):
- move_wall {wall, by_cm}: square to itself; + moves a wall that runs east-west to the south, one that runs north-south to the east
- set_wall {wall, length_cm?, keep?: from|middle|to, thickness_cm?, low_height_cm? (0 = full height), divider_only? (only divides two rooms, no wall)}
- add_wall {from_cm:[x,z], to_cm:[x,z], thickness_cm? (10), divider_only?}: ends snap to corners and walls within 5 cm; a space it closes off becomes a new room
- add_opening {wall, kind: door|double|glass|window|gap, width_cm?, from_start_cm? or centre_cm?:[x,z], sill_cm?, top_cm?, height_cm?, hinge?: start|end, opens_to?: north|south|east|west, front_door?}
- set_opening {id, ...the same fields}
- add_part {kind: column|beam|closet|radiator, box_cm:[x0,z0,x1,z1] or centre_cm + size_cm:[w,d], bottom_cm?, top_cm? (number or "ceiling"), below_ceiling_cm? (a beam's depth), label?}
- set_part {id, ...the same fields}
- add_room {at_cm:[x,z], name}: names a space between walls; name_room {room, name}
- delete {id}: a wall, door, window, part or room`,
    inputSchema: { type: 'object', properties: { operations: { type: 'array', items: { type: 'object', properties: { op: { type: 'string', enum: ['move_wall', 'set_wall', 'add_wall', 'add_opening', 'set_opening', 'add_part', 'set_part', 'add_room', 'name_room', 'delete'] } }, required: ['op'] } } }, required: ['operations'] } },
  { name: 'place_furniture', description: `Place furniture from the presets (see list_furniture). Per item: preset, centre_cm [x,z], facing (north|south|east|west) or rot_deg, size_cm [width, depth, height] (else the preset's), color "#rrggbb", options {key: value} from list_furniture, name, above_floor_cm (for things on a wall), on_furniture (rest on what is under it, as a lamp on a table). In ${CM}. Returns ids, and any overlap with walls or other pieces.`,
    inputSchema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { preset: { type: 'string' }, centre_cm: point, facing: { type: 'string', enum: ['north', 'south', 'east', 'west'] }, rot_deg: { type: 'number' }, size_cm: { type: 'array', items: { type: 'number' } }, color: { type: 'string' }, options: { type: 'object' }, name: { type: 'string' }, above_floor_cm: { type: 'number' }, on_furniture: { type: 'boolean' } }, required: ['preset', 'centre_cm'] } } }, required: ['items'] } },
  { name: 'search_library', description: 'Search the free Poly Haven model library (CC0, real size): furniture, seating, tables, shelves, lighting, decorative things, plants, appliances. Returns model ids to give place_library_model.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, category: { type: 'string', enum: ['furniture', 'seating', 'table', 'shelves', 'lighting', 'decorative', 'plants', 'appliances', 'electronics', 'containers', 'all'] } } }, annotations: { readOnlyHint: true } },
  { name: 'place_library_model', description: `Place a ready-made model at its real size: a Poly Haven model id from search_library, or the link of a 3D Warehouse model page (https://3dwarehouse.sketchup.com/model/…) that the user gave you. Optional centre_cm [x,z], facing or rot_deg, size_cm [width, depth, height] to change its size, name. In ${CM}. Afterwards it is moved like any placed piece (update_furniture).`,
    inputSchema: { type: 'object', properties: { link: { type: 'string' }, centre_cm: point, facing: { type: 'string', enum: ['north', 'south', 'east', 'west'] }, rot_deg: { type: 'number' }, size_cm: { type: 'array', items: { type: 'number' } }, name: { type: 'string' } }, required: ['link'] } },
  { name: 'update_furniture', description: 'Move, turn, resize, recolour or change options of placed pieces: per item its id and any of the place_furniture fields.',
    inputSchema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, centre_cm: point, facing: { type: 'string', enum: ['north', 'south', 'east', 'west'] }, rot_deg: { type: 'number' }, size_cm: { type: 'array', items: { type: 'number' } }, color: { type: 'string' }, options: { type: 'object' }, name: { type: 'string' }, above_floor_cm: { type: 'number' }, on_furniture: { type: 'boolean' } }, required: ['id'] } } }, required: ['items'] } },
  { name: 'remove_furniture', description: 'Remove placed pieces by id.',
    inputSchema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } }, required: ['ids'] }, annotations: { destructiveHint: true } },
  { name: 'paint', description: 'Paint a surface: target walls (all walls of a room), wall (one wall id, the face in that room), ceiling (of a room), door or frame (of a door or window id), or part (a column, beam, cupboard or radiator id). color "#rrggbb", or null to go back to the original.',
    inputSchema: { type: 'object', properties: { target: { type: 'string', enum: ['walls', 'wall', 'ceiling', 'door', 'frame', 'part'] }, room: { type: 'string', description: 'room id or name' }, wall: { type: 'string' }, opening: { type: 'string' }, part: { type: 'string' }, color: { type: ['string', 'null'] } }, required: ['target', 'color'] } },
  { name: 'set_floor', description: 'Lay a floor in a room ("all" for every room, "base" for the rest of the house): a design with optional colours (main, then grain or grout), plank or tile size in cm and direction in degrees; or original: true for the house\'s own floor.',
    inputSchema: { type: 'object', properties: { room: { type: 'string' }, design: { type: 'string', enum: ['oak', 'lightoak', 'greyoak', 'walnut', 'smoked', 'herring', 'chevron', 'tile60', 'tile30', 'tilelong', 'checker', 'hex', 'mosaic', 'cement', 'marble', 'terrazzo', 'concrete', 'carpet', 'paversHerring', 'paversBond', 'klinkers', 'stoep', 'asphalt', 'grass', 'planting', 'sand', 'water', 'paint'] }, colors: { type: 'array', items: { type: 'string' } }, size_cm: { type: 'number' }, direction_deg: { type: 'number' }, original: { type: 'boolean' } }, required: ['room'] } },
  { name: 'set_view', description: 'Change what the user sees: mode 3d, plan or walk; a room to look at (or stand in, when walking); walls up, cutaway or low (3D); ceilings on or off (3D); or a camera from_cm [x,y,z] and look_at_cm [x,y,z].',
    inputSchema: { type: 'object', properties: { mode: { type: 'string', enum: ['3d', 'plan', 'walk'] }, room: { type: 'string' }, walls: { type: 'string', enum: ['up', 'cutaway', 'low'] }, ceilings: { type: 'boolean' }, camera: { type: 'object', properties: { from_cm: { type: 'array', items: { type: 'number' } }, look_at_cm: { type: 'array', items: { type: 'number' } } } } } } },
  { name: 'screenshot', description: 'A picture of the planner, to see the design: optionally first set the view as in set_view. Plan view is best for layout, walk view for how a room feels.',
    inputSchema: { type: 'object', properties: { mode: { type: 'string', enum: ['3d', 'plan', 'walk'] }, room: { type: 'string' }, walls: { type: 'string', enum: ['up', 'cutaway', 'low'] }, ceilings: { type: 'boolean' }, camera: { type: 'object' }, width: { type: 'number', description: 'pixels, 320-1600 (1200)' } } }, annotations: { readOnlyHint: true } },
  { name: 'houses', description: 'The homes in the planner: action list, switch {id}, or new {name, width_cm, length_cm, ceiling_cm} (one room of that inside size, with a door and a window, to build on with edit_house).',
    inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['list', 'switch', 'new'] }, id: { type: 'string' }, name: { type: 'string' }, width_cm: { type: 'number' }, length_cm: { type: 'number' }, ceiling_cm: { type: 'number' } }, required: ['action'] } },
  { name: 'undo', description: 'Undo the last change made with these tools.', inputSchema: { type: 'object', properties: {} } },
  { name: 'export_home', description: 'Save the open home (house, furniture, paint, floors) as one .json file that anyone can open in the planner with File → Open. Default: the Downloads folder.',
    inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'file to write (optional)' } } } },
  { name: 'open_home_file', description: 'Open a home, house or layout .json file from this computer in the planner (as exported with File → Export this home).',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
];
const PAGE_TOOLS = new Set(['get_home', 'list_furniture', 'edit_house', 'place_furniture', 'update_furniture', 'remove_furniture', 'paint', 'set_floor', 'set_view', 'houses', 'undo', 'search_library', 'place_library_model']);
const text = (t) => ({ content: [{ type: 'text', text: typeof t === 'string' ? t : JSON.stringify(t) }] });
const expand = (p) => path.resolve(String(p || '').replace(/^~(?=$|[\\/])/, os.homedir()));
async function callTool(name, args) {
  try {
    if (name === 'screenshot') {
      const r = await callPage('screenshot', args), m = /^data:([^;]+);base64,(.*)$/.exec(r.image || '');
      if (!m) throw new Error('the planner gave no picture');
      return { content: [{ type: 'image', data: m[2], mimeType: m[1] }, { type: 'text', text: r.note || '' }] };
    }
    if (name === 'export_home') {
      const r = await callPage('export_home', {});
      const file = args.path ? expand(args.path) : path.join(os.homedir(), 'Downloads', `${r.id}-home-${new Date().toISOString().slice(0, 10)}.json`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, r.text);
      return text(`Saved to ${file}. Anyone can open it in the planner with File → Open a home or layout.`);
    }
    if (name === 'open_home_file') {
      const file = expand(args.path);
      if (!/\.json$/i.test(file)) throw new Error('choose a .json file exported from the planner');
      if (!fs.existsSync(file)) throw new Error(`there is no file at ${file}`);
      return text(await callPage('open_home', { text: fs.readFileSync(file, 'utf8'), name: path.basename(file) }));
    }
    if (!PAGE_TOOLS.has(name)) throw new Error(`unknown tool ${name}`);
    return text(await callPage(name, args, name === 'place_library_model' ? 150000 : 60000));
  } catch (err) {
    return { content: [{ type: 'text', text: err.message }], isError: true };
  }
}

/* ---------- the Model Context Protocol, over stdin and stdout ---------- */
const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n');
const VERSIONS = ['2024-11-05', '2025-03-26', '2025-06-18', '2025-11-25'];
async function handle(msg) {
  const { id, method, params = {} } = msg || {};
  if (id === undefined || id === null) return; // a notification
  const reply = (result) => send({ jsonrpc: '2.0', id, result });
  try {
    if (method === 'initialize') return reply({ protocolVersion: VERSIONS.includes(params.protocolVersion) ? params.protocolVersion : '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'home-planner-3d', title: 'Home planner 3D', version: VERSION }, instructions: INSTRUCTIONS });
    if (method === 'ping') return reply({});
    if (method === 'tools/list') return reply({ tools: TOOLS });
    if (method === 'tools/call') return reply(await callTool(params.name, params.arguments || {}));
    if (method === 'resources/list') return reply({ resources: [] });
    if (method === 'prompts/list') return reply({ prompts: [] });
    send({ jsonrpc: '2.0', id, error: { code: -32601, message: `unknown method ${method}` } });
  } catch (err) {
    send({ jsonrpc: '2.0', id, error: { code: -32603, message: err.message } });
  }
}
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  for (let i = buf.indexOf('\n'); i >= 0; i = buf.indexOf('\n')) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch (e) { send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }); continue; }
    for (const m of Array.isArray(msg) ? msg : [msg]) handle(m);
  }
});
process.stdin.on('end', () => process.exit(0));
start().catch((err) => { log(err.message); process.exit(1); });
