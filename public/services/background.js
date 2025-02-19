// a message listener;
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    console.log("Received message:", request);
    console.log("Sender:", sender);

    if (request.action === "openPdfTab" && request.link) {
      const newTabUrl = chrome.runtime.getURL(
        `index.html?pdf=${encodeURIComponent(request.link)}`
      );
      chrome.tabs.create({ url: newTabUrl });
    } else {
      console.warn("Unhandled message:", request);
    }
  } catch (error) {
    console.error("Error in message listener:", error);
  }

  // return true to indicate async response
  return true;
});
