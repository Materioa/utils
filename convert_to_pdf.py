import os
import sys
import argparse
import subprocess
import tempfile
import glob
from pathlib import Path

# Try importing required libraries
try:
    import comtypes.client
    import pikepdf
    from fpdf import FPDF
except ImportError as e:
    print(f"Missing required library: {e}")
    print("Please install dependencies: pip install -r requirements.txt")
    sys.exit(1)

def convert_word_to_pdf(input_path, output_path):
    word = comtypes.client.CreateObject('Word.Application')
    word.Visible = False
    try:
        doc = word.Documents.Open(str(input_path))
        doc.SaveAs(str(output_path), FileFormat=17) # wdFormatPDF = 17
        doc.Close()
    finally:
        word.Quit()

def convert_ppt_to_pdf(input_path, output_path):
    powerpoint = comtypes.client.CreateObject('PowerPoint.Application')
    # PowerPoint often requires a window to be present to render
    try:
        presentation = powerpoint.Presentations.Open(str(input_path), WithWindow=False)
        presentation.SaveAs(str(output_path), 32) # ppSaveAsPDF = 32
        presentation.Close()
    finally:
        powerpoint.Quit()

def convert_txt_to_pdf(input_path, output_path):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            for line in f:
                # FPDF doesn't handle some unicode characters well in standard fonts
                # Replacing unsupported characters to prevent crash
                clean_line = line.encode('latin-1', 'replace').decode('latin-1')
                pdf.cell(0, 10, txt=clean_line.strip(), ln=1, align='L')
    except UnicodeDecodeError:
        # Fallback for non-utf8
        with open(input_path, 'r', encoding='latin-1') as f:
            for line in f:
                pdf.cell(0, 10, txt=line.strip(), ln=1, align='L')
                
    pdf.output(str(output_path))

def compress_pdf_ghostscript(input_path, output_path, level):
    """
    Compress PDF using Ghostscript.
    Levels:
    - extreme: /screen (72 dpi)
    - normal: /ebook (150 dpi)
    - minimal: /printer (300 dpi)
    """
    gs_settings = {
        'extreme': '/screen',
        'normal': '/ebook',
        'minimal': '/printer'
    }
    
    setting = gs_settings.get(level, '/default')
    
    # Check for ghostscript executable (Windows: gswin64c or gswin32c, Linux/Mac: gs)
    gs_cmd = None
    if os.name == 'nt':
        for cmd in ['gswin64c', 'gswin32c', 'gs']:
            if shutil.which(cmd):
                gs_cmd = cmd
                break
    else:
        gs_cmd = 'gs'

    if not gs_cmd and os.name == 'nt':
        # Fallback check common install paths if not in PATH
        common_paths = [
            r"C:\Program Files\gs\gs*\bin\gswin64c.exe",
            r"C:\Program Files (x86)\gs\gs*\bin\gswin32c.exe"
        ]
        for pattern in common_paths:
            matches = glob.glob(pattern)
            if matches:
                gs_cmd = matches[0]
                break

    if not gs_cmd:
        print("Warning: Ghostscript not found. Skipping compression.")
        return False

    try:
        cmd = [
            gs_cmd, '-sDEVICE=pdfwrite', '-dCompatibilityLevel=1.4',
            f'-dPDFSETTINGS={setting}',
            '-dNOPAUSE', '-dQUIET', '-dBATCH',
            f'-sOutputFile={output_path}',
            str(input_path)
        ]
        subprocess.run(cmd, check=True)
        return True
    except Exception as e:
        print(f"Ghostscript compression failed: {e}")
        return False

import shutil

def process_file(input_file, args):
    input_path = Path(input_file).resolve()
    if not input_path.exists():
        print(f"File not found: {input_path}")
        return

    # Skip if already PDF
    if input_path.suffix.lower() == '.pdf':
        print(f"Skipping PDF: {input_path.name}")
        return

    output_pdf_path = input_path.with_suffix('.pdf')
    temp_pdf = Path(tempfile.gettempdir()) / f"temp_{input_path.stem}_{os.urandom(4).hex()}.pdf"
    compressed_pdf = Path(tempfile.gettempdir()) / f"comp_{input_path.stem}_{os.urandom(4).hex()}.pdf"
    
    ext = input_path.suffix.lower()
    converted = False
    
    print(f"Processing: {input_path.name} -> {output_pdf_path.name}")

    try:
        # 1. Conversion
        if ext in ['.doc', '.docx']:
            convert_word_to_pdf(input_path, temp_pdf)
            converted = True
        elif ext in ['.ppt', '.pptx']:
            convert_ppt_to_pdf(input_path, temp_pdf)
            converted = True
        elif ext in ['.txt', '.log', '.ini', '.md']:
            convert_txt_to_pdf(input_path, temp_pdf)
            converted = True
        else:
            print(f"Unsupported format: {ext}")
            return

        if not temp_pdf.exists():
            print("Conversion failed to generate output file.")
            return

        current_pdf = temp_pdf

        # 2. Compression (Optional)
        if args.compression:
            print(f"  Compressing ({args.compression})...")
            if compress_pdf_ghostscript(temp_pdf, compressed_pdf, args.compression):
                current_pdf = compressed_pdf
            else:
                print("  Compression skipped (Ghostscript missing or failed).")

        # 3. Metadata and Linearization
        print("  Applying metadata and saving...")
        try:
            with pikepdf.open(current_pdf) as pdf:
                with pdf.open_metadata() as meta:
                    meta['dc:creator'] = ['Materio']
                
                # Standard PDF Info dictionary
                pdf.docinfo['/Author'] = 'Materio'
                pdf.docinfo['/Producer'] = 'materio-files-pipeline'
                
                pdf.save(output_pdf_path, linearize=args.linearize)
        except Exception as e:
            print(f"  Error applying metadata/linearization: {e}")
            # Fallback: just copy the converted file if pikepdf fails
            shutil.copy(current_pdf, output_pdf_path)

        print(f"  Success: {output_pdf_path}")

    except Exception as e:
        print(f"  Error processing {input_path.name}: {e}")
    finally:
        # Cleanup
        if temp_pdf.exists(): 
            try: temp_pdf.unlink() 
            except: pass
        if compressed_pdf.exists(): 
            try: compressed_pdf.unlink() 
            except: pass

def main():
    parser = argparse.ArgumentParser(description="Convert files to PDF with metadata and optimization.")
    parser.add_argument('inputs', nargs='+', help='Files or directories to convert')
    parser.add_argument('--linearize', action='store_true', help='Enable Fast Web View (Linearization)')
    parser.add_argument('--compression', choices=['extreme', 'normal', 'minimal'], help='Compression level (requires Ghostscript)')
    
    args = parser.parse_args()
    
    files_to_process = []
    
    for inp in args.inputs:
        path = Path(inp)
        if path.is_file():
            files_to_process.append(path)
        elif path.is_dir():
            # Recursive search for supported files
            extensions = ['*.doc', '*.docx', '*.ppt', '*.pptx', '*.txt']
            for ext in extensions:
                files_to_process.extend(path.rglob(ext))
    
    # Remove duplicates
    files_to_process = list(set(files_to_process))
    
    if not files_to_process:
        print("No supported files found.")
        return

    print(f"Found {len(files_to_process)} files to process.")
    for f in files_to_process:
        process_file(f, args)

if __name__ == "__main__":
    main()
