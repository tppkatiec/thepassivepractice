(() => {
  "use strict";

  let enabled = false;
  let stickyMode = true;
  let hoveredEl = null;
  let tooltip = null;
  let pinnedTooltips = [];

  // ── Build a full CSS selector path for targeting ──

  function getSelector(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const tag = el.tagName.toLowerCase();
    const cls = Array.from(el.classList).filter((c) => !c.startsWith("sqsf-"));
    if (cls.length) return tag + "." + cls.map(CSS.escape).join(".");
    return tag;
  }

  function getSelectorPath(el) {
    const parts = [];
    let current = el;
    while (current && current !== document.body && current !== document.documentElement) {
      const sel = getSelector(current);
      parts.unshift(sel);
      // Stop at a meaningful anchor (ID, or known Squarespace container)
      if (current.id) break;
      current = current.parentElement;
    }
    return parts.join(" > ");
  }

  function getShortSelector(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const cls = Array.from(el.classList).filter((c) => !c.startsWith("sqsf-"));
    if (cls.length) return "." + cls.map(CSS.escape).join(".");
    return el.tagName.toLowerCase();
  }

  // ── Classify what kind of element this is ──

  function classifyElement(el) {
    const tag = el.tagName.toLowerCase();
    const cls = Array.from(el.classList);
    const id = el.id || "";

    if (id.startsWith("section-") || id.startsWith("page-section")) return "Section";
    if (id.startsWith("block-")) return "Block";
    if (cls.some((c) => c.startsWith("sqs-block-"))) {
      const blockClass = cls.find((c) => c.startsWith("sqs-block-") && c !== "sqs-block-content");
      if (blockClass) {
        const type = blockClass.replace("sqs-block-", "").replace(/-/g, " ");
        return type.charAt(0).toUpperCase() + type.slice(1) + " Block";
      }
      return "Block";
    }
    if (cls.includes("sqs-block")) return "Block";
    if (cls.includes("page-section")) return "Page Section";
    if (cls.includes("content-wrapper")) return "Content Wrapper";
    if (cls.some((c) => c.startsWith("fe-block"))) return "Fluid Engine Block";
    if (cls.includes("fluid-engine")) return "Fluid Engine Grid";
    if (cls.some((c) => c.startsWith("sqs-row"))) return "Row";
    if (cls.some((c) => c.startsWith("sqs-col"))) return "Column";
    if (cls.includes("sqs-layout")) return "Layout";
    if (cls.includes("header") || cls.includes("Header")) return "Header";
    if (cls.includes("footer") || cls.includes("Footer")) return "Footer";
    if (cls.some((c) => c.startsWith("sqs-gallery"))) return "Gallery";
    if (cls.some((c) => c.startsWith("summary-"))) return "Summary";
    if (cls.includes("btn") || cls.some((c) => c.startsWith("sqs-button"))) return "Button";
    if (cls.some((c) => c.startsWith("image-block"))) return "Image Block";
    if (cls.some((c) => c.startsWith("sqs-html-content"))) return "Rich Text";

    if (tag === "section") return "Section";
    if (tag === "nav") return "Nav";
    if (tag === "a") return "Link";
    if (tag === "img") return "Image";
    if (tag === "button") return "Button";
    if (/^h[1-6]$/.test(tag)) return `Heading (${tag})`;
    if (tag === "p") return "Paragraph";
    if (tag === "ul" || tag === "ol") return "List";
    if (tag === "li") return "List Item";
    if (tag === "span") return "Span";
    if (tag === "div") return "Div";
    if (tag === "form") return "Form";
    if (tag === "input") return "Input";

    return tag.toUpperCase();
  }

  // ── Key computed styles for overriding ──

  function getKeyStyles(el) {
    const cs = window.getComputedStyle(el);
    const styles = [];
    const tag = el.tagName.toLowerCase();

    // Always show these
    const pairs = [
      ["font-family", cs.fontFamily],
      ["font-size", cs.fontSize],
      ["font-weight", cs.fontWeight],
      ["color", rgbToHex(cs.color)],
      ["background", rgbToHex(cs.backgroundColor)],
      ["padding", cs.padding],
      ["margin", cs.margin],
    ];

    // Conditionally show these if non-default
    if (cs.lineHeight !== "normal") pairs.push(["line-height", cs.lineHeight]);
    if (cs.letterSpacing !== "normal") pairs.push(["letter-spacing", cs.letterSpacing]);
    if (cs.textTransform !== "none") pairs.push(["text-transform", cs.textTransform]);
    if (cs.textAlign !== "start" && cs.textAlign !== "left") pairs.push(["text-align", cs.textAlign]);
    if (cs.borderRadius !== "0px") pairs.push(["border-radius", cs.borderRadius]);
    if (cs.display !== "block" && cs.display !== "inline") pairs.push(["display", cs.display]);
    if (cs.position !== "static") pairs.push(["position", cs.position]);
    if (cs.opacity !== "1") pairs.push(["opacity", cs.opacity]);

    return pairs;
  }

  function rgbToHex(rgb) {
    if (rgb === "transparent" || rgb === "rgba(0, 0, 0, 0)") return "transparent";
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return rgb;
    return "#" + [match[1], match[2], match[3]].map((c) => parseInt(c).toString(16).padStart(2, "0")).join("");
  }

  // ── Tooltip ──

  function createTooltip() {
    const el = document.createElement("div");
    el.className = "sqsf-tooltip";
    el.innerHTML = `
      <div class="sqsf-header">
        <span class="sqsf-tag"></span>
        <span class="sqsf-pinned-badge" style="display:none">PINNED</span>
        <button class="sqsf-close" style="display:none">&times;</button>
      </div>
      <div class="sqsf-body"></div>
      <div class="sqsf-note-area" style="display:none">
        <textarea class="sqsf-note-input" placeholder="What needs to be fixed here..." rows="2"></textarea>
      </div>
      <div class="sqsf-selector" title="Click to copy full selector path">
        <code></code>
        <span class="sqsf-copy-icon">COPY</span>
      </div>
    `;
    document.body.appendChild(el);
    return el;
  }

  function populateTooltip(tip, el) {
    const type = classifyElement(el);
    const id = el.id || null;
    const tag = el.tagName.toLowerCase();
    const allClasses = Array.from(el.classList).filter((c) => !c.startsWith("sqsf-"));
    const selectorPath = getSelectorPath(el);
    const shortSel = getShortSelector(el);

    tip.querySelector(".sqsf-tag").textContent = type;

    const body = tip.querySelector(".sqsf-body");
    let html = "";

    // Element tag
    html += `<div class="sqsf-row">
      <div class="sqsf-label">Element</div>
      <div class="sqsf-value">&lt;${tag}&gt;</div>
    </div>`;

    // ID
    if (id) {
      html += `<div class="sqsf-row">
        <div class="sqsf-label">ID</div>
        <div class="sqsf-value sqsf-copyable" data-copy="#${id}">#${escapeHtml(id)}</div>
      </div>`;
    }

    // Classes
    if (allClasses.length) {
      html += `<div class="sqsf-row">
        <div class="sqsf-label">Classes (${allClasses.length})</div>
        <div class="sqsf-class-list">
          ${allClasses.slice(0, 20).map((c) => `<span class="sqsf-class-pill" data-class="${escapeHtml(c)}">.${escapeHtml(c)}</span>`).join("")}
          ${allClasses.length > 20 ? `<span class="sqsf-class-pill" style="opacity:.5">+${allClasses.length - 20} more</span>` : ""}
        </div>
      </div>`;
    }

    // Full selector path (the main thing they need for CSS targeting)
    html += `<div class="sqsf-row">
      <div class="sqsf-label">CSS Selector Path</div>
      <div class="sqsf-value sqsf-copyable sqsf-path" data-copy="${escapeAttr(selectorPath)}">${escapeHtml(selectorPath)}</div>
    </div>`;

    // Data attributes
    const dataAttrs = Array.from(el.attributes)
      .filter((a) => a.name.startsWith("data-") && a.value)
      .slice(0, 5);
    if (dataAttrs.length) {
      html += `<div class="sqsf-row">
        <div class="sqsf-label">Data Attributes</div>
        ${dataAttrs.map((a) => `<div class="sqsf-value" style="font-size:11px">${escapeHtml(a.name)}="${escapeHtml(a.value.slice(0, 50))}"</div>`).join("")}
      </div>`;
    }

    // Key computed styles
    const styles = getKeyStyles(el);
    html += `<div class="sqsf-row">
      <div class="sqsf-label">Current Styles</div>
      <div class="sqsf-styles-grid">
        ${styles.map(([prop, val]) => `<div class="sqsf-style-item sqsf-copyable" data-copy="${escapeAttr(prop)}: ${escapeAttr(val)};"><span class="sqsf-style-prop">${prop}:</span> <span class="sqsf-style-val">${escapeHtml(val.length > 35 ? val.slice(0, 35) + "..." : val)}</span></div>`).join("")}
      </div>
    </div>`;

    // Inline styles warning
    const inlineStyle = el.getAttribute("style");
    if (inlineStyle) {
      html += `<div class="sqsf-row">
        <div class="sqsf-label" style="color:#f59e0b">Inline Styles (may override CSS)</div>
        <div class="sqsf-value sqsf-copyable sqsf-inline-warn" data-copy="${escapeAttr(inlineStyle)}">${escapeHtml(inlineStyle.length > 120 ? inlineStyle.slice(0, 120) + "..." : inlineStyle)}</div>
      </div>`;
    }

    body.innerHTML = html;

    // Bottom selector bar shows the short selector
    tip.querySelector(".sqsf-selector code").textContent = shortSel;

    // Click-to-copy on all copyable elements
    tip.querySelectorAll(".sqsf-copyable[data-copy]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(el.dataset.copy).then(() => {
          el.classList.add("copied");
          const orig = el.innerHTML;
          el.textContent = "Copied!";
          setTimeout(() => { el.classList.remove("copied"); el.innerHTML = orig; }, 1000);
        });
      });
    });

    // Click-to-copy on pills
    tip.querySelectorAll(".sqsf-class-pill[data-class]").forEach((pill) => {
      pill.addEventListener("click", (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText("." + pill.dataset.class).then(() => {
          pill.classList.add("copied");
          const orig = pill.textContent;
          pill.textContent = "Copied!";
          setTimeout(() => { pill.classList.remove("copied"); pill.textContent = orig; }, 1200);
        });
      });
    });

    // Selector bar copy
    const selectorBar = tip.querySelector(".sqsf-selector");
    selectorBar.onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(shortSel).then(() => {
        selectorBar.classList.add("copied");
        tip.querySelector(".sqsf-copy-icon").textContent = "COPIED!";
        setTimeout(() => { selectorBar.classList.remove("copied"); tip.querySelector(".sqsf-copy-icon").textContent = "COPY"; }, 1200);
      });
    };
  }

  function positionTooltip(tip, e) {
    const pad = 12;
    const rect = tip.getBoundingClientRect();
    let x = e.clientX + pad;
    let y = e.clientY + pad;
    if (x + rect.width > window.innerWidth - pad) x = e.clientX - rect.width - pad;
    if (y + rect.height > window.innerHeight - pad) y = e.clientY - rect.height - pad;
    tip.style.left = Math.max(pad, x) + "px";
    tip.style.top = Math.max(pad, y) + "px";
  }

  function pinTooltip(el, e) {
    if (!stickyMode) return;
    const pinned = createTooltip();
    populateTooltip(pinned, el);
    pinned.classList.add("visible", "pinned");
    pinned.querySelector(".sqsf-pinned-badge").style.display = "";
    const closeBtn = pinned.querySelector(".sqsf-close");
    closeBtn.style.display = "";
    closeBtn.onclick = () => removePinned(pinned);

    // Show notes
    const noteArea = pinned.querySelector(".sqsf-note-area");
    noteArea.style.display = "";
    const noteInput = pinned.querySelector(".sqsf-note-input");
    noteInput.addEventListener("click", (ev) => ev.stopPropagation());
    noteInput.addEventListener("mousedown", (ev) => ev.stopPropagation());
    noteInput.addEventListener("keydown", (ev) => ev.stopPropagation());
    noteInput.addEventListener("input", () => {
      noteInput.style.height = "auto";
      noteInput.style.height = noteInput.scrollHeight + "px";
    });

    // Draggable
    let isDragging = false, dragX = 0, dragY = 0;
    const header = pinned.querySelector(".sqsf-header");
    header.style.cursor = "grab";
    header.addEventListener("mousedown", (ev) => {
      if (ev.target.closest(".sqsf-close")) return;
      isDragging = true;
      header.style.cursor = "grabbing";
      dragX = ev.clientX - pinned.offsetLeft;
      dragY = ev.clientY - pinned.offsetTop;
      ev.preventDefault();
    });
    document.addEventListener("mousemove", (ev) => {
      if (!isDragging) return;
      pinned.style.left = (ev.clientX - dragX) + "px";
      pinned.style.top = (ev.clientY - dragY) + "px";
    });
    document.addEventListener("mouseup", () => {
      if (isDragging) { isDragging = false; header.style.cursor = "grab"; }
    });

    positionTooltip(pinned, e);
    pinnedTooltips.push(pinned);
    setTimeout(() => noteInput.focus(), 50);
  }

  function removePinned(tip) {
    tip.remove();
    pinnedTooltips = pinnedTooltips.filter((t) => t !== tip);
  }

  function removeAllPinned() {
    pinnedTooltips.forEach((t) => t.remove());
    pinnedTooltips = [];
  }

  function onMouseOver(e) {
    if (!enabled) return;
    const el = e.target;
    if (!el || el === document.body || el === document.documentElement) return;
    if (el.closest(".sqsf-tooltip")) return;
    if (hoveredEl) hoveredEl.classList.remove("sqsf-highlight");
    el.classList.add("sqsf-highlight");
    hoveredEl = el;
    if (!tooltip) tooltip = createTooltip();
    populateTooltip(tooltip, el);
    tooltip.classList.add("visible");
    positionTooltip(tooltip, e);
  }

  function onMouseMove(e) {
    if (!enabled || !tooltip) return;
    if (e.target.closest(".sqsf-tooltip")) return;
    positionTooltip(tooltip, e);
  }

  function onMouseOut(e) {
    if (!enabled) return;
    if (hoveredEl) hoveredEl.classList.remove("sqsf-highlight");
    hoveredEl = null;
    if (tooltip) tooltip.classList.remove("visible");
  }

  function onClick(e) {
    if (!enabled) return;
    if (e.target.closest(".sqsf-tooltip")) return;
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
    if (hoveredEl) hoveredEl.classList.remove("sqsf-highlight");
    hoveredEl = null;
    if (tooltip) { tooltip.remove(); tooltip = null; }
    removeAllPinned();
    document.removeEventListener("mouseover", onMouseOver, true);
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("mouseout", onMouseOut, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
  }

  chrome.runtime?.onMessage?.addListener((msg, sender, sendResponse) => {
    if (msg.action === "toggleInspector") msg.enabled ? enable() : disable();
    if (msg.action === "toggleSticky") stickyMode = msg.enabled;
    if (msg.action === "exportNotes") {
      const notes = [];
      pinnedTooltips.forEach((tip, i) => {
        const sel = tip.querySelector(".sqsf-selector code")?.textContent || "";
        const tag = tip.querySelector(".sqsf-tag")?.textContent || "";
        const note = tip.querySelector(".sqsf-note-input")?.value || "";
        if (sel || note) notes.push(`${i + 1}. [${tag}] ${sel}${note ? "\n   Note: " + note : ""}`);
      });
      sendResponse({ notes: notes.join("\n\n"), count: pinnedTooltips.length });
    }
    return true;
  });

  chrome.storage?.local?.get(["sqsClassEnabled", "sqsClassSticky"], (data) => {
    if (data.sqsClassEnabled) enable();
    if (data.sqsClassSticky !== undefined) stickyMode = data.sqsClassSticky;
  });

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }
  function escapeAttr(str) {
    return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
})();
