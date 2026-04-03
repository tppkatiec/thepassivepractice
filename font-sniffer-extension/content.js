(() => {
  "use strict";

  let enabled = false;
  let stickyMode = true;
  let hoveredEl = null;
  let tooltip = null;
  let pinnedTooltips = [];

  // ── Extract computed font styles ──

  function getFontData(el) {
    const cs = window.getComputedStyle(el);

    // Clean up font-family: remove quotes for display
    const rawFamily = cs.fontFamily;
    const cleanFamily = rawFamily
      .split(",")
      .map((f) => f.trim().replace(/^["']|["']$/g, ""))
      .join(", ");

    // Get the primary font (first in stack)
    const primaryFont = rawFamily
      .split(",")[0]
      .trim()
      .replace(/^["']|["']$/g, "");

    // Convert weight number to name
    const weightNum = cs.fontWeight;
    const weightName = {
      "100": "Thin",
      "200": "Extra Light",
      "300": "Light",
      "400": "Regular",
      "500": "Medium",
      "600": "Semi Bold",
      "700": "Bold",
      "800": "Extra Bold",
      "900": "Black",
    }[weightNum] || weightNum;

    // Color as hex
    const color = cs.color;
    const hex = rgbToHex(color);

    return {
      fontFamily: cleanFamily,
      primaryFont,
      fontSize: cs.fontSize,
      fontWeight: `${weightNum} (${weightName})`,
      fontWeightRaw: weightNum,
      fontStyle: cs.fontStyle,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing === "normal" ? "normal (0px)" : cs.letterSpacing,
      wordSpacing: cs.wordSpacing === "0px" ? "normal (0px)" : cs.wordSpacing,
      textTransform: cs.textTransform,
      textDecoration: cs.textDecorationLine || cs.textDecoration,
      textAlign: cs.textAlign,
      color: hex,
      colorRgb: color,
      opacity: cs.opacity,
      tag: el.tagName.toLowerCase(),
    };
  }

  function rgbToHex(rgb) {
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return rgb;
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
  }

  function buildCssBlock(data) {
    let css = `font-family: ${data.fontFamily};\n`;
    css += `font-size: ${data.fontSize};\n`;
    css += `font-weight: ${data.fontWeightRaw};\n`;
    if (data.fontStyle !== "normal") css += `font-style: ${data.fontStyle};\n`;
    css += `line-height: ${data.lineHeight};\n`;
    if (data.letterSpacing !== "normal (0px)") css += `letter-spacing: ${data.letterSpacing};\n`;
    if (data.wordSpacing !== "normal (0px)") css += `word-spacing: ${data.wordSpacing};\n`;
    if (data.textTransform !== "none") css += `text-transform: ${data.textTransform};\n`;
    css += `color: ${data.color};`;
    return css;
  }

  // ── Tooltip ──

  function createTooltip() {
    const el = document.createElement("div");
    el.className = "fs-tooltip";
    el.innerHTML = `
      <div class="fs-header">
        <span class="fs-font-name"></span>
        <span class="fs-pinned-badge">PINNED</span>
        <button class="fs-close">&times;</button>
      </div>
      <div class="fs-preview">
        <span class="fs-preview-text">The quick brown fox</span>
      </div>
      <div class="fs-props"></div>
      <div class="fs-copy-all">Copy All CSS</div>
    `;
    document.body.appendChild(el);
    return el;
  }

  function populateTooltip(tip, el) {
    const data = getFontData(el);

    // Header: primary font name
    tip.querySelector(".fs-font-name").textContent = data.primaryFont;

    // Preview: show actual text in actual font
    const preview = tip.querySelector(".fs-preview-text");
    const sampleText = el.textContent.trim().slice(0, 40) || "The quick brown fox";
    preview.textContent = sampleText;
    preview.style.fontFamily = data.fontFamily;
    preview.style.fontSize = Math.min(parseFloat(data.fontSize), 28) + "px";
    preview.style.fontWeight = data.fontWeightRaw;
    preview.style.fontStyle = data.fontStyle;
    preview.style.color = data.color;
    preview.style.letterSpacing = data.letterSpacing.replace(" (0px)", "");
    if (data.textTransform !== "none") preview.style.textTransform = data.textTransform;

    // Properties grid
    const props = [
      { label: "Font Family", value: data.fontFamily, full: true },
      { label: "Size", value: data.fontSize },
      { label: "Weight", value: data.fontWeight },
      { label: "Line Height", value: data.lineHeight },
      { label: "Letter Spacing", value: data.letterSpacing },
      { label: "Style", value: data.fontStyle },
      { label: "Transform", value: data.textTransform },
      { label: "Alignment", value: data.textAlign },
      { label: "Decoration", value: data.textDecoration },
      { label: "Color", value: data.color, swatch: true },
      { label: "Element", value: `<${data.tag}>` },
      { label: "Opacity", value: data.opacity },
    ];

    const propsContainer = tip.querySelector(".fs-props");
    propsContainer.innerHTML = props
      .map(
        (p) => `
        <div class="fs-prop ${p.full ? "full-width" : ""}" data-copy="${escapeAttr(p.value)}">
          <div class="fs-prop-label">${p.label}</div>
          <div class="fs-prop-value">${p.swatch ? `<span class="fs-color-swatch" style="background:${escapeAttr(p.value)}"></span>` : ""}${escapeHtml(p.value)}</div>
        </div>`
      )
      .join("");

    // Click-to-copy on each property
    propsContainer.querySelectorAll(".fs-prop[data-copy]").forEach((prop) => {
      prop.addEventListener("click", (e) => {
        e.stopPropagation();
        const val = prop.dataset.copy;
        navigator.clipboard.writeText(val).then(() => {
          prop.classList.add("copied");
          const valueEl = prop.querySelector(".fs-prop-value");
          const orig = valueEl.innerHTML;
          valueEl.textContent = "Copied!";
          setTimeout(() => {
            prop.classList.remove("copied");
            valueEl.innerHTML = orig;
          }, 1000);
        });
      });
    });

    // Copy All CSS
    const copyAll = tip.querySelector(".fs-copy-all");
    copyAll.onclick = (e) => {
      e.stopPropagation();
      const css = buildCssBlock(data);
      navigator.clipboard.writeText(css).then(() => {
        copyAll.classList.add("copied");
        copyAll.textContent = "Copied!";
        setTimeout(() => {
          copyAll.classList.remove("copied");
          copyAll.textContent = "Copy All CSS";
        }, 1200);
      });
    };
  }

  function positionTooltip(tip, e) {
    const pad = 14;
    const rect = tip.getBoundingClientRect();
    let x = e.clientX + pad;
    let y = e.clientY + pad;

    if (x + rect.width > window.innerWidth - pad) {
      x = e.clientX - rect.width - pad;
    }
    if (y + rect.height > window.innerHeight - pad) {
      y = e.clientY - rect.height - pad;
    }
    x = Math.max(pad, x);
    y = Math.max(pad, y);

    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }

  // ── Pinning ──

  function pinTooltip(el, e) {
    if (!stickyMode) return;
    const pinned = createTooltip();
    populateTooltip(pinned, el);
    pinned.classList.add("visible", "pinned");
    pinned.querySelector(".fs-pinned-badge").style.display = "";
    const closeBtn = pinned.querySelector(".fs-close");
    closeBtn.style.display = "";
    closeBtn.onclick = () => removePinned(pinned);
    positionTooltip(pinned, e);
    pinnedTooltips.push(pinned);
  }

  function removePinned(tip) {
    tip.remove();
    pinnedTooltips = pinnedTooltips.filter((t) => t !== tip);
  }

  function removeAllPinned() {
    pinnedTooltips.forEach((t) => t.remove());
    pinnedTooltips = [];
  }

  // ── Events ──

  function onMouseOver(e) {
    if (!enabled) return;
    const el = e.target;
    if (!el || el === document.body || el === document.documentElement) return;
    if (el.closest(".fs-tooltip")) return;

    if (hoveredEl) hoveredEl.classList.remove("fs-highlight");
    el.classList.add("fs-highlight");
    hoveredEl = el;

    if (!tooltip) tooltip = createTooltip();
    populateTooltip(tooltip, el);
    tooltip.classList.add("visible");
    positionTooltip(tooltip, e);
  }

  function onMouseMove(e) {
    if (!enabled || !tooltip) return;
    if (e.target.closest(".fs-tooltip")) return;
    positionTooltip(tooltip, e);
  }

  function onMouseOut(e) {
    if (!enabled) return;
    if (hoveredEl) hoveredEl.classList.remove("fs-highlight");
    hoveredEl = null;
    if (tooltip) tooltip.classList.remove("visible");
  }

  function onClick(e) {
    if (!enabled) return;
    if (e.target.closest(".fs-tooltip")) return;
    e.preventDefault();
    e.stopPropagation();
    if (stickyMode && hoveredEl) pinTooltip(hoveredEl, e);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      if (pinnedTooltips.length) removeAllPinned();
      else if (enabled) disable();
    }
  }

  // ── Enable / Disable ──

  function enable() {
    enabled = true;
    document.addEventListener("mouseover", onMouseOver, true);
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("mouseout", onMouseOut, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
  }

  function disable() {
    enabled = false;
    if (hoveredEl) hoveredEl.classList.remove("fs-highlight");
    hoveredEl = null;
    if (tooltip) { tooltip.remove(); tooltip = null; }
    removeAllPinned();
    document.removeEventListener("mouseover", onMouseOver, true);
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("mouseout", onMouseOut, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
  }

  // ── Messages ──

  chrome.runtime?.onMessage?.addListener((msg) => {
    if (msg.action === "toggleInspector") msg.enabled ? enable() : disable();
    if (msg.action === "toggleSticky") stickyMode = msg.enabled;
  });

  chrome.storage?.local?.get(["fontSnifferEnabled", "fontSnifferSticky"], (data) => {
    if (data.fontSnifferEnabled) enable();
    if (data.fontSnifferSticky !== undefined) stickyMode = data.fontSnifferSticky;
  });

  // ── Utils ──
  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }
  function escapeAttr(str) {
    return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
})();
