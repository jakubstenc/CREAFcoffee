from PIL import Image, ImageDraw, ImageFilter
import os
import glob
import math

def apply_aggressive_transparency(image_path):
    try:
        img = Image.open(image_path).convert("RGBA")
        width, height = img.size
        
        # 1. LUMINANCE TRANSPARENCY (Strict)
        datas = img.getdata()
        new_data = []
        for item in datas:
            r, g, b, a = item
            brightness = (r + g + b) / 3
            
            # STRICTER THRESHOLD: Any light grey/white becomes transparent
            if brightness > 210: # More aggressive cutoff (was 230)
                new_alpha = 0
            else:
                # Steep curve for opacity
                new_alpha = int((255 - brightness) * 2.0) 
                new_alpha = min(new_alpha, 255)
            
            new_data.append((r, g, b, new_alpha))
        
        img.putdata(new_data)
        
        # 2. VIGNETTE MASK (Aggressive)
        mask = Image.new("L", (width, height), 0)
        draw = ImageDraw.Draw(mask)
        
        # 15% Margin to cut off corners definitively
        margin_x = width * 0.15
        margin_y = height * 0.15
        
        # Draw white oval in center (visible area)
        draw.ellipse((margin_x, margin_y, width - margin_x, height - margin_y), fill=255)
        
        # Heavy blur to smooth the transition
        mask = mask.filter(ImageFilter.GaussianBlur(radius=30))
        
        # Apply mask
        final_data = []
        current_data = img.getdata()
        mask_data = mask.getdata()
        
        for i, pixel in enumerate(current_data):
            r, g, b, a = pixel
            mask_val = mask_data[i] / 255.0
            
            final_alpha = int(a * mask_val)
            final_data.append((r, g, b, final_alpha))
            
        img.putdata(final_data)
        img.save(image_path, "PNG")
        print(f"Processed (Aggressive): {image_path}")
        
    except Exception as e:
        print(f"Failed {image_path}: {e}")

# Target directory
target_dir = "/home/meow/Documents/Antigravity/CREAFcoffee/images"
files = glob.glob(os.path.join(target_dir, "*.png"))

for f in files:
    apply_aggressive_transparency(f)
