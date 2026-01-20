from PIL import Image
import os
import glob

def apply_luminance_transparency(image_path):
    try:
        img = Image.open(image_path).convert("RGBA")
        datas = img.getdata()
        
        new_data = []
        for item in datas:
            r, g, b, a = item
            
            # Calculate brightness (Luminance)
            # Standard formula: 0.299*R + 0.587*G + 0.114*B, but simple average is fine for this
            brightness = (r + g + b) / 3
            
            # INVERT brightness for Alpha
            # White (255) -> Alpha 0
            # Black (0) -> Alpha 255
            # We add a "threshold" to clip near-whites to pure transparency
            threshold = 20 # Clip anything brighter than 235/255 to fully transparent
            
            if brightness > (255 - threshold):
                new_alpha = 0
            else:
                # Scale the remaining range
                # The darker the pixel, the more opaque it is.
                # We multiply by a factor to make the stain distinct
                new_alpha = int((255 - brightness) * 1.5) 
                new_alpha = min(new_alpha, 255) # Cap at 255
            
            # Keep the original color but use the new Alpha
            # OPTIONAL: Darken the color slightly to make it look wet
            new_data.append((r, g, b, new_alpha))

        img.putdata(new_data)
        img.save(image_path, "PNG")
        print(f"Processed (Luminance): {image_path}")
    except Exception as e:
        print(f"Failed {image_path}: {e}")

# Target directory
target_dir = "/home/meow/Documents/Antigravity/CREAFcoffee/images"
files = glob.glob(os.path.join(target_dir, "*.png"))

for f in files:
    apply_luminance_transparency(f)
