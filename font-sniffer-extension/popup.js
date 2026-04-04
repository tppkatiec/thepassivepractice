const toggleInspector = document.getElementById("toggleInspector");
const toggleSticky = document.getElementById("toggleSticky");
const statusBox = document.getElementById("statusBox");

chrome.storage?.local?.get(["fontSnifferEnabled", "fontSnifferSticky"], (data) => {
  toggleInspector.checked = data.fontSnifferEnabled || false;
  toggleSticky.checked = data.fontSnifferSticky !== false;
  updateStatus();
});

toggleInspector.addEventListener("change", async () => {
  const enabled = toggleInspector.checked;
  chrome.storage?.local?.set({ fontSnifferEnabled: enabled });

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
  chrome.storage?.local?.set({ fontSnifferSticky: enabled });
  sendToTab({ action: "toggleSticky", enabled });
});

function updateStatus() {
  if (toggleInspector.checked) {
    statusBox.textContent = "Fontspo is ON — hover over any text.";
    statusBox.classList.add("active");
  } else {
    statusBox.textContent = "Toggle the inspector, then hover over any text on the page.";
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
