from PIL import Image, ImageDraw, ImageFilter
import os
import glob
import math

def apply_transparency_and_vignette(image_path):
    try:
        img = Image.open(image_path).convert("RGBA")
        width, height = img.size
        
        # 1. LUMINANCE TRANSPARENCY (Darkness = Opacity)
        datas = img.getdata()
        new_data = []
        for item in datas:
            r, g, b, a = item
            brightness = (r + g + b) / 3
            
            # White -> Transparent
            # Threshold to ensure paper white is gone
            if brightness > 230: 
                new_alpha = 0
            else:
                # Invert brightness for alpha
                new_alpha = int((255 - brightness) * 1.8) # Boost contrast
                new_alpha = min(new_alpha, 255)
            
            new_data.append((r, g, b, new_alpha))
        
        img.putdata(new_data)
        
        # 2. VIGNETTE MASK (Force fade edges)
        # Create a gradient mask that is white in center, black at edges
        mask = Image.new("L", (width, height), 0)
        draw = ImageDraw.Draw(mask)
        
        # Define ellipse slightly smaller than image
        # This ensures corners are cut off
        margin_x = width * 0.05
        margin_y = height * 0.05
        draw.ellipse((margin_x, margin_y, width - margin_x, height - margin_y), fill=255)
        
        # Blur the mask to make the fade soft
        mask = mask.filter(ImageFilter.GaussianBlur(radius=20))
        
        # Apply mask to Alpha channel
        # We multiply existing alpha by mask value
        final_data = []
        current_data = img.getdata()
        mask_data = mask.getdata()
        
        for i, pixel in enumerate(current_data):
            r, g, b, a = pixel
            mask_val = mask_data[i] / 255.0 # 0.0 to 1.0
            
            final_alpha = int(a * mask_val)
            final_data.append((r, g, b, final_alpha))
            
        img.putdata(final_data)
        img.save(image_path, "PNG")
        print(f"Processed (Luminance + Vignette): {image_path}")
        
    except Exception as e:
        print(f"Failed {image_path}: {e}")

# Target directory
target_dir = "/home/meow/Documents/Antigravity/CREAFcoffee/images"
files = glob.glob(os.path.join(target_dir, "*.png"))

for f in files:
    apply_transparency_and_vignette(f)
