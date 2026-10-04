import os
from PIL import Image, ImageDraw, ImageFont

def create_gradient_icon(size, output_path, is_maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw rounded rectangle background or square for maskable
    corner_radius = 0 if is_maskable else int(size * 0.22)
    
    # Draw emerald gradient
    # Top color: #10b981 (16, 185, 129), Bottom color: #047857 (4, 120, 87)
    for y in range(size):
        ratio = y / size
        r = int(16 * (1 - ratio) + 4 * ratio)
        g = int(185 * (1 - ratio) + 120 * ratio)
        b = int(129 * (1 - ratio) + 87 * ratio)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    # Mask to rounded rect if not maskable
    if not is_maskable:
        mask = Image.new("L", (size, size), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.rounded_rectangle([(0, 0), (size, size)], radius=corner_radius, fill=255)
        img.putalpha(mask)

    draw = ImageDraw.Draw(img)

    # Draw emblem / target icon in center
    cx, cy = size // 2, size // 2
    outer_r = int(size * 0.28)
    mid_r = int(size * 0.20)
    inner_r = int(size * 0.10)
    center_dot = int(size * 0.04)

    # Outer ring (white)
    draw.ellipse([cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r], outline=(255, 255, 255, 255), width=max(2, size // 30))
    # Middle ring (white transparent)
    draw.ellipse([cx - mid_r, cy - mid_r, cx + mid_r, cy + mid_r], outline=(255, 255, 255, 220), width=max(2, size // 35))
    # Inner filled bullseye
    draw.ellipse([cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r], fill=(255, 255, 255, 255))
    # Center dot emerald
    draw.ellipse([cx - center_dot, cy - center_dot, cx + center_dot, cy + center_dot], fill=(4, 120, 87, 255))

    # Add crosshair lines
    line_w = max(2, size // 40)
    draw.line([cx - outer_r - int(size * 0.06), cy, cx - outer_r + int(size * 0.04), cy], fill=(255, 255, 255, 255), width=line_w)
    draw.line([cx + outer_r - int(size * 0.04), cy, cx + outer_r + int(size * 0.06), cy], fill=(255, 255, 255, 255), width=line_w)
    draw.line([cx, cy - outer_r - int(size * 0.06), cx, cy - outer_r + int(size * 0.04)], fill=(255, 255, 255, 255), width=line_w)
    draw.line([cx, cy + outer_r - int(size * 0.04), cx, cy + outer_r + int(size * 0.06)], fill=(255, 255, 255, 255), width=line_w)

    img.save(output_path, "PNG")
    print(f"Generated icon: {output_path} ({size}x{size})")

if __name__ == "__main__":
    out_dir = r"s:\Bubu-Dudu Job Gallary\job-portal\icons"
    os.makedirs(out_dir, exist_ok=True)
    
    create_gradient_icon(192, os.path.join(out_dir, "icon-192.png"))
    create_gradient_icon(512, os.path.join(out_dir, "icon-512.png"))
    create_gradient_icon(192, os.path.join(out_dir, "icon-maskable-192.png"), is_maskable=True)
    create_gradient_icon(512, os.path.join(out_dir, "icon-maskable-512.png"), is_maskable=True)
    create_gradient_icon(180, os.path.join(out_dir, "apple-touch-icon.png"))
    create_gradient_icon(64, os.path.join(out_dir, "favicon.png"))
