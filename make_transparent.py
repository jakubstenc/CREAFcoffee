from PIL import Image
import os
import glob

def remove_white_bg(image_path):
    try:
        img = Image.open(image_path)
        img = img.convert("RGBA")
        datas = img.getdata()

        new_data = []
        for item in datas:
            # Change all white (also shades of whites)
            # Find all pixels that are nearly white
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
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
    remove_white_bg(f)
