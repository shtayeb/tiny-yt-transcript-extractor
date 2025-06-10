// content.js
let transcriptButton = null;
let transcriptDropdown = null;
let lastTranscript = "";
let includeTimestamps = true;

// Utility function to wait for an element to appear
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(null); // Return null instead of rejecting
    }, timeout);
  });
}

// Show notification to user
function showNotification(message, type = "info") {
  // Remove existing notification if any
  const existingNotification = document.getElementById(
    "yt-transcript-notification",
  );
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement("div");
  notification.id = "yt-transcript-notification";
  notification.className = `yt-transcript-notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Auto remove after 3 seconds
  setTimeout(() => {
    if (notification?.parentNode) {
      notification.remove();
    }
  }, 3000);
}

// Copy text to clipboard
async function copyToClipboard(text) {
  if (!text) {
    showNotification("No transcript to copy", "error");
    return;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      showNotification("Transcript copied to clipboard!", "success");
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      textArea.remove();

      if (successful) {
        showNotification("Transcript copied to clipboard!", "success");
      } else {
        throw new Error("Copy command failed");
      }
    }
  } catch (err) {
    console.error("Failed to copy text: ", err);
    showNotification("Failed to copy transcript", "error");
  }
}

// Download text as file
function downloadAsFile(text, filename) {
  if (!text) {
    showNotification("No transcript to download", "error");
    return;
  }

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showNotification("Transcript downloaded!", "success");
}

// Fetch transcript from YouTube's native transcript panel
async function fetchTranscript(withTimestamps = true) {
  try {
    showNotification("Fetching transcript...", "info");
    lastTranscript = "";

    // Check if transcript panel is already open
    const transcriptContainerSelector =
      ".ytd-transcript-segment-list-renderer#segments-container";
    let transcriptContainer = document.querySelector(
      transcriptContainerSelector,
    );

    // If transcript panel is not open, try to open it
    if (!transcriptContainer || !transcriptContainer.offsetParent) {
      showNotification("Opening transcript panel...", "info");

      // Look for the "Show transcript" button
      const showTranscriptButtonSelector =
        '#primary-button > ytd-button-renderer > yt-button-shape > button[aria-label="Show transcript"]';
      const showTranscriptButton = await waitForElement(
        showTranscriptButtonSelector,
        3000,
      );

      if (showTranscriptButton) {
        showTranscriptButton.click();
      } else {
        throw new Error(
          "Could not find 'Show transcript' button. Make sure transcript is available for this video.",
        );
      }

      // Wait for transcript panel to load
      transcriptContainer = await waitForElement(
        transcriptContainerSelector,
        5000,
      );
      if (!transcriptContainer) {
        throw new Error(
          "Transcript panel did not load. Transcript may not be available for this video.",
        );
      }
    }

    // Toggle timestamps if needed
    if (!withTimestamps) {
      const transcriptMenuButton = await waitForElement(
        "yt-icon-button#menu-button",
        3000,
      );

      if (transcriptMenuButton) {
        transcriptMenuButton.click();

        // Wait for menu to appear
        const menuItems = await waitForElement(
          "#items.ytd-menu-popup-renderer",
          2000,
        );

        if (menuItems) {
          const items = menuItems.querySelectorAll(
            "ytd-menu-service-item-renderer tp-yt-paper-item",
          );
          for (const item of items) {
            const text = item.textContent.trim().toLowerCase();
            if (
              text.includes("toggle timestamps") ||
              text.includes("hide timestamps")
            ) {
              item.click();
              await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for toggle
              break;
            }
          }
        }
      }
    }

    // Re-fetch container after potential timestamp toggle
    transcriptContainer = document.querySelector(transcriptContainerSelector);
    if (!transcriptContainer) {
      throw new Error("Transcript container not found after operations.");
    }

    // Extract transcript text
    const rawTranscript = transcriptContainer.innerText;

    if (!rawTranscript || rawTranscript.trim() === "") {
      throw new Error("Transcript is empty or not available.");
    }

    // Clean up transcript text
    lastTranscript = rawTranscript.replace(/\n\s*\n/g, "\n").trim();

    showNotification("Transcript fetched successfully!", "success");
    return lastTranscript;
  } catch (error) {
    console.error("Error fetching transcript:", error);
    showNotification(`Error: ${error.message}`, "error");
    return null;
  }
}

// Create transcript button in YouTube UI
function createTranscriptButton() {
  if (transcriptButton) return; // Already exists

  // Wait for the target container to be available
  waitForElement("#menu > ytd-menu-renderer.ytd-watch-metadata")
    .then((container) => {
      // Create button container
      const buttonContainer = document.createElement("div");
      buttonContainer.className = "yt-transcript-button-container";

      // Create the main transcript button
      transcriptButton = document.createElement("button");
      transcriptButton.id = "yt-transcript-button";
      transcriptButton.className = "yt-transcript-button";
      transcriptButton.innerHTML = `
        <svg class="yt-transcript-icon" viewBox="0 0 24 24" width="16" height="16">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" fill="currentColor"/>
          <path d="M12 14L8 18L10.5 20.5L12 19L15.5 22.5L17 21L12 14Z" fill="currentColor"/>
        </svg>
        <span>Transcript</span>
        <svg class="yt-transcript-dropdown-arrow" viewBox="0 0 24 24" width="12" height="12">
          <path d="M7 10L12 15L17 10H7Z" fill="currentColor"/>
        </svg>
      `;

      // Create dropdown menu
      transcriptDropdown = document.createElement("div");
      transcriptDropdown.id = "yt-transcript-dropdown";
      transcriptDropdown.className = "yt-transcript-dropdown";
      transcriptDropdown.innerHTML = `
        <div class="yt-transcript-dropdown-item" data-action="copy">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" fill="currentColor"/>
          </svg>
          Copy
        </div>
        <div class="yt-transcript-dropdown-item" data-action="download">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" fill="currentColor"/>
          </svg>
          Download
        </div>
        <div class="yt-transcript-dropdown-item timestamp-option">
          <input type="checkbox" id="yt-transcript-timestamps-checkbox" checked>
          <label for="yt-transcript-timestamps-checkbox">Include Timestamps</label>
        </div>
      `;

      buttonContainer.appendChild(transcriptButton);
      buttonContainer.appendChild(transcriptDropdown);
      container.appendChild(buttonContainer);

      addButtonStyles();
      addButtonEventListeners();
    })
    .catch((error) => {
      console.error("Failed to inject transcript button:", error);
    });
}

// Add event listeners to the button and dropdown
function addButtonEventListeners() {
  if (!transcriptButton || !transcriptDropdown) return;

  // Toggle dropdown on button click
  transcriptButton.addEventListener("click", (e) => {
    e.stopPropagation();
    transcriptDropdown.classList.toggle("show");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".yt-transcript-button-container")) {
      transcriptDropdown.classList.remove("show");
    }
  });

  // Handle dropdown item clicks
  transcriptDropdown.addEventListener('click', async (e) => {
    e.stopPropagation();
    const item = e.target.closest('.yt-transcript-dropdown-item');
    if (!item) return;

    // Don't close dropdown for timestamp checkbox
    if (!item.classList.contains('timestamp-option')) {
      transcriptDropdown.classList.remove('show');
    }

    const action = item.getAttribute('data-action');
    
    switch (action) {
      case 'copy': {
        if (!lastTranscript) {
          await fetchTranscript(includeTimestamps);
        }
        copyToClipboard(lastTranscript);
        break;
      }
        
      case 'download': {
        if (!lastTranscript) {
          await fetchTranscript(includeTimestamps);
        }
        const videoTitle = document.title
          .replace(" - YouTube", "")
          .replace(/[<>:"/\\|?*]+/g, "_");
        downloadAsFile(lastTranscript, `${videoTitle}_transcript.txt`);
        break;
      }
    }
  });

  // Handle timestamp checkbox changes
  const timestampCheckbox = transcriptDropdown.querySelector('#yt-transcript-timestamps-checkbox');
  if (timestampCheckbox) {
    timestampCheckbox.addEventListener('change', async (e) => {
      e.stopPropagation();
      includeTimestamps = timestampCheckbox.checked;
      // Re-fetch transcript with new timestamp setting if we already have one
      if (lastTranscript) {
        await fetchTranscript(includeTimestamps);
      }
    });
  }
}

// Add styles for the button and dropdown
function addButtonStyles() {
  const existingStyles = document.getElementById("yt-transcript-styles");
  if (existingStyles) return;

  const style = document.createElement("style");
  style.id = "yt-transcript-styles";
  style.textContent = `
    .yt-transcript-button-container {
      position: relative;
      display: inline-block;
      margin-left: 8px;
    }

    .yt-transcript-button {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: transparent;
      border: 1px solid var(--yt-spec-outline);
      border-radius: 18px;
      color: var(--yt-spec-text-primary);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .yt-transcript-button:hover {
      background: var(--yt-spec-badge-chip-background);
      border-color: var(--yt-spec-outline-hover);
    }

    .yt-transcript-icon {
      flex-shrink: 0;
    }

    .yt-transcript-dropdown-arrow {
      flex-shrink: 0;
      transition: transform 0.2s ease;
    }

    .yt-transcript-button-container.show .yt-transcript-dropdown-arrow {
      transform: rotate(180deg);
    }

    .yt-transcript-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      min-width: 160px;
      background: var(--yt-spec-raised-background);
      border: 1px solid var(--yt-spec-outline);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-8px);
      transition: all 0.2s ease;
      margin-top: 4px;
    }

    .yt-transcript-dropdown.show {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .yt-transcript-dropdown-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      color: var(--yt-spec-text-primary);
      font-size: 14px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .yt-transcript-dropdown-item:hover {
      background: var(--yt-spec-touch-response);
    }

    .yt-transcript-dropdown-item:first-child {
      border-radius: 8px 8px 0 0;
    }

    .yt-transcript-dropdown-item:last-child {
      border-radius: 0 0 8px 8px;
    }

    .yt-transcript-dropdown-item svg {
      flex-shrink: 0;
    }
    
    .yt-transcript-dropdown-item.timestamp-option {
      gap: 8px;
      align-items: center;
    }
    
    .yt-transcript-dropdown-item.timestamp-option input[type="checkbox"] {
      margin: 0;
      width: 16px;
      height: 16px;
      cursor: pointer;
    }
    
    .yt-transcript-dropdown-item.timestamp-option label {
      cursor: pointer;
      flex-grow: 1;
      user-select: none;
    }

    .yt-transcript-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideIn 0.3s ease;
    }

    .yt-transcript-notification.info {
      background: var(--yt-spec-brand-button-text);
    }

    .yt-transcript-notification.success {
      background: #00a550;
    }

    .yt-transcript-notification.error {
      background: #ff0000;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    /* Dark theme support */
    html[dark] .yt-transcript-button {
      border-color: rgba(255, 255, 255, 0.2);
    }

    html[dark] .yt-transcript-button:hover {
      border-color: rgba(255, 255, 255, 0.3);
    }
  `;

  document.head.appendChild(style);
}

// Initialize the extension
function init() {
  // Only run on YouTube video pages
  if (!window.location.href.includes("youtube.com/watch")) {
    console.log("YT Transcript Fetcher: Not a YouTube video page.");
    return;
  }

  // Check if button already exists to avoid duplicates
  if (document.getElementById("yt-transcript-button")) {
    return;
  }

  console.log("YT Transcript Fetcher: Initializing on video page.");

  // Create transcript button with a delay to ensure YouTube UI is loaded
  setTimeout(() => {
    createTranscriptButton();
  }, 1000);
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleTranscriptPanel") {
    // For compatibility, we'll just show/hide the dropdown
    if (transcriptDropdown) {
      transcriptDropdown.classList.toggle("show");
    }
    sendResponse({ status: "Dropdown toggled" });
  }
});

// Initialize when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Re-initialize on navigation (YouTube SPA behavior)
let currentUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    // Reset state
    transcriptButton = null;
    transcriptDropdown = null;
    lastTranscript = "";
    // Re-initialize
    setTimeout(init, 1000);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
