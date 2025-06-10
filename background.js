// background.js
chrome.action.onClicked.addListener((tab) => {
  if (!tab.url.includes("youtube.com/watch")) {
    return;
  }

  chrome.tabs.sendMessage(
    tab.id,
    { action: "toggleTranscriptPanel" },
    (response) => {
      if (chrome.runtime.lastError) {
        // This can happen if the content script hasn't loaded yet or was blocked
        console.warn(
          "Error sending message to content script:",
          chrome.runtime.lastError.message,
        );
        // As a fallback, try injecting the script if it's not there.
        // This is more complex to manage state with existing injected scripts.
        // For simplicity, we assume content script is loaded if on the right page.
        // A better approach would be to inject on demand if not present.
        // chrome.scripting.executeScript({
        // target: { tabId: tab.id },
        // files: ['content.js']
        // }, () => {
        //    // After injection, try sending the message again
        //    chrome.tabs.sendMessage(tab.id, { action: "toggleTranscriptPanel" });
        // });
      } else if (response) {
        console.log("Content script responded:", response.status);
      }
    },
  );
});
