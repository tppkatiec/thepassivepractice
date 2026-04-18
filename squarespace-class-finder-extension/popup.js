const toggleInspector = document.getElementById("toggleInspector");
const toggleSticky = document.getElementById("toggleSticky");
const statusBox = document.getElementById("statusBox");

chrome.storage?.local?.get(["sqsClassEnabled", "sqsClassSticky"], (data) => {
  toggleInspector.checked = data.sqsClassEnabled || false;
  toggleSticky.checked = data.sqsClassSticky !== false;
  updateStatus();
});

toggleInspector.addEventListener("change", async () => {
  const enabled = toggleInspector.checked;
  chrome.storage?.local?.set({ sqsClassEnabled: enabled });

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
  chrome.storage?.local?.set({ sqsClassSticky: enabled });
  sendToTab({ action: "toggleSticky", enabled });
});

function updateStatus() {
  if (toggleInspector.checked) {
    statusBox.textContent = "Class Finder is ON — hover over elements.";
    statusBox.classList.add("active");
  } else {
    statusBox.textContent = "Toggle the inspector, then hover over any element on a Squarespace page.";
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
