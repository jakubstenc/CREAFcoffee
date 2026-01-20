from PIL import Image
import os
import glob
import math

def distance(c1, c2):
    (r1, g1, b1) = c1[:3]
    (r2, g2, b2) = c2[:3]
    return math.sqrt((r1 - r2)**2 + (g1 - g2)**2 + (b1 - b2)**2)

def remove_background(image_path, tolerance=30):
    try:
        img = Image.open(image_path)
        img = img.convert("RGBA")
        datas = img.getdata()
        
        # Sample the top-left pixel as the background color
        bg_color = datas[0]
        
        new_data = []
        for item in datas:
            # Check modification: if the pixel is close to the background color -> transparent
            # Also checking for pure white just in case
            if distance(item, bg_color) < tolerance or (item[0] > 240 and item[1] > 240 and item[2] > 240):
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)

        img.putdata(new_data)
        img.save(image_path, "PNG")
        print(f"Processed: {image_path}")
    except Exception as e:
        print(f"Failed {image_path}: {e}")

# Target directory
target_dir = "/home/meow/Documents/Antigravity/CREAFcoffee/images"
files = glob.glob(os.path.join(target_dir, "*.png"))

for f in files:
    remove_background(f, tolerance=50) # Increased tolerance
