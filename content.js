// @ts-check
let lastTranscript = "";

const getTranscriptButtonContainer = () => {
  return document.querySelector("#yt-transcript-button-container");
}

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

// Copy text to clipboard
async function copyToClipboard(text) {
  if (!text) {
    throw new Error("No transcript to copy");
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error("Failed to copy text: ", err);

    throw err;
  }
}

// Download text as file
function downloadAsFile(text, filename) {
  if (!text) {
    throw new Error("No transcript to download");
  }

  try {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Failed to download file: ", err);
    throw err;
  }
}

// Fetch transcript from YouTube's native transcript panel
async function fetchTranscript() {
  try {
    lastTranscript = "";

    // Check if transcript panel is already open
    const transcriptContainerSelector =
      ".ytd-transcript-segment-list-renderer#segments-container";
    let transcriptContainer = document.querySelector(
      transcriptContainerSelector
    );

    // If transcript panel is not open, try to open it
    if (!transcriptContainer || !transcriptContainer?.offsetParent) {
      // Look for the "Show transcript" button
      const showTranscriptButtonSelector =
        '#primary-button > ytd-button-renderer > yt-button-shape > button[aria-label="Show transcript"]';
      const showTranscriptButton = await waitForElement(
        showTranscriptButtonSelector,
        3000
      );

      if (showTranscriptButton) {
        showTranscriptButton.click();
      } else {
        throw new Error(
          "Could not find 'Show transcript' button. Make sure transcript is available for this video."
        );
      }

      // Wait for transcript panel to load
      transcriptContainer = await waitForElement(
        transcriptContainerSelector,
        5000
      );
      if (!transcriptContainer) {
        throw new Error(
          "Transcript panel did not load. Transcript may not be available for this video."
        );
      }
    }

    // Extract transcript text
    lastTranscript = transcriptContainer.innerText;

    if (!lastTranscript || lastTranscript.trim() === "") {
      throw new Error("Transcript is empty or not available.");
    }

    return lastTranscript;
  } catch (error) {
    console.error("Error fetching transcript:", error);
    return null;
  }
}

const showStatus = (type) => {
  // Get status elements from main button
  const container = getTranscriptButtonContainer()

  const spinner = container?.querySelector(
    ".yt-transcript-status-spinner"
  );
  const successIcon = container?.querySelector(
    ".yt-transcript-status-success"
  );
  const errorIcon = container?.querySelector(
    ".yt-transcript-status-error"
  );

  if (spinner) {
    spinner.style.display = type === "loading" ? "block" : "none";
  }
  if (successIcon) {
    successIcon.style.display = type === "success" ? "block" : "none";
  }
  if (errorIcon) {
    errorIcon.style.display = type === "error" ? "block" : "none";
  }

  if (type !== "loading") {
    setTimeout(() => {
      if (spinner) {
        spinner.style.display = "none";
      }
      if (successIcon) {
        successIcon.style.display = "none";
      }
      if (errorIcon) {
        errorIcon.style.display = "none";
      }
    }, 2000);
  }
};

