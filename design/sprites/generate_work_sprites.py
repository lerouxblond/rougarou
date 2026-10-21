"""Générateur de sprites 32x32 (pixel art ombré, contour automatique, 4 images).
Sortie : sprites.json  {name: {"frames": [svg_inner_str x4], "w":32}}"""
import json, math, sys

W = H = 32

def blank():
    return [[None] * W for _ in range(H)]

def put(g, x, y, c):
    if 0 <= x < W and 0 <= y < H and c is not None:
        g[y][x] = c

def shade_pick(u, v, base, light, dark, dither=True, x=0, y=0):
    d = u * 0.8 + v  # lumière en haut à gauche
    if d < -0.75:
        return light
    if d < -0.5 and dither and (x + y) % 2 == 0:
        return light
    if d > 0.75:
        return dark
    if d > 0.5 and dither and (x + y) % 2 == 0:
        return dark
    return base

def ellipse(g, cx, cy, rx, ry, base, light=None, dark=None):
    light = light or base; dark = dark or base
    for y in range(H):
        for x in range(W):
            u = (x + 0.5 - cx) / rx; v = (y + 0.5 - cy) / ry
            if u * u + v * v <= 1.0:
                put(g, x, y, shade_pick(u, v, base, light, dark, x=x, y=y))

def inside(px, py, poly):
    n = len(poly); ins = False; j = n - 1
    for i in range(n):
        xi, yi = poly[i]; xj, yj = poly[j]
        if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi + 1e-9) + xi):
            ins = not ins
        j = i
    return ins

def polygon(g, pts, base, light=None, dark=None):
    light = light or base; dark = dark or base
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    cx = (min(xs) + max(xs)) / 2; cy = (min(ys) + max(ys)) / 2
    rx = max(1, (max(xs) - min(xs)) / 2); ry = max(1, (max(ys) - min(ys)) / 2)
    for y in range(H):
        for x in range(W):
            if inside(x + 0.5, y + 0.5, pts):
                put(g, x, y, shade_pick((x + .5 - cx) / rx, (y + .5 - cy) / ry, base, light, dark, x=x, y=y))

def rect(g, x0, y0, w, h, c):
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            put(g, x, y, c)

def outline(g, col):
    out = [row[:] for row in g]
    for y in range(H):
        for x in range(W):
            if g[y][x] is None:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and g[ny][nx] is not None:
                        out[y][x] = col; break
    return out

def compose(bg, fg, k):
    """bg : calque sans contour (lune, halo) ; fg : personnage avec contour auto."""
    o = outline(fg, k)
    res = [row[:] for row in bg]
    for y in range(H):
        for x in range(W):
            if o[y][x] is not None:
                res[y][x] = o[y][x]
    return res

def to_svg(g):
    parts = []
    for y in range(H):
        x = 0
        while x < W:
            c = g[y][x]
            if c is None:
                x += 1; continue
            x2 = x
            while x2 + 1 < W and g[y][x2 + 1] == c:
                x2 += 1
            parts.append('<rect x="%d" y="%d" width="%d" height="1" fill="%s"></rect>' % (x, y, x2 - x + 1, c))
            x = x2 + 1
    return ''.join(parts)

K = '#0D0B12'

# ---------------- Voyante ----------------
def seer(f):
    bg = blank(); g = blank()
    # halo / étincelles autour de la boule (fond)
    sparks = [[(6, 20), (26, 18), (9, 27)], [(7, 18), (25, 22), (23, 28)], [(5, 23), (27, 20), (8, 29)], [(6, 17), (26, 25), (24, 27)]][f]
    for (x, y) in sparks:
        put(bg, x, y, '#E9DCFF')
    # robe
    polygon(g, [(8, 19), (24, 19), (29, 32), (3, 32)], '#4B3577', '#6A4FA3', '#2F2150')
    # capuche
    ellipse(g, 16, 11, 9, 10, '#4B3577', '#6A4FA3', '#2F2150')
    # visage dans l'ombre
    ellipse(g, 16, 13, 5, 6, '#B08A78', '#C9A491', '#7E5E52')
    rect(g, 11, 7, 10, 3, '#2F2150')  # ombre du bord de capuche
    if f != 2:
        put(g, 14, 13, '#FFFFFF'); put(g, 18, 13, '#FFFFFF')
        put(g, 14, 14, '#1B1430'); put(g, 18, 14, '#1B1430')
    else:
        rect(g, 13, 14, 2, 1, '#5C4038'); rect(g, 17, 14, 2, 1, '#5C4038')
    rect(g, 15, 17, 3, 1, '#7E5E52')
    # mains
    ellipse(g, 9, 25, 2, 2, '#C9A491'); ellipse(g, 23, 25, 2, 2, '#C9A491')
    # boule de cristal
    ellipse(g, 16, 24, 6, 6, '#3A64B0', '#7FA8F0', '#1F3A73')
    ang = f * math.pi / 2
    for i in range(3):
        a = ang + i * 0.55
        put(g, int(16 + math.cos(a) * 3.2), int(24 + math.sin(a) * 3.2), '#CFE0FF')
    put(g, 13, 21, '#FFFFFF'); put(g, 14, 21, '#FFFFFF'); put(g, 13, 22, '#FFFFFF')
    # socle
    rect(g, 11, 30, 10, 2, '#8A5A22'); rect(g, 12, 29, 8, 1, '#B07A35')
    return compose(bg, g, K)

