import os
import json

def get_filenames_without_extension(path):
    filenames = []
    for root, dirs, files in os.walk(path):
        for file in files:
            filename_without_ext = os.path.splitext(file)[0]
            filenames.append(filename_without_ext)
    return filenames

if __name__ == "__main__":
    path = input("Enter the directory path: ").strip()

    if not os.path.isdir(path):
        print(json.dumps({"error": "Invalid directory path"}, indent=2))
    else:
        result = get_filenames_without_extension(path)
        print(json.dumps(result, indent=2))
