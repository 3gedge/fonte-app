#!/usr/bin/env python3
"""Generate the Fonte social/OG card (1200x630) matching the marketing brand."""
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

S = 2                      # supersample factor
W, H = 1200 * S, 630 * S
M = 80 * S                 # outer margin

# ── brand palette ─────────────────────────────────────────────────────────────
BG       = (251, 250, 246)
BG2      = (246, 244, 237)
INK      = (21, 22, 26)
INK2     = (88, 88, 96)
INK3     = (140, 140, 147)
ACCENT   = (14, 124, 102)
ACCENT2  = (63, 169, 140)
ACCENTSOFT = (228, 242, 236)
ACCENTINK = (10, 90, 74)
GOLD     = (201, 149, 47)
LINE     = (236, 233, 224)

FR = "Fraunces.ttf"
HK = "Hanken.ttf"

def fr(size, wght=600, opsz=144):
    f = ImageFont.truetype(FR, int(size * S))
    f.set_variation_by_axes([opsz, wght, 0, 0])   # opsz, wght, SOFT, WONK
    return f

def hk(size, wght=500):
    f = ImageFont.truetype(HK, int(size * S))
    f.set_variation_by_axes([wght])
    return f

def tw(d, txt, font):
    b = d.textbbox((0, 0), txt, font=font)
    return b[2] - b[0], b[3] - b[1]

# ── canvas + soft background wash ─────────────────────────────────────────────
img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

# subtle vertical paper gradient
for y in range(H):
    t = y / H
    r = int(BG[0] + (BG2[0] - BG[0]) * t)
    g = int(BG[1] + (BG2[1] - BG[1]) * t)
    b = int(BG[2] + (BG2[2] - BG[2]) * t)
    d.line([(0, y), (W, y)], fill=(r, g, b))

# soft green glow, upper-right
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse([W - 760 * S, -360 * S, W + 220 * S, 360 * S], fill=(63, 169, 140, 46))
glow = glow.filter(ImageFilter.GaussianBlur(140 * S))
img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
d = ImageDraw.Draw(img)

# ── equity curve along the lower band (the product: portfolios that grow) ──────
base_y = 470 * S
x0, x1 = -10 * S, W + 10 * S
pts = []
n = 240
for i in range(n + 1):
    x = x0 + (x1 - x0) * i / n
    p = i / n
    # generally rising, gentle organic wiggle
    rise = (p ** 1.35) * 150 * S
    wig = math.sin(p * 9.2) * 7 * S + math.sin(p * 21) * 3 * S
    y = base_y - rise + wig
    pts.append((x, y))

# gradient fill under the curve
fill = Image.new("RGBA", (W, H), (0, 0, 0, 0))
fd = ImageDraw.Draw(fill)
poly = pts + [(x1, H), (x0, H)]
fd.polygon(poly, fill=(14, 124, 102, 255))
# vertical alpha falloff
fmask = Image.new("L", (W, H), 0)
md = ImageDraw.Draw(fmask)
for y in range(H):
    a = max(0, 46 - int(46 * (y - (base_y - 150 * S)) / (H - (base_y - 150 * S))))
    md.line([(0, y), (W, y)], fill=max(0, min(46, a)))
fill.putalpha(Image.composite(fill.getchannel("A"), Image.new("L", (W, H), 0), fmask))
img = Image.alpha_composite(img.convert("RGBA"), fill).convert("RGB")
d = ImageDraw.Draw(img)

# the curve line
d.line(pts, fill=ACCENT, width=4 * S, joint="curve")
# end marker (gold)
ex, ey = pts[-18]
d.ellipse([ex - 9 * S, ey - 9 * S, ex + 9 * S, ey + 9 * S], fill=GOLD)
d.ellipse([ex - 4 * S, ey - 4 * S, ex + 4 * S, ey + 4 * S], fill=(255, 255, 255))

# ── logo: rounded green square + white water-drop + wordmark ───────────────────
bx, by, bs = M, 60 * S, 60 * S
d.rounded_rectangle([bx, by, bx + bs, by + bs], radius=19 * S, fill=ACCENT)
# water-drop (scaled from the favicon path): apex at top, round bulb at bottom
cx = bx + bs * 0.5
top = by + bs * 0.16
r = bs * 0.265
cyb = by + bs * 0.625
d.ellipse([cx - r, cyb - r, cx + r, cyb + r], fill="white")
d.polygon([(cx, top), (cx - r * 0.96, cyb - r * 0.18), (cx + r * 0.96, cyb - r * 0.18)], fill="white")
wm = fr(34, wght=600)
d.text((bx + bs + 18 * S, by + 9 * S), "Fonte", font=wm, fill=INK)

# ── headline (auto-fit to width) ──────────────────────────────────────────────
pre, hot = "Crypto, on ", "autopilot."
hsize = 92
while True:
    fh = fr(hsize, wght=600)
    wpre, _ = tw(d, pre, fh)
    whot, _ = tw(d, hot, fh)
    if wpre + whot <= W - 2 * M or hsize <= 60:
        break
    hsize -= 2
hy = 232 * S
d.text((M, hy), pre, font=fh, fill=INK)
d.text((M + wpre, hy), hot, font=fh, fill=ACCENT)

# subhead
sh = hk(28, wght=500)
sub = "Professionally managed crypto portfolios — you keep your keys."
d.text((M, hy + hsize * S + 26 * S), sub, font=sh, fill=INK2)

# ── trust chips ───────────────────────────────────────────────────────────────
chips = ["Non-custodial", "Built on Base", "You watch it grow"]
cf = hk(21, wght=600)
cxp = M
cyp = 524 * S
for i, c in enumerate(chips):
    d.ellipse([cxp, cyp + 4 * S, cxp + 11 * S, cyp + 15 * S], fill=ACCENT)
    d.text((cxp + 20 * S, cyp), c, font=cf, fill=INK2)
    wc, _ = tw(d, c, cf)
    cxp += 20 * S + wc + 40 * S

# url bottom-right
uf = hk(23, wght=600)
url = "fonte.finance"
wu, hu = tw(d, url, uf)
d.text((W - M - wu, cyp - 1 * S), url, font=uf, fill=ACCENTINK)

# ── downscale + export ────────────────────────────────────────────────────────
out = img.resize((1200, 630), Image.LANCZOS)
out.save("../assets/og.png", "PNG")
out.convert("RGB").save("../assets/og.jpg", "JPEG", quality=90)
print("wrote ../assets/og.png and og.jpg  (1200x630, headline", hsize, "px)")
