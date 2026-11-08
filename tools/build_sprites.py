#!/usr/bin/env python3
"""
Zerlegt die vier Charakter-Bilder (assets/src/char_*.jpg) in animierbare
Koerperteile (Rumpf, Oberschenkel, Unterschenkel, Unterarme, Schal/Umhang)
und schreibt pro Charakter ein Atlas-PNG + JSON nach public/assets/chars/.

Aufruf:  python3 tools/build_sprites.py [--preview DIR]

Koordinaten in CONFIG beziehen sich auf die Originalbilder (Pixel).
"""
import json, os, sys
from collections import deque
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'src')
OUT = os.path.join(ROOT, 'public', 'assets', 'chars')
SCALE = 0.2  # 1280px Figur -> ~256px

# Reihenfolge der Teile = Prioritaet bei der Pixelzuordnung.
# poly: Polygon (Original-Koordinaten), pivot: Gelenkpunkt,
# parent: Elternteil, ext: Unterfuetterung bis zu dieser y-Koordinate
# (wird unter dem Rumpf versteckt, verhindert Luecken beim Drehen),
# fill: Probe-Rechteck fuer die Fuellfarbe.
CONFIG = {
  'water': {
    'file': 'char_water.jpg', 'origin': (590, 1285),
    'keep': [],
    'parts': [
      ('armF',  dict(poly=[(445,515),(540,515),(535,555),(505,610),(480,660),(462,700),(450,735),(430,775),(345,775),(345,600),(395,565),(430,545)], pivot=(490,525))),
      ('armB',  dict(poly=[(748,515),(812,515),(905,590),(905,745),(812,745),(795,690),(788,640),(770,575),(748,545)], pivot=(776,525), ext=497, fill=(768,524,784,536))),
      ('shinF', dict(poly=[(320,1003),(616,1003),(616,1295),(320,1295)], pivot=(478,1006), parent='thighF', ext=965, fill=(455,1010,500,1025))),
      ('shinB', dict(poly=[(618,998),(860,998),(860,1295),(618,1295)], pivot=(712,1000), parent='thighB', ext=960, fill=(690,1003,735,1018))),
      ('thighF',dict(poly=[(330,885),(610,885),(616,1003),(330,1003)], pivot=(510,870), ext=835, fill=(470,905,540,935))),
      ('thighB',dict(poly=[(612,862),(860,862),(860,998),(618,998)], pivot=(690,852), ext=812, fill=(670,890,730,930))),
      ('tail',  dict(poly=[(100,355),(485,355),(470,400),(458,450),(448,515),(430,545),(395,565),(345,600),(345,665),(100,665)], pivot=(470,440))),
    ],
  },
  'earth': {
    'file': 'char_earth.jpg', 'origin': (580, 1283),
    'keep': [[(568,715),(694,715),(694,900),(655,952),(600,952),(560,905)]],
    'parts': [
      ('armF',  dict(poly=[(400,492),(475,492),(470,520),(452,545),(450,610),(455,700),(452,752),(300,752),(300,560),(340,500)], pivot=(445,497))),
      ('armB',  dict(poly=[(702,488),(765,488),(835,515),(835,742),(742,742),(738,620),(735,548),(705,535)], pivot=(730,498), ext=468, fill=(722,500,742,512))),
      ('shinF', dict(poly=[(320,1005),(592,1005),(592,1295),(320,1295)], pivot=(440,1008), parent='thighF', ext=968, fill=(410,1012,470,1022))),
      ('shinB', dict(poly=[(592,1005),(840,1005),(840,1295),(592,1295)], pivot=(690,1010), parent='thighB', ext=968, fill=(660,1012,720,1022))),
      ('thighF',dict(poly=[(330,800),(588,800),(588,1005),(330,1005)], pivot=(470,790), ext=755, fill=(440,880,500,930))),
      ('thighB',dict(poly=[(590,790),(805,790),(805,1005),(590,1005)], pivot=(690,780), ext=745, fill=(700,850,750,900))),
    ],
  },
  'fire': {
    'file': 'char_fire.jpg', 'origin': (585, 1274),
    'keep': [],
    'parts': [
      ('armF',  dict(poly=[(440,530),(540,530),(540,560),(520,620),(500,680),(480,720),(470,765),(385,765),(392,640),(415,560)], pivot=(490,535))),
      ('armB',  dict(poly=[(742,470),(790,440),(812,268),(968,268),(968,540),(742,540)], pivot=(750,495))),
      ('shinF', dict(poly=[(325,1035),(615,1035),(615,1290),(318,1290)], pivot=(455,1037), parent='thighF', ext=995, fill=(430,1040,480,1050))),
      ('shinB', dict(poly=[(620,1035),(850,1035),(850,1290),(620,1290)], pivot=(715,1037), parent='thighB', ext=995, fill=(690,1040,740,1050))),
      ('thighF',dict(poly=[(330,905),(615,905),(615,1035),(330,1035)], pivot=(495,885), ext=850, fill=(440,940,520,990))),
      ('thighB',dict(poly=[(620,880),(835,880),(835,1035),(620,1035)], pivot=(700,865), ext=830, fill=(660,930,720,990))),
      ('tail',  dict(poly=[(195,372),(300,355),(400,358),(455,350),(458,450),(452,520),(440,530),(415,560),(400,600),(380,665),(195,665)], pivot=(455,400))),
    ],
  },
  'air': {
    'file': 'char_air.jpg', 'origin': (557, 1275),
    'keep': [],
    'parts': [
      ('armF',  dict(poly=[(345,518),(415,518),(420,560),(415,620),(420,700),(410,762),(298,762),(298,640),(315,595),(340,560)], pivot=(382,522))),
      ('armB',  dict(poly=[(690,525),(755,525),(790,575),(842,610),(842,762),(740,762),(728,690),(722,620),(700,580)], pivot=(722,530), ext=497, fill=(714,536,734,548))),
      ('shinF', dict(poly=[(295,962),(592,962),(592,1290),(288,1290)], pivot=(420,965), parent='thighF', ext=925, fill=(390,970,440,985))),
      ('shinB', dict(poly=[(592,958),(830,958),(830,1290),(592,1290)], pivot=(680,960), parent='thighB', ext=920, fill=(650,962,700,975))),
      ('thighF',dict(poly=[(330,885),(592,885),(592,962),(330,962)], pivot=(470,860), ext=840, fill=(400,900,480,940))),
      ('thighB',dict(poly=[(592,830),(772,830),(772,958),(592,958)], pivot=(670,815), ext=790, fill=(630,860,700,920))),
      ('tail',  dict(poly=[(735,232),(1090,232),(1090,545),(850,545),(762,440),(748,390),(735,300)], pivot=(740,340))),
    ],
  },
  # ---- Gegner ----
  'mummy': {
    'file': 'enemy_mummy.png', 'origin': (605, 1043), 'facing': 1,
    'keep': [],
    'parts': [
      ('armB',  dict(poly=[(298,790),(396,790),(399,850),(386,932),(298,932)], pivot=(372,815), ext=785, fill=(340,820,370,850))),
      ('armF',  dict(poly=[(776,680),(965,680),(965,910),(845,910),(835,850),(805,790),(772,760)], pivot=(795,712))),
      ('thighF',dict(poly=[(330,888),(600,888),(600,1050),(330,1050)], pivot=(470,890), ext=860, fill=(430,960,480,990))),
      ('thighB',dict(poly=[(600,884),(880,884),(880,1050),(600,1050)], pivot=(720,886), ext=856, fill=(700,950,750,980))),
      ('tail',  dict(poly=[(408,262),(640,262),(612,312),(598,352),(588,428),(408,428)], pivot=(598,335))),
    ],
  },
  'mummy_tall': {
    'file': 'enemy_mummy_tall.jpg', 'origin': (520, 1508), 'facing': -1, 'scale': 0.2,
    'keep': [],
    'parts': [
      ('armB',  dict(poly=[(318,392),(412,392),(402,470),(378,600),(334,688),(306,758),(294,945),(118,945),(118,700),(238,580),(288,478)], pivot=(366,432), ext=380, fill=(350,440,380,470))),
      ('armF',  dict(poly=[(598,378),(724,378),(724,470),(862,790),(862,1005),(584,1005),(582,820),(600,700),(612,560),(596,470)], pivot=(642,432))),
      ('shinB', dict(poly=[(190,1000),(468,1000),(468,1520),(190,1520)], pivot=(322,1002), parent='thighB', ext=960, fill=(300,1010,340,1030))),
      ('shinF', dict(poly=[(470,1040),(860,1040),(860,1520),(470,1520)], pivot=(540,1042), parent='thighF', ext=1000, fill=(520,1050,560,1070))),
      ('thighB',dict(poly=[(250,700),(470,700),(452,760),(442,1000),(250,1000)], pivot=(410,716), ext=660, fill=(360,760,400,800))),
      ('thighF',dict(poly=[(470,700),(600,700),(600,1040),(442,1040),(452,760)], pivot=(502,746), ext=680, fill=(500,800,540,840))),
      ('tail',  dict(poly=[(452,8),(714,8),(714,178),(560,178),(470,142),(448,92)], pivot=(458,96))),
    ],
  },
}

