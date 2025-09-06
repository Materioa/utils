import requests
import xml.etree.ElementTree as ET
import csv
import re

# Constants
BUCKET_URL = 'https://storage.googleapis.com/parul-tmp/'
BASE_URL = 'https://storage.googleapis.com/parul-tmp/'
XML_NAMESPACE = {'s3': 'http://doc.s3.amazonaws.com/2006-03-01'}
UUID_PATTERN = re.compile(r'^[0-9a-fA-F-]+-')

# Fetch XML
response = requests.get(BUCKET_URL)
root = ET.fromstring(response.content)

# Collect file entries
entries = []
total_bytes = 0

for i, content in enumerate(root.findall('s3:Contents', XML_NAMESPACE), start=1):
    key = content.find('s3:Key', XML_NAMESPACE).text
    generation = content.find('s3:Generation', XML_NAMESPACE).text
    meta_gen = content.find('s3:MetaGeneration', XML_NAMESPACE).text
    last_modified = content.find('s3:LastModified', XML_NAMESPACE).text
    etag = content.find('s3:ETag', XML_NAMESPACE).text.strip('"')
    size_bytes = int(content.find('s3:Size', XML_NAMESPACE).text)

    total_bytes += size_bytes

    # Clean filename
    clean_filename = UUID_PATTERN.sub('', key.split('/')[-1])
    full_url = BASE_URL + key

    entries.append([
        i,
        clean_filename,
        full_url,
        size_bytes,
        last_modified,
        etag,
        generation,
        meta_gen
    ])

# Convert size to readable format
def format_size(bytes_val):
    for unit in ['Bytes', 'KB', 'MB', 'GB', 'TB']:
        if bytes_val < 1024.0:
            return f"{bytes_val:.2f} {unit}"
        bytes_val /= 1024.0

total_size_str = format_size(total_bytes)

# Write to CSV
csv_file = 'gcs_file_list_full-2.csv'
with open(csv_file, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow([
        "Sr. No.", "File Name", "URL", "Size (Bytes)",
        "Last Modified", "ETag", "Generation", "MetaGeneration"
    ])
    writer.writerows(entries)
    writer.writerow([])  # empty line
    writer.writerow(["", "", "TOTAL SIZE", total_size_str])

print(f"✅ Saved {len(entries)} entries to '{csv_file}'")
print(f"📦 Total size of all files: {total_size_str}")
