"""Pack the connector as a Claude Desktop extension: mcp/home-planner-3d.mcpb (a zip of manifest.json, icon.png and server/index.js).

Run from anywhere: python3 mcp/pack.py
"""
import json
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "home-planner-3d.mcpb"
manifest = json.loads((HERE / "manifest.json").read_text())
package = json.loads((HERE.parent / "package.json").read_text())
assert manifest["version"] == package["version"], "manifest.json and package.json versions differ"
assert f"const VERSION = '{manifest['version']}';" in (HERE / "server.js").read_text(), "server.js version differs"

files = {"manifest.json": HERE / "manifest.json", "icon.png": HERE / "icon.png", "server/index.js": HERE / "server.js"}
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
    for name, src in files.items():
        info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))  # fixed dates, so the same files give the same .mcpb
        info.external_attr = 0o644 << 16
        info.compress_type = zipfile.ZIP_DEFLATED
        z.writestr(info, src.read_bytes())
print("packed", OUT.name, OUT.stat().st_size, "bytes")
