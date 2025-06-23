// background.js
chrome.action.onClicked.addListener((tab) => {
  // Only act on YouTube video pages
  if (!tab.url.includes("youtube.com/watch")) {
    // Show notification for non-YouTube pages
    chrome.notifications.create({
      type: "basic",
      title: "YouTube Transcript Extractor",
      message:
        "Please navigate to a YouTube video page to use the transcript feature.",
    });
    return;
  }

  // Send message to content script to toggle the dropdown
  chrome.tabs.sendMessage(
    tab.id,
    { action: "toggleTranscriptPanel" },
    (response) => {
      if (chrome.runtime.lastError) {
        // Content script might not be loaded yet
        console.error(
          "Error sending message to content script:",
          chrome.runtime.lastError.message
        );
      } else if (response) {
        console.log("Content script responded:", response.status);
      }
    }
  );
});

// Handle installation/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("YouTube Transcript Extractor installed");
  } else if (details.reason === "update") {
    console.log(
      "YouTube Transcript Extractor updated to version",
      chrome.runtime.getManifest().version
    );
  }
});
