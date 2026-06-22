#!/usr/bin/env python3
"""Insert OG + Twitter card metadata into each Fonte page (idempotent)."""
import re, pathlib

BASE = "https://fonte.finance"
IMG = f"{BASE}/assets/og.png?v=20260615"
ALT = "Fonte — Crypto, on autopilot. Professionally managed, non-custodial crypto portfolios."

PAGES = {
    "index.html": ("/", "Fonte · Crypto, on autopilot",
        "Professionally managed crypto portfolios. You keep your keys. We do the hard part. You watch it grow."),
    "about.html": ("/about", "About Fonte",
        "Why Fonte exists: managing crypto should feel calm. Professionally managed, non-custodial portfolios for people who would rather live their life than watch charts."),
    "business.html": ("/business", "Fonte for funds · White-label crypto portfolio management",
        "A white-label, non-custodial, automated crypto portfolio platform for family offices and small funds. Your brand. Our engine."),
    "app.html": ("/app", "Fonte · Your portfolio",
        "Your Fonte dashboard: live positions, NAV, and allocation across a professionally managed, non-custodial crypto portfolio you control."),
    "terms.html": ("/terms", "Terms of Service · Fonte",
        "Fonte Terms of Service. A plain-language agreement covering our non-custodial managed service, fees, risks, and your responsibilities."),
    "privacy.html": ("/privacy", "Privacy Policy · Fonte",
        "Fonte Privacy Policy. What little we collect, what we never collect, and how we handle it. We never hold your funds or private keys."),
    "contact.html": ("/contact", "Contact Fonte",
        "Get in touch with Fonte. Email us, send a message, or reach out about managed crypto for funds and family offices."),
}

def esc(s):
    return s.replace("&", "&amp;").replace('"', "&quot;")

def block(path, title, desc):
    url = BASE + path
    return "\n".join([
        '<meta name="theme-color" content="#0E7C66" />',
        f'<link rel="canonical" href="{url}" />',
        '<meta property="og:type" content="website" />',
        '<meta property="og:site_name" content="Fonte" />',
        f'<meta property="og:title" content="{esc(title)}" />',
        f'<meta property="og:description" content="{esc(desc)}" />',
        f'<meta property="og:url" content="{url}" />',
        f'<meta property="og:image" content="{IMG}" />',
        '<meta property="og:image:type" content="image/png" />',
        '<meta property="og:image:width" content="1200" />',
        '<meta property="og:image:height" content="630" />',
        f'<meta property="og:image:alt" content="{esc(ALT)}" />',
        '<meta name="twitter:card" content="summary_large_image" />',
        '<meta name="twitter:site" content="@fonte" />',
        f'<meta name="twitter:title" content="{esc(title)}" />',
        f'<meta name="twitter:description" content="{esc(desc)}" />',
        f'<meta name="twitter:image" content="{IMG}" />',
        f'<meta name="twitter:image:alt" content="{esc(ALT)}" />',
    ])

root = pathlib.Path(__file__).resolve().parent.parent
icon_re = re.compile(r'(<link rel="icon"[^>]*/>\n)')
desc_re = re.compile(r'<meta name="description"')

for fname, (path, title, desc) in PAGES.items():
    fp = root / fname
    html = fp.read_text()
    if "og:image" in html:
        # remove the previously-injected block (between markers) then re-add fresh
        html = re.sub(r"<!--OG-->.*?<!--/OG-->\n", "", html, flags=re.S)
    m = icon_re.search(html)
    if not m:
        print(f"  ! {fname}: icon link not found, skipping")
        continue
    insert = "<!--OG-->\n" + block(path, title, desc) + "\n<!--/OG-->\n"
    # ensure a description meta exists (app.html lacks one) — add before the block
    add_desc = ""
    if not desc_re.search(html):
        add_desc = f'<meta name="description" content="{esc(desc)}" />\n'
    html = html[:m.end()] + add_desc + insert + html[m.end():]
    fp.write_text(html)
    print(f"  ✓ {fname}: injected OG/Twitter ({path})")

print("done")
