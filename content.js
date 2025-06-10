(() => {
  let extensionPanel = null; // To hold our UI panel
  let lastTranscript = ""; // To store the last fetched transcript

  // --- Helper Functions ---

  /**
   * Waits for an element to appear in the DOM.
   * @param {string} selector - The CSS selector.
   * @param {Element} parent - The parent element to search within (default: document).
   * @param {number} timeout - Max time to wait in ms.
   * @returns {Promise<Element|null>}
   */
  function waitForElement(selector, parent = document, timeout = 10000) {
    return new Promise((resolve) => {
      const intervalTime = 100;
      let elapsedTime = 0;
      const interval = setInterval(() => {
        const element = parent.querySelector(selector);
        if (element) {
          clearInterval(interval);
          resolve(element);
        } else if (elapsedTime >= timeout) {
          clearInterval(interval);
          resolve(null); // Element not found within timeout
        }
        elapsedTime += intervalTime;
      }, intervalTime);
    });
  }

  /**
   * Shows a temporary notification message.
   * @param {string} message - The message to display.
   * @param {'success'|'error'|'info'} type - Type of message for styling.
   * @param {number} duration - How long to show the message in ms.
   */
  function showNotification(message, type = "info", duration = 3000) {
    if (!extensionPanel) return; // Don't show if panel isn't there

    const notificationArea = extensionPanel.querySelector(
      ".yt-transcript-fetcher-status",
    );
    if (!notificationArea) {
      console.warn("Notification area not found in panel.");
      alert(`[YT Transcript] ${type.toUpperCase()}: ${message}`); // Fallback
      return;
    }

    notificationArea.textContent = message;
    notificationArea.className = `yt-transcript-fetcher-status yt-transcript-fetcher-${type}`; // for styling
    notificationArea.style.display = "block";

    setTimeout(() => {
      notificationArea.style.display = "none";
      notificationArea.textContent = "";
    }, duration);
  }

  /**
   * Copies text to the clipboard.
   * @param {string} text - The text to copy.
   */
  async function copyToClipboard(text) {
    if (!text) {
      showNotification("Nothing to copy.", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showNotification("Transcript copied to clipboard!", "success");
    } catch (err) {
      console.error("Failed to copy text: ", err);
      showNotification("Failed to copy. See console for details.", "error");
      // Fallback for older browsers or if navigator.clipboard is not available (e.g. insecure context)
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed"; // Prevent scrolling to bottom of page in MS Edge.
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        showNotification("Transcript copied (fallback method)!", "success");
      } catch (execErr) {
        console.error("Fallback copy failed: ", execErr);
        showNotification("Copying failed. Please copy manually.", "error");
      }
      document.body.removeChild(textArea);
    }
  }

  /**
   * Downloads text as a .txt file.
   * @param {string} text - The text content.
   * @param {string} filename - The desired filename.
   */
  function downloadAsFile(text, filename = "transcript.txt") {
    if (!text) {
      showNotification("Nothing to download.", "error");
      return;
    }
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification(`Transcript downloaded as ${filename}`, "success");
  }

  // --- Core Transcript Logic ---

  async function fetchTranscript(shouldToggleTimestamps) {
    showNotification("Fetching transcript...", "info", 5000); // Longer duration for fetching
    lastTranscript = ""; // Reset

    // 1. Find and click the "More actions" (three dots) button if transcript panel is not already open
    const transcriptContainerSelector =
      ".ytd-transcript-segment-list-renderer#segments-container";
    let transcriptContainer = document.querySelector(
      transcriptContainerSelector,
    );

    const showTranscriptButtonSelector =
      '#primary-button > ytd-button-renderer > yt-button-shape > button[aria-label="Show transcript"]'; // English, Russian common
    // More robust: find by menu item text if the direct button isn't easily selectable or language dependent

    if (!transcriptContainer || !transcriptContainer.offsetParent) {
      // offsetParent is null if hidden
      showNotification(
        "Transcript panel not open. Attempting to open...",
        "info",
      );

      // Try direct show transcript button as per original script
      const directShowTranscriptButton = await waitForElement(
        showTranscriptButtonSelector,
        document,
        3000,
      );

      if (directShowTranscriptButton) {
        directShowTranscriptButton.click();
      } else {
        showNotification(
          "Could not find 'More actions' or 'Show transcript' button.",
          "error",
        );
        return null;
      }

      // Wait for transcript panel to actually load its content
      transcriptContainer = await waitForElement(
        transcriptContainerSelector,
        document,
        5000,
      );
      if (!transcriptContainer) {
        showNotification(
          "Transcript panel did not load after clicking 'Show transcript'.",
          "error",
        );
        return null;
      }
    } else {
      showNotification("Transcript panel already open.", "info");
    }

    // 2. (Optional) Toggle timestamps
    if (shouldToggleTimestamps) {
      showNotification("Attempting to toggle timestamps...", "info");
      // The "Toggle timestamps" button is in a menu *within* the transcript panel
      const transcriptMenuButton = await waitForElement(
        "yt-icon-button#menu-button",
        document.querySelector("ytd-transcript-renderer"),
        3000,
      );
      if (!transcriptMenuButton) {
        showNotification(
          "Could not find transcript menu button (for toggling timestamps).",
          "error",
        );
        // Proceed without toggling if button not found, but inform user
      } else {
        transcriptMenuButton.click();
        // Wait for the transcript-specific menu to appear
        const transcriptMenuItemsContainer = await waitForElement(
          "#items.ytd-menu-popup-renderer",
          document.body,
          2000,
        ); // document.body because menu is often appended there
        if (!transcriptMenuItemsContainer) {
          showNotification("Transcript menu items did not appear.", "error");
        } else {
          // This selector is very specific, relying on the text content might be better
          // but for "Toggle timestamps" the structure is usually fixed.
          // Let's find it by text for robustness (though it could be localized)
          let toggleButton = null;
          const items = transcriptMenuItemsContainer.querySelectorAll(
            "ytd-menu-service-item-renderer tp-yt-paper-item",
          );
          for (const item of items) {
            // Check for known text for toggling timestamps (might need localization)
            if (
              item.textContent
                .trim()
                .toLowerCase()
                .includes("toggle timestamps") ||
              item.textContent
                .trim()
                .toLowerCase()
                .includes("показать / скрыть временные метки")
            ) {
              // Russian example
              toggleButton = item;
              break;
            }
          }

          if (toggleButton) {
            toggleButton.click();
            showNotification("Timestamps toggled.", "success");
            // Give a brief moment for the DOM to update after toggling
            await new Promise((resolve) => setTimeout(resolve, 500));
          } else {
            showNotification(
              "Could not find 'Toggle timestamps' button in menu.",
              "error",
            );
          }
          // Attempt to close the menu, e.g. by clicking menu button again or an overlay
          // Often, clicking the item closes the menu. If not, this is tricky.
          // For now, assume it closes. If it doesn't, clicking outside or pressing Escape might be needed.
        }
      }
    }

    // 3. Get the transcript text
    // Re-fetch container in case DOM changed after toggling timestamps
    transcriptContainer = await waitForElement(
      transcriptContainerSelector,
      document,
      2000,
    );
    if (!transcriptContainer) {
      showNotification(
        "Transcript content area not found after operations.",
        "error",
      );
      return null;
    }

    // Use innerText to get visible text, which respects timestamp visibility
    // If timestamps are on, they are part of innerText. If off, they are not.
    const rawTranscript = transcriptContainer.innerText;

    if (!rawTranscript || rawTranscript.trim() === "") {
      showNotification("Transcript is empty or not available.", "error");
      return null;
    }

    // Basic cleaning: remove multiple newlines that sometimes occur
    lastTranscript = rawTranscript.replace(/\n\s*\n/g, "\n").trim();

    showNotification("Transcript fetched successfully!", "success");
    updateTranscriptDisplay(lastTranscript);
    return lastTranscript;
  }

  // --- UI Creation and Management ---

  function createExtensionPanel() {
    if (extensionPanel) return; // Already exists

    extensionPanel = document.createElement("div");
    extensionPanel.id = "yt-transcript-fetcher-panel";
    extensionPanel.innerHTML = `
            <div class="yt-transcript-fetcher-header">
                <h3>YouTube Transcript Extractor</h3>
                <button id="yt-transcript-fetcher-close" title="Close Panel">&times;</button>
            </div>
            <div class="yt-transcript-fetcher-controls">
                <label>
                    <input type="checkbox" id="yt-transcript-toggle-timestamps" checked> Toggle Timestamps
                </label>
                <button id="yt-transcript-fetch-btn">Get Transcript</button>
            </div>
            <div class="yt-transcript-fetcher-status" style="display:none;"></div>
            <textarea id="yt-transcript-output" readonly placeholder="Transcript will appear here..."></textarea>
            <div class="yt-transcript-fetcher-actions">
                <button id="yt-transcript-copy-btn" disabled>Copy</button>
                <button id="yt-transcript-download-btn" disabled>Download .txt</button>
            </div>
        `;
    document.body.appendChild(extensionPanel);
    addPanelStyles();
    addPanelEventListeners();
    makeDraggable(
      extensionPanel.querySelector(".yt-transcript-fetcher-header"),
      extensionPanel,
    );
  }

  function updateTranscriptDisplay(transcriptText) {
    const outputArea = extensionPanel.querySelector("#yt-transcript-output");
    const copyBtn = extensionPanel.querySelector("#yt-transcript-copy-btn");
    const downloadBtn = extensionPanel.querySelector(
      "#yt-transcript-download-btn",
    );

    if (transcriptText) {
      outputArea.value = transcriptText;
      copyBtn.disabled = false;
      downloadBtn.disabled = false;
    } else {
      outputArea.value = "Failed to fetch transcript or transcript is empty.";
      copyBtn.disabled = true;
      downloadBtn.disabled = true;
    }
  }

  function addPanelEventListeners() {
    if (!extensionPanel) return;

    extensionPanel
      .querySelector("#yt-transcript-fetch-btn")
      .addEventListener("click", async () => {
        const toggleTimestampsCheckbox = extensionPanel.querySelector(
          "#yt-transcript-toggle-timestamps",
        );
        await fetchTranscript(toggleTimestampsCheckbox.checked);
      });

    extensionPanel
      .querySelector("#yt-transcript-copy-btn")
      .addEventListener("click", () => {
        copyToClipboard(lastTranscript);
      });

    extensionPanel
      .querySelector("#yt-transcript-download-btn")
      .addEventListener("click", () => {
        const videoTitle = document.title
          .replace(" - YouTube", "")
          .replace(/[<>:"/\\|?*]+/g, "_"); // Sanitize filename
        downloadAsFile(lastTranscript, `${videoTitle}_transcript.txt`);
      });

    extensionPanel
      .querySelector("#yt-transcript-fetcher-close")
      .addEventListener("click", () => {
        extensionPanel.style.display = "none"; // Hide instead of remove to keep state
      });
  }

  function addPanelStyles() {
    const styleId = "yt-transcript-fetcher-styles";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
            #yt-transcript-fetcher-panel {
                position: fixed;
                top: 100px;
                right: 20px;
                width: 350px;
                max-height: 80vh;
                background-color: #282828; /* YouTube Dark Theme like */
                color: #fff;
                border: 1px solid #444;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 99999; /* High z-index */
                font-family: "YouTube Noto", Roboto, Arial, Helvetica, sans-serif;
                font-size: 14px;
                display: flex;
                flex-direction: column;
            }
            .yt-transcript-fetcher-header {
                padding: 10px 15px;
                background-color: #333;
                border-bottom: 1px solid #444;
                cursor: move;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
            }
            .yt-transcript-fetcher-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 500;
            }
            #yt-transcript-fetcher-close {
                background: none;
                border: none;
                color: #aaa;
                font-size: 24px;
                cursor: pointer;
                padding: 0 5px;
            }
            #yt-transcript-fetcher-close:hover {
                color: #fff;
            }
            .yt-transcript-fetcher-controls, .yt-transcript-fetcher-actions {
                padding: 10px 15px;
                display: flex;
                gap: 10px;
                align-items: center;
            }
            .yt-transcript-fetcher-controls button, .yt-transcript-fetcher-actions button {
                padding: 8px 12px;
                background-color: #3ea6ff; /* YouTube blue */
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
            }
            .yt-transcript-fetcher-controls button:hover, .yt-transcript-fetcher-actions button:hover {
                background-color: #65b8ff;
            }
            .yt-transcript-fetcher-actions button:disabled {
                background-color: #555;
                cursor: not-allowed;
            }
            .yt-transcript-fetcher-controls label {
                display: flex;
                align-items: center;
                gap: 5px;
                cursor: pointer;
            }
            #yt-transcript-output {
                flex-grow: 1;
                width: calc(100% - 30px); /* 15px padding on each side */
                margin: 0 15px 10px 15px;
                min-height: 150px;
                max-height: 40vh; /* Control max height before scrolling */
                background-color: #1e1e1e;
                color: #ddd;
                border: 1px solid #444;
                border-radius: 4px;
                padding: 8px;
                font-family: Consolas, Monaco, monospace;
                font-size: 12px;
                resize: vertical;
            }
            .yt-transcript-fetcher-status {
                padding: 8px 15px;
                margin: 5px 15px;
                border-radius: 4px;
                font-size: 13px;
                text-align: center;
            }
            .yt-transcript-fetcher-success { background-color: #2f7c31; color: white; }
            .yt-transcript-fetcher-error { background-color: #c62828; color: white; }
            .yt-transcript-fetcher-info { background-color: #1976d2; color: white; }
        `;
    document.head.appendChild(style);
  }

  function makeDraggable(dragHandle, draggableElement) {
    let offsetX;
    let offsetY;
    let isDragging = false;

    dragHandle.addEventListener("mousedown", (e) => {
      // Prevent dragging if clicking on a button inside the header (like close button)
      if (e.target.tagName === "BUTTON") return;
      isDragging = true;
      offsetX = e.clientX - draggableElement.offsetLeft;
      offsetY = e.clientY - draggableElement.offsetTop;
      draggableElement.style.userSelect = "none"; // Prevent text selection while dragging
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      // Constrain movement within viewport
      const newLeft = e.clientX - offsetX;
      const newTop = e.clientY - offsetY;

      const maxLeft = window.innerWidth - draggableElement.offsetWidth;
      const maxTop = window.innerHeight - draggableElement.offsetHeight;

      draggableElement.style.left = `${Math.max(0, Math.min(newLeft, maxLeft))}px`;
      draggableElement.style.top = `${Math.max(0, Math.min(newTop, maxTop))}px`;
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        draggableElement.style.userSelect = "";
      }
    });
  }

  // --- Initialization ---

  function init() {
    // Only run on YouTube video pages
    if (!window.location.href.includes("youtube.com/watch")) {
      console.log("YT Transcript Fetcher: Not a YouTube video page.");
      return;
    }

    // Check if panel already injected to avoid duplicates during development hot-reloading
    if (document.getElementById("yt-transcript-fetcher-panel")) {
      extensionPanel = document.getElementById("yt-transcript-fetcher-panel");
      extensionPanel.style.display = "flex"; // Ensure it's visible
      return;
    }

    console.log("YT Transcript Fetcher: Initializing on video page.");
    createExtensionPanel();

    // As an alternative to the panel, you could inject a button into YT's own UI:
    // e.g., near the like/dislike buttons. This is more complex due to YT's dynamic UI.
    // For now, the floating panel is simpler and more robust.
  }

  // Listen for messages from popup or background script (if you add one)
  // This allows triggering the panel from the extension icon
  if (chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "toggleTranscriptPanel") {
        if (extensionPanel && extensionPanel.style.display !== "none") {
          extensionPanel.style.display = "none";
          sendResponse({ status: "Panel hidden" });
        } else if (extensionPanel) {
          extensionPanel.style.display = "flex";
          sendResponse({ status: "Panel shown" });
        } else {
          init(); // Initialize if not already there
          sendResponse({ status: "Panel initialized and shown" });
        }
        return true; // Indicates you wish to send a response asynchronously
      }
    });
  }

  // Initial check in case script is injected after page load.
  // Use a small delay to ensure page elements are more likely to be ready.
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    setTimeout(init, 1000); // Give YT a second to settle
  } else {
    window.addEventListener("load", () => setTimeout(init, 1000));
  }
})();
