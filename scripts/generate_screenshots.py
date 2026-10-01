import os
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
PUBLIC_DIR = os.path.join(PROJECT_ROOT, "frontend", "public")

def create_wide_screenshot():
    w, h = 1280, 720
    img = Image.new("RGB", (w, h), "#0b141a")
    draw = ImageDraw.Draw(img)

    # Left sidebar (chats) - #111b21
    draw.rectangle([0, 0, 420, h], fill="#111b21")
    # Sidebar header - #202c33
    draw.rectangle([0, 0, 420, 60], fill="#202c33")
    # Top left profile avatar placeholder
    draw.ellipse([16, 12, 52, 48], fill="#00a884")
    draw.ellipse([26, 20, 42, 36], fill="#ffffff")

    # Search bar in sidebar
    draw.rounded_rectangle([14, 72, 406, 108], radius=8, fill="#202c33")
    
    # 5 Chat items in sidebar
    chats = [
        ("Nikhil Agrahari", "Hey! The WhatsApp clone is live 🚀", "02:45", "#00a884"),
        ("Devansh Yadav", "Great work on the video call feature!", "Yesterday", "#3b82f6"),
        ("Frontend Team", "APK packaging is ready with PWA Builder", "Yesterday", "#8b5cf6"),
        ("Project Group", "Shared a photo", "Monday", "#ec4899"),
        ("Family Group", "Voice message (0:45)", "Sunday", "#f59e0b"),
    ]
    for i, (name, msg, time_str, color) in enumerate(chats):
        y = 124 + i * 72
        # Divider
        draw.line([76, y + 68, 420, y + 68], fill="#222e35", width=1)
        # Avatar
        draw.ellipse([16, y + 8, 64, y + 56], fill=color)
        # Name placeholder
        draw.rectangle([76, y + 14, 230, y + 28], fill="#e9edef")
        # Msg placeholder
        draw.rectangle([76, y + 36, 320, y + 46], fill="#8696a0")
        # Time placeholder
        draw.rectangle([360, y + 16, 404, y + 26], fill="#667781")

    # Main Chat Area (right side)
    # Chat Area Header
    draw.rectangle([420, 0, w, 60], fill="#202c33")
    draw.ellipse([436, 12, 472, 48], fill="#00a884")
    draw.rectangle([488, 18, 620, y + 28], fill="#e9edef")
    draw.rectangle([488, 36, 560, y + 44], fill="#8696a0")

    # Call buttons in header
    draw.ellipse([1140, 16, 1172, 48], fill="#374248")
    draw.ellipse([1190, 16, 1222, 48], fill="#374248")
    draw.ellipse([1238, 16, 1262, 48], fill="#374248")

    # Chat messages in main area
    # Incoming bubble (left)
    draw.rounded_rectangle([440, 100, 780, 160], radius=10, fill="#202c33")
    draw.rectangle([456, 114, 750, 128], fill="#e9edef")
    draw.rectangle([456, 136, 680, 146], fill="#8696a0")

    # Outgoing bubble (right)
    draw.rounded_rectangle([860, 180, 1240, 246], radius=10, fill="#005c4b")
    draw.rectangle([880, 194, 1210, 208], fill="#e9edef")
    draw.rectangle([880, 216, 1130, 226], fill="#8696a0")

    # Incoming bubble 2
    draw.rounded_rectangle([440, 270, 860, 340], radius=10, fill="#202c33")
    draw.rectangle([456, 286, 820, 300], fill="#e9edef")
    draw.rectangle([456, 310, 710, 320], fill="#8696a0")

    # Outgoing bubble 2
    draw.rounded_rectangle([900, 360, 1240, 420], radius=10, fill="#005c4b")
    draw.rectangle([920, 376, 1210, 390], fill="#e9edef")
    draw.rectangle([920, 400, 1110, 408], fill="#8696a0")

    # Bottom Input Bar
    draw.rectangle([420, h - 64, w, h], fill="#202c33")
    draw.rounded_rectangle([480, h - 52, 1200, h - 14], radius=18, fill="#2a3942")
    draw.ellipse([1220, h - 52, 1256, h - 16], fill="#00a884")

    out_path = os.path.join(PUBLIC_DIR, "screenshot-wide.png")
    img.save(out_path, "PNG")
    print(f"Generated wide screenshot: {out_path} ({os.path.getsize(out_path)} bytes)")

def create_mobile_screenshot():
    w, h = 720, 1280
    img = Image.new("RGB", (w, h), "#111b21")
    draw = ImageDraw.Draw(img)

    # Top App Bar - WhatsApp Green (#008069)
    draw.rectangle([0, 0, w, 110], fill="#008069")
    # Title "WhatsApp" placeholder
    draw.rectangle([30, 40, 220, 68], fill="#ffffff")
    # Top right icons (Camera, Search, Menu)
    draw.ellipse([540, 40, 568, 68], fill="#ffffff")
    draw.ellipse([600, 40, 628, 68], fill="#ffffff")
    draw.ellipse([660, 40, 688, 68], fill="#ffffff")

    # Tabs (Chats, Status, Calls)
    draw.rectangle([0, 110, w, 160], fill="#008069")
    draw.rectangle([20, 125, 140, 145], fill="#ffffff")
    draw.rectangle([180, 125, 300, 145], fill="#b3d9d2")
    draw.rectangle([340, 125, 460, 145], fill="#b3d9d2")
    # Active tab indicator line
    draw.rectangle([16, 154, 144, 160], fill="#ffffff")

    # Chat list items
    colors = ["#00a884", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#6366f1", "#ef4444", "#14b8a6"]
    for i, color in enumerate(colors):
        y = 175 + i * 110
        # Avatar
        draw.ellipse([24, y + 10, 104, y + 90], fill=color)
        draw.ellipse([44, y + 28, 84, y + 68], fill="#ffffff")
        # Name
        draw.rectangle([124, y + 20, 360, y + 42], fill="#e9edef")
        # Last message
        draw.rectangle([124, y + 54, 520, y + 72], fill="#8696a0")
        # Time
        draw.rectangle([610, y + 22, 690, y + 38], fill="#667781")
        # Unread badge
        if i in (0, 1, 3):
            draw.ellipse([656, y + 52, 686, y + 82], fill="#00a884")
        # Divider line
        draw.line([124, y + 104, w, y + 104], fill="#222e35", width=1)

    # Floating Action Button (New Chat)
    draw.ellipse([w - 110, h - 140, w - 30, h - 60], fill="#00a884")
    draw.rectangle([w - 82, h - 105, w - 58, h - 95], fill="#ffffff")
    draw.rectangle([w - 74, h - 113, w - 66, h - 87], fill="#ffffff")

    out_path = os.path.join(PUBLIC_DIR, "screenshot-mobile.png")
    img.save(out_path, "PNG")
    print(f"Generated mobile screenshot: {out_path} ({os.path.getsize(out_path)} bytes)")

create_wide_screenshot()
create_mobile_screenshot()
print("Screenshots generated successfully!")