# ---------------- Loup-garou ----------------
def wolf(f):
    bg = blank(); g = blank()
    for (x, y) in [(2, 2), (29, 1), (30, 9), (1, 10)]:
        put(bg, x, y, '#E8DFC0' if (x + f) % 2 else '#8B93A6')
    # poitrail
    polygon(g, [(7, 24), (25, 24), (30, 32), (2, 32)], '#4E5666', '#6E7A8C', '#323844')
    # oreilles
    tw = 1 if f == 1 else 0
    polygon(g, [(5, 3 + tw), (12, 11), (5, 13)], '#5E6878', '#7E8A9C', '#3C4350')
    polygon(g, [(26, 3), (19, 11), (26, 13)], '#5E6878', '#7E8A9C', '#3C4350')
    polygon(g, [(7, 7 + tw), (10, 11), (7, 11)], '#B98A8A')
    polygon(g, [(24, 7), (21, 11), (24, 11)], '#B98A8A')
    # tête
    ellipse(g, 16, 16, 10, 8, '#5E6878', '#7E8A9C', '#3C4350')
    # museau
    ellipse(g, 16, 21, 6, 4, '#9AA4B4', '#BCC4D0', '#6E7A8C')
    rect(g, 14, 18, 4, 2, '#151018')
    put(g, 15, 18, '#5A5060')
    # yeux
    if f == 2:
        rect(g, 10, 15, 3, 1, '#151018'); rect(g, 19, 15, 3, 1, '#151018')
    else:
        rect(g, 10, 14, 3, 2, '#F2C14E'); rect(g, 19, 14, 3, 2, '#F2C14E')
        put(g, 11, 15, '#151018'); put(g, 20, 15, '#151018')
        put(g, 10, 14, '#FFF1B8'); put(g, 19, 14, '#FFF1B8')
    # gueule + crocs
    jaw = 1 if f == 3 else 0
    rect(g, 13, 23 + jaw, 6, 1, '#151018')
    put(g, 13, 24 + jaw, '#FFFAF0'); put(g, 18, 24 + jaw, '#FFFAF0')
    # touffes de joues
    polygon(g, [(6, 17), (9, 20), (5, 21)], '#4E5666')
    polygon(g, [(26, 17), (23, 20), (27, 21)], '#4E5666')
    return compose(bg, g, K)

# ---------------- Sorcière ----------------
def witch(f):
    bg = blank(); g = blank()
    # cheveux
    ellipse(g, 16, 16, 8, 6, '#5B2C6F', '#7D3F97', '#3E1D4C')
    # visage
    ellipse(g, 16, 15, 5, 5, '#E0B9A0', '#F2D3BE', '#B88E78')
    put(g, 14, 15, '#2A1420'); put(g, 18, 15, '#2A1420')
    if f == 2:
        put(g, 14, 15, '#B88E78'); put(g, 18, 15, '#B88E78'); rect(g, 13, 15, 2, 1, '#2A1420'); rect(g, 17, 15, 2, 1, '#2A1420')
    rect(g, 15, 18, 3, 1, '#9E3A4C')
    # chapeau
    tip = [(19, 0), (20, 1), (21, 1), (20, 0)][f]
    polygon(g, [tip, (9, 11), (23, 11)], '#2B2440', '#463A66', '#1A1528')
    ellipse(g, 16, 11, 12, 2, '#2B2440', '#463A66', '#1A1528')
    rect(g, 11, 9, 10, 1, '#D77BB6')
    # chaudron
    ellipse(g, 16, 27, 10, 5, '#3A3A46', '#5A5A6A', '#22222C')
    rect(g, 5, 22, 22, 2, '#4A4A58')
    ellipse(g, 16, 22, 9, 2, '#5FC48A', '#9EF0BE', '#2F8A58')
    # bulles qui montent
    by = [21, 20, 19, 20][f]
    put(g, 12, by, '#9EF0BE'); put(g, 20, [20, 21, 19, 20][f], '#9EF0BE')
    if f in (1, 3):
        put(g, 16, by - 1, '#CFFFE0')
    return compose(bg, g, K)

