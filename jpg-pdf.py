import os
from PIL import Image
import pytesseract
import fitz  # PyMuPDF

ROOT_DIR = r"C:\Users\Jinansh\Desktop\Python\download\PPTs-as-JPG"  


def convert_images_to_ocr_pdf(image_dir, output_pdf_path):
    pdf = fitz.open()

    image_files = sorted(
        [f for f in os.listdir(image_dir) if f.lower().endswith(".jpg")],
        key=lambda x: int(''.join(filter(str.isdigit, x)) or 0)
    )

    for img_file in image_files:
        img_path = os.path.join(image_dir, img_file)
        image = Image.open(img_path)

        # OCR to get text overlay
        text = pytesseract.image_to_pdf_or_hocr(image, extension='pdf')

        # Load OCR PDF page into PyMuPDF
        pdf_bytes = fitz.open("pdf", text)
        page = pdf_bytes[0]

        pdf.insert_pdf(pdf_bytes)

    pdf.save(output_pdf_path)
    pdf.close()
    print(f"✅ Created: {output_pdf_path}")

# Traverse subdirectories
for subdir in os.listdir(ROOT_DIR):
    subdir_path = os.path.join(ROOT_DIR, subdir)
    if os.path.isdir(subdir_path):
        output_pdf = os.path.join(ROOT_DIR, f"{subdir}.pdf")
        convert_images_to_ocr_pdf(subdir_path, output_pdf)
