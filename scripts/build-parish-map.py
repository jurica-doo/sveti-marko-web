"""
Builds `lib/parish-map-data.ts` — the street geometry behind the parish map on
the About page — from two OpenStreetMap Overpass exports:

  streets.json  the parish's own streets (highway ways by name)
  ctx.json      every road / rail / church in the surrounding box

    python3 -I scripts/build-parish-map.py <streets.json> <ctx.json>

The output is plain SVG path strings in a fixed 1000-wide viewBox, so the map
ships with no tiles, no map library and no third-party request.

Several streets belong to the parish only in part (a range of house numbers).
OSM has no house numbers along most of them, so those ranges are approximated
by the `WINDOWS` below — lon/lat boxes worked out from the address points OSM
does have. Adjust a box and re-run to move a cut-off.
"""

import json
import math
import sys

# Map frame (lon/lat).
W_LON, E_LON = 16.4660, 16.4950
S_LAT, N_LAT = 43.5168, 43.5292
LAT0 = math.radians((S_LAT + N_LAT) / 2)
VIEW_W = 1000
SCALE = VIEW_W / ((E_LON - W_LON) * math.cos(LAT0))
VIEW_H = round((N_LAT - S_LAT) * SCALE)


def project(lat, lon):
    x = (lon - W_LON) * math.cos(LAT0) * SCALE
    y = (N_LAT - lat) * SCALE
    return (x, y)


# Which part of each street is in the parish. None = the whole street.
# Box: (min_lat, max_lat, min_lon, max_lon).
WINDOWS = {
    "Hercegovačka ulica": (0, 90, 16.4722, 90),       # 125+ / 128+
    "Kupreška ulica": None,
    "Ljubuška ulica": None,
    "Magistrala-Solin": None,                           # 3–67, OSM's extent
    "Mostarska ulica": (0, 90, 16.4762, 90),           # 101+ / 72+
    "Neslanovac": None,
    "Put Mostina": (43.5250, 43.5268, 16.4815, 16.4862),  # 14, 18, 20
    "Put Smokovika": None,
    "Sarajevska ulica": (0, 43.5240, 0, 90),            # even up to 46
    "Solinska ulica": (43.5262, 43.5280, 16.4808, 16.4835),  # 76 only
    # D433 — the stretch beside the church, Sarajevska junction to Mostarska.
    "Zagorski put": (43.5188, 43.5226, 16.4752, 16.4816),  # 4–22
}

LABELS = {
    "Hercegovačka ulica": "Hercegovačka",
    "Kupreška ulica": "Kupreška",
    "Ljubuška ulica": "Ljubuška",
    "Magistrala-Solin": "Magistrala Solin",
    "Mostarska ulica": "Mostarska",
    "Neslanovac": "Neslanovac",
    "Put Mostina": "Put Mostina",
    "Put Smokovika": "Put Smokovika",
    "Sarajevska ulica": "Sarajevska",
    "Solinska ulica": "Solinska",
    "Zagorski put": "Zagorski put",
}

MAJOR = {"motorway", "trunk", "primary", "secondary", "motorway_link", "trunk_link",
         "primary_link", "secondary_link"}
MID = {"tertiary", "tertiary_link"}


def inside(lat, lon, box):
    if box is None:
        return True
    return box[0] <= lat <= box[1] and box[2] <= lon <= box[3]


def runs(geometry, box):
    """Consecutive stretches of a way that lie inside `box`."""
    out, cur = [], []
    for p in geometry:
        if inside(p["lat"], p["lon"], box):
            cur.append(project(p["lat"], p["lon"]))
        elif cur:
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return [r for r in out if len(r) >= 2]