# Zeichenreihenfolge (hinten -> vorne)
ZORDER = ['tail', 'armB', 'shinB', 'thighB', 'shinF', 'thighF', 'body', 'armF']
TINT = {'body': (255,255,255), 'armF': (255,60,60), 'armB': (255,160,0), 'shinF': (0,200,0),
        'shinB': (0,120,255), 'thighF': (150,255,80), 'thighB': (80,200,255), 'tail': (230,0,230)}


def poly_mask(shape, poly):
    im = Image.new('L', (shape[1], shape[0]), 0)
    ImageDraw.Draw(im).polygon([tuple(p) for p in poly], fill=255)
    return np.array(im) > 0


def foreground(rgb):
    h, w, _ = rgb.shape
    mn = rgb.min(axis=2)
    loose = mn > 200
    bg = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if loose[y, x] and not bg[y, x]:
                bg[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if loose[y, x] and not bg[y, x]:
                bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx] and loose[ny, nx]:
                bg[ny, nx] = True; q.append((ny, nx))
    # eingeschlossene, sehr helle, grosse Flaechen = Hintergrund
    rest = loose & ~bg
    seen = np.zeros_like(rest)
    holes = []
    for y0, x0 in zip(*np.where(rest)):
        if seen[y0, x0]:
            continue
        comp = []
        q = deque([(y0, x0)]); seen[y0, x0] = True
        while q:
            y, x = q.popleft(); comp.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and rest[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True; q.append((ny, nx))
        if len(comp) > 250:
            ys = np.array([c[0] for c in comp]); xs = np.array([c[1] for c in comp])
            m = mn[ys, xs].mean()
            if m > 243:
                bg[ys, xs] = True
                holes.append((len(comp), int(xs.mean()), int(ys.mean()), round(float(m), 1)))
    # kleine isolierte Inseln (JPEG-Rauschen) entfernen
    fg = ~bg
    seen = np.zeros_like(fg)
    for y0, x0 in zip(*np.where(fg)):
        if seen[y0, x0]:
            continue
        comp = []
        q = deque([(y0, x0)]); seen[y0, x0] = True
        while q:
            y, x = q.popleft(); comp.append((y, x))
            if len(comp) > 400:
                break
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and fg[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True; q.append((ny, nx))
        if len(comp) <= 400 and not q:
            for (y, x) in comp:
                bg[y, x] = True
    alpha = np.where(bg, 0, 255).astype(np.float32)
    # weiche Kante: helle Randpixel teiltransparent
    edge = np.zeros_like(bg)
    edge[1:, :] |= bg[:-1, :]; edge[:-1, :] |= bg[1:, :]
    edge[:, 1:] |= bg[:, :-1]; edge[:, :-1] |= bg[:, 1:]
    edge &= ~bg
    soft = np.clip((255 - mn.astype(np.float32)) / 70.0, 0, 1) * 255
    alpha = np.where(edge, np.minimum(alpha, soft), alpha)
    return alpha, holes


def shift_up(mask, r):
    m = mask.copy()
    for i in range(1, r + 1):
        m[:-i] |= mask[i:]
    return m


def shift_down(mask, r):
    m = mask.copy()
    for i in range(1, r + 1):
        m[i:] |= mask[:-i]
    return m


def dilate(mask, r):
    m = mask.copy()
    for _ in range(r):
        m = m | np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)
    return m


def erode(mask, r):
    m = mask.copy()
    for _ in range(r):
        m = m & np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1)
    return m


