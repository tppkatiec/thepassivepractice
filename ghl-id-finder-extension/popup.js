const toggleInspector = document.getElementById("toggleInspector");
const toggleSticky = document.getElementById("toggleSticky");
const statusBox = document.getElementById("statusBox");

// Load saved state
chrome.storage?.local?.get(["inspectorEnabled", "stickyEnabled"], (data) => {
  toggleInspector.checked = data.inspectorEnabled || false;
  toggleSticky.checked = data.stickyEnabled !== false; // default true
  updateStatus();
});

toggleInspector.addEventListener("change", async () => {
  const enabled = toggleInspector.checked;
  chrome.storage?.local?.set({ inspectorEnabled: enabled });

  // Inject content script if not already present (for custom domain GHL sites)
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (tab?.id) {
    try {
      // Try sending message first — if content script is loaded, it will respond
      await chrome.tabs.sendMessage(tab.id, { action: "toggleInspector", enabled });
    } catch {
      // Content script not injected yet (custom domain) — inject it now
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["content.css"] });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
      // Send toggle after injection
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { action: "toggleInspector", enabled });
      }, 100);
    }
  }

  updateStatus();
});

toggleSticky.addEventListener("change", () => {
  const enabled = toggleSticky.checked;
  chrome.storage?.local?.set({ stickyEnabled: enabled });
  sendToTab({ action: "toggleSticky", enabled });
});

function updateStatus() {
  if (toggleInspector.checked) {
    statusBox.textContent = "Inspector is ON — hover over elements on the page.";
    statusBox.classList.add("active");
  } else {
    statusBox.textContent = "Toggle the inspector, then hover over any element on a GHL page.";
    statusBox.classList.remove("active");
  }
}

function sendToTab(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, message).catch(() => {});
    }
  });
}
