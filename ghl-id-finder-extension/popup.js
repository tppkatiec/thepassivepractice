const toggleInspector = document.getElementById("toggleInspector");
const toggleSticky = document.getElementById("toggleSticky");
const toggleDebug = document.getElementById("toggleDebug");
const statusBox = document.getElementById("statusBox");

// Load saved state
chrome.storage?.local?.get(["inspectorEnabled", "stickyEnabled", "debugEnabled"], (data) => {
  toggleInspector.checked = data.inspectorEnabled || false;
  toggleSticky.checked = data.stickyEnabled !== false; // default true
  toggleDebug.checked = data.debugEnabled !== false; // default true
  updateStatus();
});

toggleInspector.addEventListener("change", async () => {
  const enabled = toggleInspector.checked;
  chrome.storage?.local?.set({ inspectorEnabled: enabled });

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (tab?.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, { action: "toggleInspector", enabled });
    } catch {
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["content.css"] });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
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

toggleDebug.addEventListener("change", () => {
  const enabled = toggleDebug.checked;
  chrome.storage?.local?.set({ debugEnabled: enabled });
  sendToTab({ action: "toggleDebug", enabled });
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
