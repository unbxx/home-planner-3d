"""Build index.html from src/planner.src.html, src/tokens.json and the houses in houses/ (the first file is the house it opens with).

Run with any Python 3:  python3 build.py
"""
import json
from pathlib import Path

HERE = Path(__file__).parent


def tokens_css(tokens):
    lines = [":root {"]
    for t in tokens["color"]["tokens"]:
        v = t["value"]
        lines.append(f"  --{t['name']}: {v if isinstance(v, str) else v['light']};")
    for k, v in tokens["type"]["families"].items():
        lines.append(f"  --font-{k}: {v};")
    for fam in ("spacing", "radius", "shadow", "dimension"):
        for t in tokens.get(fam, {}).get("tokens", []):
            lines.append(f"  --{t['name']}: {t['value']};")
    lines.append("}")
    return "\n".join(lines)


def main():
    src = (HERE / "src/planner.src.html").read_text()
    tokens = json.loads((HERE / "src/tokens.json").read_text())
    houses = {}
    for f in sorted((HERE / "houses").glob("*.json")):
        h = json.loads(f.read_text())
        houses[h["id"]] = h
    out = (src.replace("/*@TOKENS@*/", tokens_css(tokens))
              .replace("__HOUSES__", json.dumps(houses, separators=(",", ":")))
              .replace("__ART__", "{}")       # pictures for framed prints: none in this build
              .replace("__FINISHES__", "{}"))  # stone finishes: none in this build
    (HERE / "index.html").write_text(out)
    print("index.html", len(out.encode()), "bytes,", len(houses), "house(s)")


main()
