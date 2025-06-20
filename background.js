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
				console.warn(
					"Error sending message to content script:",
					chrome.runtime.lastError.message,
				);

				// Try to inject the content script
				chrome.scripting
					.executeScript({
						target: { tabId: tab.id },
						files: ["content.js"],
					})
					.then(() => {
						// After injection, try sending the message again
						setTimeout(() => {
							chrome.tabs.sendMessage(tab.id, {
								action: "toggleTranscriptPanel",
							});
						}, 500);
					})
					.catch((error) => {
						console.error("Failed to inject content script:", error);
					});
			} else if (response) {
				console.log("Content script responded:", response.status);
			}
		},
	);
});

// Handle installation/update
chrome.runtime.onInstalled.addListener((details) => {
	if (details.reason === "install") {
		console.log("YouTube Transcript Extractor installed");
	} else if (details.reason === "update") {
		console.log(
			"YouTube Transcript Extractor updated to version",
			chrome.runtime.getManifest().version,
		);
	}
});