def rdp(points, eps):
    if len(points) < 3:
        return points
    (x1, y1), (x2, y2) = points[0], points[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = math.hypot(dx, dy) or 1e-9
    idx, dmax = 0, 0.0
    for i in range(1, len(points) - 1):
        px, py = points[i]
        d = abs(dy * px - dx * py + x2 * y1 - y2 * x1) / norm
        if d > dmax:
            idx, dmax = i, d
    if dmax > eps:
        return rdp(points[: idx + 1], eps)[:-1] + rdp(points[idx:], eps)
    return [points[0], points[-1]]


def path(points):
    return "M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in points)


def in_frame(pts):
    return any(-20 <= x <= VIEW_W + 20 and -20 <= y <= VIEW_H + 20 for x, y in pts)


def convex_hull(points):
    pts = sorted(set(points))
    if len(pts) < 3:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def buffer_hull(hull, pad):
    """Push each hull vertex outward from the centroid, then round the corners."""
    cx = sum(p[0] for p in hull) / len(hull)
    cy = sum(p[1] for p in hull) / len(hull)
    grown = []
    for x, y in hull:
        d = math.hypot(x - cx, y - cy) or 1
        grown.append((x + (x - cx) / d * pad, y + (y - cy) / d * pad))
    # Chaikin smoothing, closed.
    for _ in range(4):
        nxt = []
        for i in range(len(grown)):
            (x0, y0), (x1, y1) = grown[i], grown[(i + 1) % len(grown)]
            nxt.append((0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1))
            nxt.append((0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1))
        grown = nxt
    return path(grown) + "Z"


def main(streets_file, ctx_file):
    streets = json.load(open(streets_file, encoding="utf-8"))["elements"]
    ctx = json.load(open(ctx_file, encoding="utf-8"))["elements"]

    parish = {}
    for way in streets:
        name = way["tags"].get("name")
        if name not in WINDOWS:
            continue
        for r in runs(way["geometry"], WINDOWS[name]):
            parish.setdefault(name, []).append(rdp(r, 0.6))

    roads = {"major": [], "mid": [], "minor": []}
    rail = []
    for way in ctx:
        tags = way.get("tags", {})
        geom = way.get("geometry")
        if not geom:
            continue
        pts = rdp([project(p["lat"], p["lon"]) for p in geom], 0.8)
        if len(pts) < 2 or not in_frame(pts):
            continue
        if tags.get("railway") == "rail":
            rail.append(path(pts))
        elif "highway" in tags:
            hw = tags["highway"]
            tier = "major" if hw in MAJOR else "mid" if hw in MID else "minor"
            if hw == "service" and tags.get("service") in {"parking_aisle", "driveway"}:
                continue
            roads[tier].append(path(pts))

    church = next(
        w for w in ctx
        if w.get("tags", {}).get("name", "").lower() == "crkva svetog marka"
    )
    b = church["bounds"]
    cx, cy = project((b["minlat"] + b["maxlat"]) / 2, (b["minlon"] + b["maxlon"]) / 2)

    all_pts = [p for runs_ in parish.values() for r in runs_ for p in r]
    boundary = buffer_hull(convex_hull(all_pts), 34)

    # A label anchor per street: the midpoint of its longest stretch.
    streets_out = []
    for name in WINDOWS:
        if name not in parish:
            print(f"warning: no geometry for {name}", file=sys.stderr)
            continue
        longest = max(parish[name], key=len)
        mx, my = longest[len(longest) // 2]
        streets_out.append({
            "name": LABELS[name],
            "d": [path(r) for r in parish[name]],
            "anchor": [round(mx, 1), round(my, 1)],
        })

    data = {
        "viewBox": [VIEW_W, VIEW_H],
        "boundary": boundary,
        "church": [round(cx, 1), round(cy, 1)],
        "streets": streets_out,
        "roads": roads,
        "rail": rail,
    }

    header = (
        "/*\n"
        " * Generated by scripts/build-parish-map.py from OpenStreetMap data\n"
        " * (© OpenStreetMap contributors, ODbL). Do not edit by hand.\n"
        " */\n\n"
        "export type ParishMapData = {\n"
        "  viewBox: [number, number];\n"
        "  boundary: string;\n"
        "  church: [number, number];\n"
        "  streets: { name: string; d: string[]; anchor: [number, number] }[];\n"
        "  roads: { major: string[]; mid: string[]; minor: string[] };\n"
        "  rail: string[];\n"
        "};\n\n"
    )
    out = header + "export const PARISH_MAP: ParishMapData = " + json.dumps(
        data, ensure_ascii=False, separators=(",", ":")
    ) + ";\n"
    open("lib/parish-map-data.ts", "w", encoding="utf-8").write(out)
    print(f"wrote lib/parish-map-data.ts ({len(out) // 1024} KB), viewBox 1000x{VIEW_H}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
