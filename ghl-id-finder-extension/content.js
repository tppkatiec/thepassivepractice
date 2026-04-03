(() => {
  "use strict";

  // ── State ──
  let enabled = false;
  let stickyMode = true;
  let hoveredEl = null;
  let tooltip = null;
  let pinnedTooltips = [];

  // ── GHL-specific class patterns worth highlighting ──
  const GHL_PATTERNS = [
    /^c-/,          // c-section, c-row, c-column, c-button, c-wrapper
    /^el[A-Z]/,     // elButtonMain, elHeadline, elImageWrapper
    /^hl[_-]/,      // hl_page-preview, hl_header
    /^ghl-/,        // ghl-footer, ghl-button-bar, ghl-submit-btn
    /^section-/,
    /^row-/,
    /^col-/,
    /^inner-section/,
    /^nanosite/,
    /^funnel/,
    /^page-/,
    /^c-custom/,    // c-custom-code
    /^hl_login/,    // hl_login, hl_login--header
    /^hl-app/,
  ];

  // ── Helpers ──

  function isGHLClass(cls) {
    return GHL_PATTERNS.some((p) => p.test(cls));
  }

  function classifyElement(el) {
    const tag = el.tagName.toLowerCase();
    const cls = Array.from(el.classList);
    const ghlClasses = cls.filter(isGHLClass);

    if (ghlClasses.some((c) => c.startsWith("c-section") || c.startsWith("section"))) return "Section";
    if (ghlClasses.some((c) => c.startsWith("c-row") || c.startsWith("row"))) return "Row";
    if (ghlClasses.some((c) => c.startsWith("c-column") || c.startsWith("col"))) return "Column";
    if (ghlClasses.some((c) => c.startsWith("c-button") || c.startsWith("elButton"))) return "Button";
    if (ghlClasses.some((c) => c.startsWith("elHeadline") || c.startsWith("elHeader"))) return "Heading";
    if (ghlClasses.some((c) => c.startsWith("elImage"))) return "Image";
    if (ghlClasses.some((c) => c.startsWith("elVideo"))) return "Video";
    if (ghlClasses.some((c) => c.startsWith("elForm") || c.startsWith("elInput"))) return "Form";
    if (ghlClasses.some((c) => c.startsWith("ghl-submit") || c.startsWith("ghl-next") || c.startsWith("ghl-back"))) return "Button";
    if (ghlClasses.some((c) => c.startsWith("ghl-progress"))) return "Progress";
    if (ghlClasses.some((c) => c.startsWith("ghl-question") || c.startsWith("ghl-ques"))) return "Question";
    if (ghlClasses.some((c) => c.startsWith("ghl-footer"))) return "Footer";
    if (ghlClasses.some((c) => c.startsWith("hl_"))) return "HL UI";
    if (tag === "section") return "Section";
    if (tag === "nav") return "Nav";
    if (tag === "header") return "Header";
    if (tag === "footer") return "Footer";
    if (tag === "form") return "Form";
    return tag.toUpperCase();
  }

  function bestSelector(el) {
    // If element has an ID, use it
    if (el.id) return `#${CSS.escape(el.id)}`;

    // Prefer GHL-specific classes
    const cls = Array.from(el.classList);
    const ghl = cls.filter(isGHLClass);
    if (ghl.length) return "." + ghl.map(CSS.escape).join(".");

    // Fall back to first meaningful class
    const meaningful = cls.filter(
      (c) => !c.startsWith("ghl-finder-") && c.length > 1
    );
    if (meaningful.length) return "." + CSS.escape(meaningful[0]);

    return el.tagName.toLowerCase();
  }

  // ── Tooltip creation ──

  function createTooltip() {
    const el = document.createElement("div");
    el.className = "ghl-finder-tooltip";
    el.innerHTML = `
      <div class="gft-header">
        <span class="gft-tag"></span>
        <span class="gft-pinned-badge" style="display:none">PINNED</span>
        <button class="gft-close" style="display:none">&times;</button>
      </div>
      <div class="gft-body"></div>
      <div class="gft-selector" title="Click to copy selector">
        <code></code>
        <span class="gft-copy-icon">COPY</span>
      </div>
    `;
    document.body.appendChild(el);
    return el;
  }

  function populateTooltip(tip, el) {
    const tag = classifyElement(el);
    const id = el.id || null;
    const allClasses = Array.from(el.classList).filter(
      (c) => !c.startsWith("ghl-finder-")
    );
    const ghlClasses = allClasses.filter(isGHLClass);
    const otherClasses = allClasses.filter((c) => !isGHLClass(c));
    const selector = bestSelector(el);

    // Header
    tip.querySelector(".gft-tag").textContent = tag;

    // Body
    const body = tip.querySelector(".gft-body");
    let html = "";

    if (id) {
      html += `<div class="gft-row">
        <div class="gft-label">ID</div>
        <div class="gft-value">#${escapeHtml(id)}</div>
      </div>`;
    }

    if (ghlClasses.length) {
      html += `<div class="gft-row">
        <div class="gft-label">GHL Classes</div>
        <div class="gft-class-list">
          ${ghlClasses.map((c) => `<span class="gft-class-pill" data-class="${escapeHtml(c)}">.${escapeHtml(c)}</span>`).join("")}
        </div>
      </div>`;
    }

    if (otherClasses.length) {
      html += `<div class="gft-row">
        <div class="gft-label">Other Classes</div>
        <div class="gft-class-list">
          ${otherClasses.slice(0, 12).map((c) => `<span class="gft-class-pill" data-class="${escapeHtml(c)}">.${escapeHtml(c)}</span>`).join("")}
          ${otherClasses.length > 12 ? `<span class="gft-class-pill" style="opacity:.5">+${otherClasses.length - 12} more</span>` : ""}
        </div>
      </div>`;
    }

    // Show data attributes that might be useful
    const dataAttrs = Array.from(el.attributes)
      .filter((a) => a.name.startsWith("data-") && a.value)
      .slice(0, 5);
    if (dataAttrs.length) {
      html += `<div class="gft-row">
        <div class="gft-label">Data Attributes</div>
        ${dataAttrs.map((a) => `<div class="gft-value" style="font-size:11px">${escapeHtml(a.name)}="${escapeHtml(a.value.slice(0, 60))}"</div>`).join("")}
      </div>`;
    }

    body.innerHTML = html;

    // Selector bar
    tip.querySelector(".gft-selector code").textContent = selector;

    // Bind click-to-copy on pills
    tip.querySelectorAll(".gft-class-pill[data-class]").forEach((pill) => {
      pill.addEventListener("click", (e) => {
        e.stopPropagation();
        const cls = "." + pill.dataset.class;
        navigator.clipboard.writeText(cls).then(() => {
          pill.classList.add("copied");
          pill.textContent = "Copied!";
          setTimeout(() => {
            pill.classList.remove("copied");
            pill.textContent = cls;
          }, 1200);
        });
      });
    });

    // Bind click-to-copy on selector bar
    const selectorBar = tip.querySelector(".gft-selector");
    selectorBar.onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(selector).then(() => {
        selectorBar.classList.add("copied");
        tip.querySelector(".gft-copy-icon").textContent = "COPIED!";
        setTimeout(() => {
          selectorBar.classList.remove("copied");
          tip.querySelector(".gft-copy-icon").textContent = "COPY";
        }, 1200);
      });
    };
  }

  function positionTooltip(tip, e) {
    const pad = 12;
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

  // ── Pin a tooltip ──

  function pinTooltip(el, e) {
    if (!stickyMode) return;

    const pinned = createTooltip();
    populateTooltip(pinned, el);
    pinned.classList.add("visible", "pinned");
    pinned.querySelector(".gft-pinned-badge").style.display = "";
    const closeBtn = pinned.querySelector(".gft-close");
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

  // ── Event Handlers ──

  function onMouseOver(e) {
    if (!enabled) return;
    const el = e.target;
    if (!el || el === document.body || el === document.documentElement) return;
    if (el.closest(".ghl-finder-tooltip")) return;

    if (hoveredEl) hoveredEl.classList.remove("ghl-finder-highlight");
    el.classList.add("ghl-finder-highlight");
    hoveredEl = el;

    if (!tooltip) tooltip = createTooltip();
    populateTooltip(tooltip, el);
    tooltip.classList.add("visible");
    positionTooltip(tooltip, e);
  }

  function onMouseMove(e) {
    if (!enabled || !tooltip) return;
    if (e.target.closest(".ghl-finder-tooltip")) return;
    positionTooltip(tooltip, e);
  }

  function onMouseOut(e) {
    if (!enabled) return;
    if (hoveredEl) hoveredEl.classList.remove("ghl-finder-highlight");
    hoveredEl = null;
    if (tooltip) tooltip.classList.remove("visible");
  }

  function onClick(e) {
    if (!enabled) return;
    const el = e.target;
    if (el.closest(".ghl-finder-tooltip")) return;

    e.preventDefault();
    e.stopPropagation();

    if (stickyMode && hoveredEl) {
      pinTooltip(hoveredEl, e);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      if (pinnedTooltips.length) {
        removeAllPinned();
      } else if (enabled) {
        disable();
      }
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
    if (hoveredEl) hoveredEl.classList.remove("ghl-finder-highlight");
    hoveredEl = null;
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }
    removeAllPinned();
    document.removeEventListener("mouseover", onMouseOver, true);
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("mouseout", onMouseOut, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
  }

  // ── Message from popup ──

  chrome.runtime?.onMessage?.addListener((msg) => {
    if (msg.action === "toggleInspector") {
      msg.enabled ? enable() : disable();
    }
    if (msg.action === "toggleSticky") {
      stickyMode = msg.enabled;
    }
  });

  // ── Restore state on load ──
  chrome.storage?.local?.get(["inspectorEnabled", "stickyEnabled"], (data) => {
    if (data.inspectorEnabled) enable();
    if (data.stickyEnabled !== undefined) stickyMode = data.stickyEnabled;
  });

  // ── Utility ──
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
})();
