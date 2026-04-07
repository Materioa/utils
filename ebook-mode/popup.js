document.getElementById('ebookBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Get selected font style
  const fontStyle = document.querySelector('input[name="fontStyle"]:checked').value;
  
  // Save preference
  chrome.storage.sync.set({ fontStyle });
  
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });
});
