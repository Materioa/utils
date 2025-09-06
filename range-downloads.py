import requests
import os
import re

# Get user input
base_url = input("Enter the URL pattern (use {} for placeholder): ")
filename_pattern = input("Enter the filename pattern (use {} for placeholder): ")

# Extract range from user
start_page = int(input("Enter starting page number: "))
end_page = int(input("Enter ending page number: "))

# Target save directory
save_dir = r"C:\Users\Jinansh\Desktop\Python\download"
os.makedirs(save_dir, exist_ok=True)

for i in range(start_page, end_page + 1): 
    url = base_url.format(i)
    response = requests.get(url)

    if response.status_code == 200:
        filename = filename_pattern.format(i)
        file_path = os.path.join(save_dir, filename)
        with open(file_path, "wb") as f:
            f.write(response.content)
        print(f"Downloaded {filename}")
    else:
        print(f"Failed to download page {i} (Status: {response.status_code})")

print("Saved in:", save_dir)