def median_color(rgb, alpha, rect):
    x0, y0, x1, y1 = rect
    reg = rgb[y0:y1, x0:x1].reshape(-1, 3)
    a = alpha[y0:y1, x0:x1].reshape(-1)
    reg = reg[a > 128]
    lum = reg.mean(axis=1)
    reg = reg[lum > 35]  # Outline ignorieren
    return tuple(int(v) for v in np.median(reg, axis=0))


def build(name, cfg, preview_dir=None):
    raw = Image.open(os.path.join(SRC, cfg['file']))
    if raw.mode == 'RGBA':
        white = Image.new('RGBA', raw.size, (255, 255, 255, 255))
        white.alpha_composite(raw)
        rgb = np.array(white.convert('RGB')).astype(np.int32)
        alpha = np.array(raw)[..., 3].astype(np.float32)
        alpha = np.where(alpha > 40, np.maximum(alpha, 255 * (alpha > 160)), 0).astype(np.float32)
        holes = []
    else:
        rgb = np.array(raw.convert('RGB')).astype(np.int32)
        alpha, holes = foreground(rgb)
    h, w, _ = rgb.shape
    if holes:
        print(f'  {name}: {len(holes)} eingeschlossene Hintergrundflaechen entfernt')
    opaque = alpha > 0
    keep = np.zeros((h, w), bool)
    for kp in cfg['keep']:
        keep |= poly_mask((h, w), kp)
    assigned = np.zeros((h, w), bool)
    owns = {}
    for pname, p in cfg['parts']:
        pm = poly_mask((h, w), p['poly'])
        own = pm & opaque & ~assigned & ~keep
        assigned |= own
        owns[pname] = (own, pm)
    body_mask = opaque & ~assigned
    OVER = 12  # Ueberlappung in Originalpixeln gegen Naehte
    layers = {}
    body_extra = np.zeros((h, w), bool)
    for pname, p in cfg['parts']:
        own, pm = owns[pname]
        cover = owns[p['parent']][0] if p.get('parent') else body_mask
        a = np.where(own, alpha, 0)
        col = rgb.copy()
        if pname == 'armF':
            # wird VOR dem Rumpf gezeichnet: Rumpf bekommt einen Streifen des Arms
            yy, xx = np.mgrid[0:h, 0:w]
            near = (xx - p['pivot'][0]) ** 2 + (yy - p['pivot'][1]) ** 2 < 70 ** 2
            body_extra |= shift_down(body_mask, OVER) & own & near
        elif pname != 'tail':
            # wird HINTER dem verdeckenden Teil gezeichnet: echte Pixel als Streifen
            strip = shift_up(own, OVER) & cover & opaque
            a = np.where(strip, np.maximum(a, alpha), a)
            if 'ext' in p:
                fc = median_color(rgb, alpha, p['fill'])
                cov = erode(cover, 3)
                fillmask = np.zeros((h, w), bool)
                ys = np.where(own.any(axis=1))[0]
                top = ys.min()
                rows = own[top:top + 6].any(axis=0)
                xs = np.where(rows)[0]
                if len(xs):
                    x0, x1 = xs.min() + 2, xs.max() - 2
                    fillmask[p['ext']:top + 4, x0:x1 + 1] = True
                fillmask |= (pm & keep & opaque)
                fillmask &= cov & ~own & ~strip
                col[fillmask] = fc
                a = np.where(fillmask, 255, a)
        layers[pname] = (col, a)
    body_a = np.where(body_mask | body_extra, alpha, 0)
    layers['body'] = (rgb, body_a)

    S = cfg.get('scale', SCALE)
    ox, oy = cfg['origin']
    pivots = {pn: p['pivot'] for pn, p in cfg['parts']}
    parents = {pn: p.get('parent') for pn, p in cfg['parts']}

    # Teile ausschneiden + skalieren
    pieces = {}
    for pname, (col, a) in layers.items():
        ys, xs = np.where(a > 0)
        if len(ys) == 0:
            continue
        pad = 6
        x0, y0 = max(xs.min() - pad, 0), max(ys.min() - pad, 0)
        x1, y1 = min(xs.max() + pad + 1, w), min(ys.max() + pad + 1, h)
        rgba = np.dstack([col[y0:y1, x0:x1], a[y0:y1, x0:x1]]).astype(np.uint8)
        im = Image.fromarray(rgba, 'RGBA')
        sw, sh = max(1, round((x1 - x0) * S)), max(1, round((y1 - y0) * S))
        im = im.resize((sw, sh), Image.LANCZOS)
        pieces[pname] = (im, x0, y0)

    # Atlas packen (einfache Zeilen)
    order = [p for p in ZORDER if p in pieces]
    maxw = 1024
    x = y = rowh = 0
    rects = {}
    for pn in order:
        im = pieces[pn][0]
        if x + im.width > maxw:
            x = 0; y += rowh + 2; rowh = 0
        rects[pn] = (x, y)
        x += im.width + 2
        rowh = max(rowh, im.height)
    usedw = max(rects[pn][0] + pieces[pn][0].width for pn in order)
    atlas = Image.new('RGBA', (usedw, y + rowh), (0, 0, 0, 0))
    meta = {'scale': S, 'height': round((oy - min(pieces[p][2] for p in pieces)) * S),
            'facing': cfg.get('facing', 1), 'zorder': order, 'parts': {}}
    for pn in order:
        im, x0, y0 = pieces[pn]
        ax, ay = rects[pn]
        atlas.paste(im, (ax, ay))
        piv = pivots.get(pn, (ox, oy))
        par = parents.get(pn)
        # Gelenk relativ zum Ursprung (Fuesse) in Atlas-Pixeln
        jx, jy = (piv[0] - ox) * S, (piv[1] - oy) * S
        meta['parts'][pn] = {
            'rect': [ax, ay, im.width, im.height],
            # Bild-Offset relativ zum eigenen Gelenk
            'off': [round((x0 - piv[0]) * S, 2), round((y0 - piv[1]) * S, 2)],
            'joint': [round(jx, 2), round(jy, 2)],
            'parent': par,
        }
    os.makedirs(OUT, exist_ok=True)
    atlas.save(os.path.join(OUT, f'{name}.png'), optimize=True)
    with open(os.path.join(OUT, f'{name}.json'), 'w') as f:
        json.dump(meta, f, indent=1)
    print(f'  {name}: atlas {atlas.size}, Hoehe {meta["height"]}px')

    if preview_dir:
        os.makedirs(preview_dir, exist_ok=True)
        prev = np.full((h, w, 3), 245, np.float32)
        for pn, (col, a) in layers.items():
            t = np.array(TINT[pn], np.float32)
            m = (a > 0)[..., None]
            c = col.astype(np.float32) * 0.55 + t * 0.45 if pn != 'body' else col.astype(np.float32)
            prev = np.where(m, c, prev)
        pim = Image.fromarray(prev.clip(0, 255).astype(np.uint8))
        d = ImageDraw.Draw(pim)
        for pn, p in cfg['parts']:
            px, py = p['pivot']
            d.ellipse([px - 8, py - 8, px + 8, py + 8], outline=(0, 0, 0), width=3)
            d.polygon([tuple(q) for q in p['poly']], outline=TINT[pn])
        d.ellipse([ox - 10, oy - 10, ox + 10, oy + 10], fill=(255, 0, 0))
        pim.save(os.path.join(preview_dir, f'seg_{name}.png'))


if __name__ == '__main__':
    prev = None
    if '--preview' in sys.argv:
        prev = sys.argv[sys.argv.index('--preview') + 1]
    names = [a for a in sys.argv[1:] if a in CONFIG] or list(CONFIG)
    for n in names:
        print('baue', n)
        build(n, CONFIG[n], prev)
