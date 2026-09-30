import os
import subprocess
from PIL import Image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
PUBLIC_DIR = os.path.join(PROJECT_ROOT, "frontend", "public")
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

svg_markup = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
  <defs>
    <linearGradient id="waGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00a884" />
      <stop offset="60%" stop-color="#25d366" />
      <stop offset="100%" stop-color="#075e54" />
    </linearGradient>
    <linearGradient id="bubbleHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.28" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>
    <filter id="waShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="3" flood-color="#04332d" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- WhatsApp Green Chat Bubble -->
  <path
    d="M32 5 C17.09 5 5 17.09 5 32 C5 37.35 6.56 42.33 9.27 46.54 L6 59 L18.88 55.68 C22.88 57.99 27.28 59.3 32 59.3 C46.91 59.3 59 47.21 59 32.3 C59 17.39 46.91 5 32 5 Z"
    fill="url(#waGreenGrad)"
    filter="url(#waShadow)"
  />

  <!-- Subtle top gloss highlight -->
  <path
    d="M32 7 C18.19 7 7 18.19 7 32 C7 35.8 7.9 39.38 9.5 42.6 C13 22 26 10 47.5 9.2 C42.8 7.8 37.6 7 32 7 Z"
    fill="url(#bubbleHighlight)"
  />

  <!-- Distinctive WhatsApp-style Emblem: Dual Messaging Checks & Wave -->
  <g fill="none" stroke="#ffffff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 33 L26 41 L42 23" />
    <path d="M29 41 L46 23" />
  </g>

  <!-- Small notification sparkle / pulse dot -->
  <circle cx="45" cy="17" r="3.2" fill="#ffffff" opacity="0.9" />
</svg>'''

# 1. Standard App Icon (Transparent background, full bubble)
html_standard = f'''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  html, body {{
    width: 512px;
    height: 512px;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }}
  .icon-wrap {{
    width: 470px;
    height: 470px;
    display: flex;
    align-items: center;
    justify-content: center;
  }}
</style>
</head>
<body>
  <div class="icon-wrap">
    {svg_markup}
  </div>
</body>
</html>'''

# 2. Maskable Icon (Filled background for Android adaptive icon safe zone)
html_maskable = f'''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  html, body {{
    width: 512px;
    height: 512px;
    background: #111b21;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }}
  .safe-zone {{
    width: 390px;
    height: 390px;
    display: flex;
    align-items: center;
    justify-content: center;
  }}
</style>
</head>
<body>
  <div class="safe-zone">
    {svg_markup}
  </div>
</body>
</html>'''

def render_html_to_png(html_text, out_png_path, bg_color="00000000"):
    temp_html = os.path.join(BASE_DIR, "temp_render.html")
    with open(temp_html, "w", encoding="utf-8") as f:
        f.write(html_text)

    cmd = [
        CHROME_PATH,
        "--headless=new",
        f"--default-background-color={bg_color}",
        f"--screenshot={out_png_path}",
        "--window-size=512,512",
        f"file:///{temp_html.replace(os.sep, '/')}"
    ]
    subprocess.run(cmd, check=True)
    if os.path.exists(temp_html):
        os.remove(temp_html)

# Generate 512x512 standard
logo512_path = os.path.join(PUBLIC_DIR, "logo512.png")
render_html_to_png(html_standard, logo512_path, "00000000")
print(f"Generated: {logo512_path} ({os.path.getsize(logo512_path)} bytes)")

# Resize to 192x192 standard using PIL with Lanczos resampling
logo192_path = os.path.join(PUBLIC_DIR, "logo192.png")
with Image.open(logo512_path) as img:
    img_192 = img.resize((192, 192), Image.Resampling.LANCZOS)
    img_192.save(logo192_path, "PNG")
print(f"Generated: {logo192_path} ({os.path.getsize(logo192_path)} bytes)")

# Generate 512x512 maskable
maskable512_path = os.path.join(PUBLIC_DIR, "maskable-icon-512.png")
render_html_to_png(html_maskable, maskable512_path, "ff111b21")
print(f"Generated: {maskable512_path} ({os.path.getsize(maskable512_path)} bytes)")

# Resize to 192x192 maskable
maskable192_path = os.path.join(PUBLIC_DIR, "maskable-icon-192.png")
with Image.open(maskable512_path) as img:
    img_maskable192 = img.resize((192, 192), Image.Resampling.LANCZOS)
    img_maskable192.save(maskable192_path, "PNG")
print(f"Generated: {maskable192_path} ({os.path.getsize(maskable192_path)} bytes)")

print("All APK and PWA icons generated successfully from the WhatsApp favicon!")
