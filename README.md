# Utility Scripts for Downloading, Managing and Manipulating files

- [Directory in JSON](/dir-json.py) - This script lists all files in a directory in json format without file-extentions
- [Download files in Ranges](/range-downloads.py) - This script is used to download all images that came as a range sequence by network call upon opening PPT file on PU-LMS site (index starts from 0. So, if there are 28 images in request range will be 0-27).
- [JPG to PDF Converter](/jpg-pdf.py) - Used to compile all the images downloaded by above script into pdf file.
- [List all files in GCP](/list_gcs_files.py) - Used to index all files of any open google cloud bucket and make it into a csv file with all details like filename, size, date etc. It also gives summed up size of all the files in the bucket.
- [WebP / WebM converter](/webp_converter.py) - Used to convert any image/video format into webp or webm - optimises for web streaming.
- [Convert to PDF](/convert_to_pdf.py) - Converts any filetype to pdf with options to linearize and compression levels of extreme, normal and minimal.

## Setup Custom CLI Commands (PowerShell)

To run these scripts easily from any location, you can add functions to your PowerShell profile.

1. Open your PowerShell profile:
   ```powershell
   notepad $PROFILE
   ```

2. Add the following function (update the path to match your local repository location):

   ```powershell
   # Convert to PDF
   function makepdf {
       if ($args[0] -eq 'here') {
           $restArgs = $args | Select-Object -Skip 1
           python "D:\path\to\utils\convert_to_pdf.py" . $restArgs
       } else {
           python "D:\path\to\utils\convert_to_pdf.py" $args
       }
   }

   # WebP Converter
   function webo {
       if ($args[0] -eq 'here') {
           python "D:\path\to\utils\webp_converter.py" .
       } else {
           python "D:\path\to\utils\webp_converter.py" $args
       }
   }

   # Directory to JSON
   function dirjson {
       python "D:\path\to\utils\dir-json.py"
   }

   # JPG to PDF
   function jpg2pdf {
       python "D:\path\to\utils\jpg-pdf.py"
   }

   # List GCS Files
   function gcslist {
       python "D:\path\to\utils\list_gcs_files.py"
   }

   # Range Downloads
   function rangedl {
       python "D:\path\to\utils\range-downloads.py"
   }
   ```

3. Save and reload your profile:
   ```powershell
   . $PROFILE
   ```

## Usage Examples

Once set up, you can use the commands like this:

### makepdf
Converts files in the current directory to PDF.
```powershell
# Run in current directory with options
makepdf here --linearize --compression [option]

# Run on a specific directory without options
makepdf "C:\path\to\files" 
OR 
# with options
makepdf "C:\path\to\files" --linearize --compression [option]
```

### webo
Converts images/videos to WebP/WebM.
```powershell
# Run in current directory
webo here

# Run on a specific file or folder
webo "C:\path\to\image.jpg"
```

### Other Commands
```powershell
# Generate JSON of directory contents
dirjson

# Convert JPGs to PDF
jpg2pdf

# List GCS bucket files
gcslist

# Download range of files
rangedl
```

---
Author: Jinansh Mehta for Materio - 2026