// Create transcript button in YouTube UI
function createTranscriptButton() {
  if (getTranscriptButtonContainer()) return; // Already exists

  // target container to be available
  const container = document.querySelector(
    "#menu > ytd-menu-renderer.ytd-watch-metadata"
  );

  if (!container) return;

  // Create button container
  const transcriptButtonContainer = document.createElement("div");
  transcriptButtonContainer.className = "yt-transcript-button-container";
  transcriptButtonContainer.id = "yt-transcript-button-container";

  // Create the main transcript button
  transcriptButtonContainer.innerHTML = ` 
        <button class="yt-transcript-dropdown-item yt-transcript-button" data-action="download" title="Download Trasncript">
          <svg class="yt-transcript-icon" fill="none" stroke-width="1.5" viewBox="0 0 24 24" swidth="16" height="16"  stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m-6 3.75 3 3m0 0 3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75" />
          </svg>
        </button>
         <button class="yt-transcript-dropdown-item yt-transcript-button" data-action="copy" title="Copy Transcript">
          <svg class="yt-transcript-icon" viewBox="0 0 24 24" width="16" height="16">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" fill="currentColor"/>
            <path d="M12 14L8 18L10.5 20.5L12 19L15.5 22.5L17 21L12 14Z" fill="currentColor"/>
          </svg>
         </button>
        <div class="yt-transcript-status-container">
          <svg class="yt-transcript-status-spinner" style="display: none;" viewBox="0 0 24 24" width="16" height="16">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="60" stroke-dashoffset="60" class="yt-transcript-spinner-circle"/>
          </svg>
          <svg class="yt-transcript-status-success" style="display: none;" viewBox="0 0 24 24" width="16" height="16">
            <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z" fill="currentColor"/>
          </svg>
          <svg class="yt-transcript-status-error" style="display: none;" viewBox="0 0 24 24" width="16" height="16">
            <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" fill="currentColor"/>
          </svg>
        </div>
      `;

  // Handle dropdown item clicks
  transcriptButtonContainer.addEventListener("click", async (e) => {
    e.stopPropagation();

    const target = e.target;
    if (!target) return;

    const item = e.target.closest(".yt-transcript-dropdown-item");
    if (!item) return;

    const action = item.getAttribute("data-action");

    try {
      switch (action) {
        case "copy": {
          showStatus("loading");

          if (!lastTranscript) {
            await fetchTranscript();
          }

          if (lastTranscript) {
            await copyToClipboard(lastTranscript);
            showStatus("success");
          }
          break;
        }

        case "download": {
          showStatus("loading");

          if (!lastTranscript) {
            await fetchTranscript();
          }

          if (lastTranscript) {
            const videoTitle = document.title
              .replace(" - YouTube", "")
              .replace(/[<>:"/\\|?*]+/g, "_");
            downloadAsFile(lastTranscript, `${videoTitle}_transcript.txt`);
            showStatus("success");
          }
          break;
        }
      }
    } catch (error) {
      console.log(error);
      showStatus("error");
    }
  });

  container.prepend(transcriptButtonContainer);

  addButtonStyles();
}

// Add styles for the button and dropdown
function addButtonStyles() {
  const existingStyles = document.getElementById("yt-transcript-styles");
  if (existingStyles) return;

  const style = document.createElement("style");
  style.id = "yt-transcript-styles";
  style.textContent = `
    .yt-transcript-button-container {
      margin-right: 8px;
      display: flex;
      align-items: center;
      border: 1px solid var(--yt-spec-outline);
      border-radius: 18px;
      gap:6px;
      padding: 4px 10px;
    }

    .yt-transcript-button {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
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

       .yt-transcript-button-container.show .yt-transcript-dropdown-arrow {
      transform: rotate(180deg);
    }

    .yt-transcript-spinner {
      flex-shrink: 0;
    }

    .yt-transcript-spinner-circle {
      animation: yt-transcript-spin 1s linear infinite;
    }

    .yt-transcript-status-container {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .yt-transcript-status-success {
      color: #00a550;
    }

    .yt-transcript-status-error {
      color: #ff0000;
    }

    @keyframes yt-transcript-spin {
      from {
        stroke-dashoffset: 60;
      }
      to {
        stroke-dashoffset: 0;
      }
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
  // Check if button already exists to avoid duplicates
  if (document.getElementById("yt-transcript-button-container")) {
    console.log("already exists");

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
    const container = getTranscriptButtonContainer() 
    if (container) {
      container.remove();
      localStorage.setItem("show_transcript_buttons", "false");
    } else {
      localStorage.setItem("show_transcript_buttons", "true");
      init();
    }

    sendResponse({ status: "YT transcript toggled" });
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
    lastTranscript = "";

    // Re-initialize
    setTimeout(init, 1000);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
