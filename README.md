# Home planner 3D

Your home in 3D at real size: build it from its floor plan or wall by wall, place furniture, import your own 3D models, paint the walls, lay the floors and walk through it before you buy or move anything.

**Open it:** https://unbxx.github.io/home-planner-3d/

It runs in the browser; there is nothing to install. It needs an internet connection the first time, to load the 3D engine ([three.js](https://threejs.org) from jsDelivr).

## Getting started

1. Open the link. It starts in a sample room.
2. Click the house name at the top left and choose **Draw a house from its floor plan** (see below), or **New house from its size** for a single room: give it a name, a width, a length and a ceiling height, and you get one room with a door and a window. Then **Edit house** (see below) to move its walls, add rooms, doors and windows from your own measurements.
3. Pick furniture from the list on the left, move it over the floor and click to place it. Every piece has its width, depth and height in centimetres; change them to match what you have or want to buy.
4. Look around with **3D**, **Plan** (from above, like a drawing) and **Walk** (at eye height).

Everything you do is saved in your own browser, per house. Nothing is uploaded anywhere.

## What it can do

- **Views**: orbit the whole home, look straight down, or walk through it (W A S D or arrow keys, drag to look, double-click the floor to go there). Doors open and close (double-click, or E while walking).
- **Edit house**: change walls, doors, windows, columns, beams and rooms right in the 3D, plan and walk views.
- **Floors**: a floor per room, from nineteen designs or a photo of your own.
- **Kitchen and bathroom**: cabinets, appliances, sinks, washbasins, mirrors, showers, baths and toilets, each with its own fronts, handles and colours.
- **Furniture**: sofas, beds, tables, chairs, storage, rugs, plants, lamps, shelves, wall art and more. Small things rest on what they are put on (a worktop, a shelf, a sofa seat), and *On a shelf of …* puts them on a chosen shelf of a bookcase or rack.
- **Your own models**: *Import 3D model* (GLB works best; GLTF, OBJ, STL and FBX too). You type the real size from the product page and the model is scaled to exactly that.
- **Checking the fit**: a red outline when a piece runs into a wall or another piece, the free space around the selected piece, and a measuring tool.
- **Paint**: any wall, the window reveals, frames, doors and radiators, with the wall area per colour to work out how much paint to buy.
- **Several houses**: switch between them from the house name at the top left; each keeps its own furniture and paint.
- **Room photos**: under *Rooms*, *+ Photos* keeps photos of each room next to it, to look back at while you furnish.

## Editing the house

**Edit house** in the toolbar (or B) changes the house itself, in the 3D, plan and walk views:

- **Select** (the default): click a wall, door, window, column, beam or floor. Then drag the selected part to move it: a wall moves square to itself and the walls joined to it follow, a door or window slides along its wall, and the blue dots move a corner or resize a door or window (in 3D also its top and sill). Arrows nudge 1 cm (Shift: 10 cm), Delete removes, Ctrl/⌘+Z undoes. Alt: no snapping.
- The panel shows the numbers: a wall's length and thickness, and the **free space to the next wall** on each side (type a new number and the wall moves there, which is the quickest way to copy a room you measured with a tape); a door's or window's width, height, sill and its distance to the nearest wall on each side; a column's or beam's size and height. *Split in two* bends a wall, *Add a room outside* builds a new room against an outside wall.
- **Walls**: click on the floor at each corner of a new wall; it snaps to corners and walls and ends when it reaches one. Type a length in cm and press Enter for an exact wall. A space that new walls close off becomes a room.
- **Add**: a door, double door, glass door, window or opening (click a wall), or a column, beam, built-in cupboard or radiator (click the floor).
- Rooms follow their walls and keep their names, photos and floors. Click a floor to rename a room or choose its floor.

A house that came as a file (like the sample room) is turned into a drawing the first time you change it. *Open the 2D drawing* shows the same drawing flat, over the floor plan picture if it has one.

## Floors

Each room has its own floor: **Floor: …** under the room in *Rooms*, **Floor…** when editing a room, or click a floor with *Paint*. Pick one of nineteen designs (oak, light oak, grey oak, walnut, wide smoked oak, herringbone, chevron, large, square and long tiles, checkerboard, hexagons, mosaic, cement tiles, marble, terrazzo, concrete, carpet, a plain colour) and set its plank or tile size, direction and colours; ‹ › go through them. **Use a picture of a floor** takes a photo of your own tiles, wood or rug: repeat it at the size one copy covers, or stretch it once over the room. The panel tells you how many m² to buy.

## Desks

Under *Work*: a gaming desk with a monitor shelf and LED light (180 × 67 × 92 cm, with a drawer and door cabinet, side shelves and a computer bay; a monitor put on it lands on the shelf, a keyboard on the desktop) and an electric standing desk with a wood top (160 × 80 cm; *Height* switches between sitting at 74 cm and standing at 110 cm).

Under *Storage* there is also a laundry sorter (84 × 30 × 96 cm, three bags under two drawers, on wheels).

## Kitchens, bathrooms and parts of the house

Under *Kitchen*, *Bathroom* and *Parts of the house* in the furniture list: base, wall and tall cabinets, an island, worktop, fridges (fridge-freezer, tall, under-counter, American), oven, cooker, hob, sink, dishwasher, washing machine, microwave, cooker hood, bar stool; washbasins on a cabinet (on the wall or standing) or a pedestal, mirrors (rectangle, rounded corners, round, oval, arched, round ends; with a frame and a glow if you like), a mirror cabinet, toilet, shower, bath, towel radiator; radiators, sockets and switches, ceiling lamps, stairs and curtains. Select one for its options: fronts (doors, drawers, flaps, glass, open), handles (bar, long bar, knob, cup, edge profile, handleless, none) and their colour, a sink or hob in the worktop, and so on. Every piece takes any size and colour.

## Drawing a house from its floor plan

From the house menu, **Draw a house from its floor plan** opens a drawing screen over a picture of the plan, in six steps:

1. **Floor plan**: choose or drop a picture of the plan: a scan, a screenshot, or the image from the listing (for a PDF, take a screenshot of the page). No plan? *Draw on a 1 m grid* and type the lengths you measured.
2. **Scale**: click both ends of one length written on the plan, such as a wall of 4.20 m, and type it in cm. Pick the longest one you can; everything else is measured from it. **No sizes on the plan?** Click something that has a standard size (an inside door is about 83 cm, a bed 200 cm long) and pick it from the list; if the listing gives the floor area, *Fit to the floor area* in the last step scales the drawing until the rooms add up to it.
3. **Walls**: click the corners along the middle of each wall, outside walls first; click the first corner again to close them. Clicks snap to corners, keep walls square and line up with other corners, and a wall that reaches another wall ends there. Type a length and press Enter for an exact wall. Give each wall its thickness (outside walls are often 25–35 cm, inside walls 7–12 cm). Red dots mark wall ends that meet nothing; the floor turns blue once the outside walls are closed.
4. **Doors and windows**: pick door, double door, glass door, window or an opening without a door, then click a wall (usual width) or drag along the wall over the gap in the drawing (exact width). Set the hinge side, which way it opens and the window heights in the panel.
5. **Rooms and photos**: click inside each room to fill it and name it; its area is shown and bathrooms get a tiled floor. Add photos of each room for reference. To split an open space into two rooms, draw a line in Walls and tick *Only divides two rooms*.
6. **Build**: set the name and the ceiling, door and window heights, then *Build the house*.

The plan picture becomes the house's floor plan overlay (Settings → Floor plan overlay), so you can check the model against the drawing. *Edit this house's drawing* in the house menu reopens it; *Update the house* keeps the furniture you placed. Everything stays in your own browser; nothing is uploaded.

## Sharing

- *File → Export* saves your furniture layout, paint and floors (with any imported models and floor pictures) as one `.json` file; a friend opens it with *File → Open*.
- From the house menu, *Export this house* saves the house itself (walls, rooms, kitchen…) as a `.json` file; a drawn house takes its floor plan picture and room photos along. *Import a house* adds one. Importing a house with the same `id` as one you have replaces it and keeps the furniture placed in it.

## Adding a real house by hand

The builder above is the easy way. *New house from its size* makes a single room. A whole apartment is a house file: JSON in metres, with x running east and z running south from the inside north-west corner. `houses/sample-room.json` is a complete small example.

| Key | What it holds |
| --- | --- |
| `id`, `name`, `sub` | Identity and the line under the name |
| `ceiling`, `doorH`, `sill`, `winTop` | Heights in metres |
| `walls` | Boxes `x0 x1 z0 z1`; `ext` points to the outside for outer walls; `open` lists doors and windows along the wall (`a`–`b`, `t: "door"`, `"window"` or `"gap"` for an opening without a door, `swing`, `hinge`, own `y0`/`y1` for a window); `h` makes a low wall; `split` cuts a wall where the room behind it changes |
| `floors` | Polygons with a material: `oak`, `greyoak`, `tile`, `concrete`, `mosaic`. The one with `id: "base"` is the whole floor |
| `rooms` | Polygons with a `name`, a `label` spot, a `walk` start (`p`, `look`) and named parts such as a kitchen (`zones`) |
| `fixtures` | Fixed parts: `base`, `worktop`, `wallcab`, `tall`, `hood`, `hob`, `oven`, `sink`, `tap`, `splash`, `radiator`, `beam`, `column`, `toilet`, `ledge`, `basin`, `glass`, `box`… with `color`, `mirror` or `turn` to face any wall |

A drawn or edited house also keeps its drawing (`draft`) and its plan picture (`plan`), so it can be edited again. Kitchens and bathrooms are easiest as furniture (see above); fixed parts in the file (`fixtures`) can also be added by hand.

## Working on it

The app is one HTML file. Edit `src/planner.src.html`, then run

```sh
python3 build.py
```

which writes `index.html` with the houses from `houses/` (the first file is the one it opens with) and the colours from `src/tokens.json`. The site at the link above is `index.html` on the `main` branch.
