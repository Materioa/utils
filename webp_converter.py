import os
import uuid
import subprocess
from PIL import Image
import cairosvg

# Supported input formats
RASTER_FORMATS = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']
VECTOR_FORMATS = ['.svg']
VIDEO_FORMATS = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm']
SUPPORTED_FORMATS = RASTER_FORMATS + VECTOR_FORMATS + VIDEO_FORMATS

def convert_video_to_webm(input_path, output_folder=None):
    """Convert video to WebM format using ffmpeg."""
    output_filename = str(uuid.uuid4()) + '.webm'
    if output_folder is None:
        output_folder = os.path.dirname(input_path)
    output_path = os.path.join(output_folder, output_filename)

    try:
        # Use ffmpeg to convert video to WebM
        cmd = [
            'ffmpeg', '-i', input_path,
            '-c:v', 'libvpx-vp9',  # VP9 video codec
            '-c:a', 'libvorbis',   # Vorbis audio codec
            '-crf', '30',          # Quality setting (lower = better quality)
            '-b:v', '0',           # Variable bitrate
            '-b:a', '128k',        # Audio bitrate
            '-y',                  # Overwrite output file
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"Converted: {input_path} → {output_path}")
        else:
            print(f"Failed to convert {input_path}: {result.stderr}")
    
    except FileNotFoundError:
        print("Error: ffmpeg not found. Please install ffmpeg and add it to your PATH.")
    except Exception as e:
        print(f"Failed to convert {input_path}: {e}")


def convert_image_to_webp(input_path, output_folder=None):
    ext = os.path.splitext(input_path)[1].lower()

    if ext not in SUPPORTED_FORMATS:
        print(f"Skipped unsupported format: {input_path}")
        return

    # Generate UUID filename for output
    output_filename = str(uuid.uuid4()) + '.webp'
    if output_folder is None:
        output_folder = os.path.dirname(input_path)
    output_path = os.path.join(output_folder, output_filename)

    try:
        if ext in VIDEO_FORMATS:
            # Convert video to WebM
            convert_video_to_webm(input_path, output_folder)
            return
        elif ext in VECTOR_FORMATS:
            # Convert SVG to WEBP via PNG intermediate
            cairosvg.svg2png(url=input_path, write_to="temp.png")
            img = Image.open("temp.png").convert("RGBA")
            img.save(output_path, format="WEBP")
            os.remove("temp.png")
        else:
            # Convert raster formats to WEBP
            img = Image.open(input_path).convert("RGBA")
            img.save(output_path, format="WEBP")

        print(f"Converted: {input_path} → {output_path}")

    except Exception as e:
        print(f"Failed to convert {input_path}: {e}")


def convert_folder(folder_path, output_folder=None):
    if output_folder is None:
        output_folder = folder_path

    for root, _, files in os.walk(folder_path):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in SUPPORTED_FORMATS:
                input_file = os.path.join(root, file)
                convert_image_to_webp(input_file, output_folder=output_folder)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Convert images to WEBP and videos to WEBM format with UUID filenames.")
    parser.add_argument("path", help="Path to image file or folder.")
    parser.add_argument("-o", "--output", help="Output folder (optional). If not provided, saves next to input files.")
    args = parser.parse_args()

    if args.output and not os.path.exists(args.output):
        os.makedirs(args.output)

    if os.path.isdir(args.path):
        convert_folder(args.path, output_folder=args.output)
    elif os.path.isfile(args.path):
        convert_image_to_webp(args.path, output_folder=args.output)
    else:
        print("Invalid path.")