# ---------------- Villageois ----------------
def villager(f):
    bg = blank(); g = blank()
    glow = [6, 7, 6, 5][f]
    for y in range(32):
        for x in range(32):
            d = ((x + .5 - 24) ** 2 + (y + .5 - 20) ** 2) ** .5
            if d <= glow and (d <= glow - 2 or (x + y) % 2 == 0):
                put(bg, x, y, '#2E2410' if d > glow - 3 else '#4A3814')
    # corps
    polygon(g, [(4, 20), (20, 20), (23, 32), (1, 32)], '#7A5230', '#9C6C40', '#553820')
    rect(g, 10, 21, 2, 9, '#C9A45C')
    # tête
    ellipse(g, 12, 12, 5, 6, '#E0B9A0', '#F2D3BE', '#B88E78')
    # bonnet
    ellipse(g, 12, 7, 6, 3, '#9E3A3A', '#C25050', '#6E2626')
    rect(g, 6, 8, 12, 1, '#6E2626')
    # visage
    if f != 2:
        put(g, 10, 12, '#2A1420'); put(g, 14, 12, '#2A1420')
    else:
        rect(g, 9, 12, 2, 1, '#2A1420'); rect(g, 13, 12, 2, 1, '#2A1420')
    rect(g, 11, 15, 3, 1, '#9E5A4C')
    rect(g, 9, 17, 6, 2, '#6B4A2E')  # barbe courte
    # bras
    polygon(g, [(17, 21), (22, 17), (24, 18), (19, 23)], '#7A5230', '#9C6C40', '#553820')
    # lanterne
    rect(g, 23, 13, 1, 3, '#2A2018')
    rect(g, 21, 16, 6, 1, '#2A2018')
    rect(g, 21, 17, 6, 6, '#F2C14E')
    rect(g, 21, 23, 6, 1, '#2A2018')
    rect(g, 21, 17, 1, 6, '#2A2018'); rect(g, 26, 17, 1, 6, '#2A2018')
    fl = [(23, 19, 2, 3), (23, 18, 2, 4), (24, 19, 1, 3), (23, 20, 2, 2)][f]
    rect(g, fl[0], fl[1], fl[2], fl[3], '#FFF4C8')
    return compose(bg, g, K)

# ---------------- Vampire ----------------
def vampire(f):
    bg = blank(); g = blank()
    bx = [3, 6, 9, 12][f]; by = [4, 3, 4, 3][f]
    for (dx, dy) in [(0, 0), (1, -1 if f % 2 else 0), (-1, -1 if f % 2 else 0), (2, 0), (-2, 0)]:
        put(bg, bx + dx, by + dy, '#6A5478')
    # cape
    polygon(g, [(2, 32), (6, 18), (26, 18), (30, 32)], '#7A1E3A', '#A8304F', '#4A1022')
    polygon(g, [(6, 18), (10, 9), (13, 20)], '#7A1E3A', '#A8304F', '#4A1022')
    polygon(g, [(26, 18), (22, 9), (19, 20)], '#7A1E3A', '#A8304F', '#4A1022')
    polygon(g, [(12, 20), (20, 20), (18, 32), (14, 32)], '#1A1420')
    rect(g, 15, 22, 2, 2, '#D9B24A')
    # tête
    ellipse(g, 16, 12, 6, 7, '#D9D2C2', '#F2ECE0', '#A8A090')
    # cheveux avec pointe
    ellipse(g, 16, 7, 7, 3, '#141018', '#2A2430', '#0A0810')
    polygon(g, [(14, 8), (18, 8), (16, 11)], '#141018')
    # yeux
    if f == 2:
        rect(g, 12, 12, 3, 1, '#4A2030'); rect(g, 17, 12, 3, 1, '#4A2030')
    else:
        rect(g, 12, 12, 3, 1, '#E86A71'); rect(g, 17, 12, 3, 1, '#E86A71')
        put(g, 13, 12, '#FFD0D4'); put(g, 18, 12, '#FFD0D4')
    rect(g, 14, 16, 4, 1, '#5A2030')
    put(g, 14, 17, '#FFFFFF'); put(g, 17, 17, '#FFFFFF')
    return compose(bg, g, K)

SPR = {'voyante': seer, 'loup': wolf, 'sorciere': witch, 'villageois': villager, 'vampire': vampire}
out = {k: [to_svg(fn(i)) for i in range(4)] for k, fn in SPR.items()}
json.dump(out, open(sys.argv[1], 'w'))
print({k: sum(s.count('<rect') for s in v) for k, v in out.items()})
