# Ebook Mode Extension

A Chrome extension that converts web content into a clean, print-friendly ebook view.

## Features

- 📖 Opens web content in a new window with ebook-friendly formatting
- 🎨 Professional typography and spacing optimized for reading
- 🖨️ Print-friendly design (Ctrl+P / Cmd+P to print as PDF)
- 📱 Responsive layout that adapts to different screen sizes
- 🔗 Preserves links, images, and styling from the original page
- 📋 Automatically collects and applies stylesheets

## How It Works

1. Click the extension icon in your browser toolbar
2. Click "Open in Ebook Mode"
3. The extension extracts the main content from the page (looking for `.html-chunk`, `main`, `article`, or `.content` elements)
4. Opens a new window with clean ebook formatting
5. Optionally print to PDF using your browser's print function

## Content Detection

The extension attempts to find content using these selectors (in order):
- `.html-chunk` (primary selector)
- `main` (semantic HTML)
- `article` (semantic HTML)
- `.content` (common class name)

If none of these are found, you'll get an alert asking to try another page.

## Installation

1. Save this folder to your computer
2. Open `chrome://extensions/` in Chrome
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select the `ebook-mode` folder
6. The extension icon will appear in your toolbar

## Supported Content

Works best on:
- Blog posts and articles
- Documentation sites
- News articles
- Any page with semantic HTML structure

## Customization

Edit `content.js` to:
- Change the CSS styling for the ebook view
- Add custom fonts
- Adjust margins and spacing
- Modify color scheme

## Printing to PDF

1. Click the ebook button to open the ebook view
2. Press Ctrl+P (or Cmd+P on Mac)
3. Choose "Save as PDF"
4. Configure margins and page settings as desired

## License

See LICENSE file in the parent directory
