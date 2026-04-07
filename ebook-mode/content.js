(() => {
  // Try to find content using multiple selectors
  let content = document.querySelector('.html-chunk');
  
  if (!content) {
    content = document.querySelector('main');
  }
  if (!content) {
    content = document.querySelector('article');
  }
  if (!content) {
    content = document.querySelector('.content');
  }
  
  if (!content) {
    return alert('Could not find content. The page may not be compatible with Ebook Mode.\n\nTry pages with: .html-chunk, main, article, or .content elements');
  }

  const win = window.open('', '_blank');
  if (!win) {
    return alert('Could not open new window. Please allow popups for this site.');
  }

  // Get selected font style from storage
  chrome.storage.sync.get(['fontStyle'], (result) => {
    const fontStyle = result.fontStyle || 'option1';
    
    // Collect all stylesheets
    const styles = [...document.styleSheets]
      .map(ss => {
        try {
          if (ss.href) {
            return `<link rel="stylesheet" href="${ss.href}">`;
          } else {
            // For inline styles
            return [...ss.cssRules]
              .map(r => `<style>${r.cssText}</style>`)
              .join('');
          }
        } catch (e) {
          // CORS or other errors - skip
          return '';
        }
      })
      .join('\n');

    // Get font CSS based on selection
    let fontCSS = '';
    if (fontStyle === 'option1') {
      fontCSS = `
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Playfair Display', serif;
        }
        body {
          font-family: 'Lora', 'Merriweather', 'Georgia', 'Cambria', serif;
        }
      `;
    } else if (fontStyle === 'option2') {
      fontCSS = `
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Source Serif Pro', serif;
        }
        body {
          font-family: 'Source Serif Pro', serif;
        }
      `;
    } else if (fontStyle === 'option3') {
      fontCSS = `
        h1, h2, h3, h4, h5, h6 {
          font-family: 'IBM Plex Sans', sans-serif;
        }
        body {
          font-family: 'Lora', 'Merriweather', 'Georgia', 'Cambria', serif;
        }
      `;
    } else if (fontStyle === 'option4') {
      fontCSS = `
        h1, h2, h3, h4, h5, h6 {
          font-family: 'EB Garamond', serif;
        }
        body {
          font-family: 'EB Garamond', serif;
        }
      `;
    } else if (fontStyle === 'option5') {
      fontCSS = `
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Inter', sans-serif;
        }
        body {
          font-family: 'Lora', 'Merriweather', 'Georgia', 'Cambria', serif;
        }
      `;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Ebook View</title>
          <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Merriweather:wght@400;700&family=Playfair+Display:wght@700;900&family=Source+Serif+Pro:wght@400;600;700&family=EB+Garamond:wght@400;600;700&family=Inter:wght@400;600;700&family=IBM+Plex+Sans:wght@400;600;700&display=swap" rel="stylesheet">
          ${styles}
          <style>
            /* Ebook layout overrides */
            * {
              box-sizing: border-box;
            }
            
            html, body {
              background: #fff;
              margin: 0;
              padding: 0;
              color: #333;
            }
            
            ${fontCSS}
            
            font-size: 16px;
            line-height: 1.8;
            }
            
            /* Font options - uncomment one heading combination below */
            
            /* Option 1: Classic - Playfair Display (headings) + Lora (body) */
            
            /* Option 2: Elegant - Source Serif Pro (both)
            */
            
            /* Option 3: Modern - IBM Plex Sans (headings) + Lora (body)
            */
            
            /* Option 4: Refined - EB Garamond (both)
            */
            
            /* Option 5: Clean - Inter (headings) + Lora (body)
            */
            
            .ebook {
              max-width: 900px;
              margin: 48px auto;
              padding: 48px;
              background: white;
              box-shadow: none;
            }
            
            /* Typography */
            h1, h2, h3, h4, h5, h6 {
              margin-top: 1.5em;
              margin-bottom: 0.5em;
              page-break-after: avoid;
              color: #000;
              line-height: 1.3;
            }
            
            h1 {
              font-size: 2em;
              margin-top: 2em;
            }
            
            h2 {
              font-size: 1.6em;
            }
            
            h3 {
              font-size: 1.3em;
            }
            
            p {
              margin: 1em 0;
              line-height: 1.8;
            }
            
            /* Images */
            img {
              max-width: 100%;
              height: auto;
              display: block;
              margin: 1.5em 0;
            }
            
            /* Code blocks */
            pre {
              overflow-wrap: break-word;
              page-break-inside: avoid;
              background: #f5f5f5;
              padding: 1em;
              border-radius: 4px;
              margin: 1.5em 0;
            }
            
            code {
              font-family: 'Courier New', monospace;
              font-size: 0.9em;
            }
            
            /* Lists */
            ul, ol {
              margin: 1em 0;
              padding-left: 2em;
            }
            
            li {
              margin: 0.5em 0;
            }
            
            /* Links */
            a {
              color: #0066cc;
              text-decoration: underline;
            }
            
            /* Blockquotes */
            blockquote {
              margin: 1.5em 0;
              padding-left: 1.5em;
              border-left: 4px solid #ddd;
              color: #666;
            }
            
            /* Tables */
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 1.5em 0;
            }
            
            th, td {
              border: 1px solid #ddd;
              padding: 0.75em;
              text-align: left;
            }
            
            th {
              background: #f5f5f5;
              font-weight: bold;
            }
            
            /* Print-friendly */
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .ebook {
                max-width: 100%;
                margin: 0;
                padding: 0;
                box-shadow: none;
              }
              a {
                color: #000;
              }
            }
          </style>
        </head>
        <body>
          <main class="ebook">
            ${content.outerHTML}
          </main>
        </body>
      </html>
    `);

    win.document.close();
    win.focus();
  });
})();
