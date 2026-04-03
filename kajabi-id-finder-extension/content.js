(() => {
  "use strict";

  // ── State ──
  let enabled = false;
  let stickyMode = true;
  let hoveredEl = null;
  let tooltip = null;
  let pinnedTooltips = [];

  // ── Kajabi-specific class patterns ──
  const KAJABI_PATTERNS = [
    /^kjb/,           // kjb-*
    /^header__/,      // header__container, header__content--desktop
    /^footer__/,      // footer__block, footer__container
    /^section__/,     // section__overlay
    /^section$/,      // section
    /^section-/,      // section-sm, section-lg
    /^hero$/,         // hero sections
    /^btn--/,         // btn--large, btn--outline
    /^btn$/,
    /^image__/,       // image__image, image__overlay, image__overlay-text
    /^feature__/,     // feature__image
    /^products__/,    // products__col
    /^product__/,     // product__content
    /^link-list/,     // link-list, link-list__link, link-list__title
    /^dropdown__/,    // dropdown__item, dropdown__trigger
    /^hamburger__/,   // hamburger__slices, hamburger__slice
    /^logo__/,        // logo__image, logo__text
    /^user__/,        // user__login
    /^hello-bar/,     // hello-bar__text
    /^modal__/,       // modal__content
    /^overlay__/,     // overlay__inner, overlay__close
    /^optin__/,       // optin__panel
    /^form-/,         // form-control, form-btn, form-group
    /^social-icons/,  // social-icons__icon
    /^countdown/,     // countdown, countdown__item, countdown__amount
    /^video__/,       // video__wrapper
    /^pagination__/,  // pagination__link--prev
    /^checkout_/,     // checkout_offer_opt_in
    /^editor-overlay/,
    /^powered-by/,
    /^disclaimer-text/,
    /^sizer$/,
    /^container/,     // container, container--full, container-sm
    /^row$/,
    /^col-/,          // col-1 through col-12, col-sm-*, col-xs-*
    /^col$/,
    /^media/,         // media, media-body
  ];

  // ── ID patterns Kajabi uses ──
  const KAJABI_ID_PATTERN = /^(section-|block-|exit-pop|two-step|editor-|countdown-timer|form-button)/;

  // ── Kajabi-proprietary attributes to highlight ──
  const KAJABI_ATTRS = ["kjb-settings-id", "data-gb-custom-block", "data-tag", "data-end-time", "data-timezone"];

  // ── Helpers ──

  function isKajabiClass(cls) {
    return KAJABI_PATTERNS.some((p) => p.test(cls));
  }

  function isKajabiId(id) {
    return KAJABI_ID_PATTERN.test(id);
  }

  function classifyElement(el) {
    const tag = el.tagName.toLowerCase();
    const id = el.id || "";
    const cls = Array.from(el.classList);

    // ID-based classification
    if (id.startsWith("section-")) return "Section";
    if (id.startsWith("block-")) return "Block";

    // Class-based classification
    if (cls.includes("header") || cls.some((c) => c.startsWith("header__"))) return "Header";
    if (cls.includes("footer") || cls.some((c) => c.startsWith("footer__"))) return "Footer";
    if (cls.includes("row")) return "Row";
    if (cls.includes("container") || cls.includes("container--full")) return "Container";
    if (cls.includes("sizer")) return "Sizer";
    if (cls.includes("btn") || cls.some((c) => c.startsWith("btn--"))) return "Button";
    if (cls.some((c) => c.startsWith("image__"))) return "Image";
    if (cls.some((c) => c.startsWith("feature__"))) return "Feature";
    if (cls.some((c) => c.startsWith("product"))) return "Product";
    if (cls.some((c) => c.startsWith("form-"))) return "Form";
    if (cls.some((c) => c.startsWith("modal"))) return "Modal";
    if (cls.some((c) => c.startsWith("logo__"))) return "Logo";
    if (cls.some((c) => c.startsWith("dropdown__"))) return "Dropdown";
    if (cls.some((c) => c.startsWith("hamburger__"))) return "Menu";
    if (cls.some((c) => c.startsWith("hello-bar"))) return "Hello Bar";
    if (cls.some((c) => c.startsWith("link-list"))) return "Link List";
    if (cls.some((c) => c.startsWith("social-icons"))) return "Social";
    if (cls.some((c) => c.startsWith("countdown"))) return "Countdown";
    if (cls.some((c) => c.startsWith("section__"))) return "Section";

    // Tag-based fallback
    if (tag === "section") return "Section";
    if (tag === "nav") return "Nav";
    if (tag === "header") return "Header";
    if (tag === "footer") return "Footer";
    if (tag === "form") return "Form";
    if (tag === "a") return "Link";
    if (tag === "img") return "Image";
    if (/^h[1-6]$/.test(tag)) return "Heading";
    if (tag === "p") return "Text";

    return tag.toUpperCase();
  }

  function bestSelector(el) {
    // If element has a Kajabi-style ID, use it
    if (el.id) return `#${CSS.escape(el.id)}`;

    // kjb-settings-id is the most specific Kajabi selector
    const kjbId = el.getAttribute("kjb-settings-id");
    if (kjbId) return `[kjb-settings-id="${kjbId}"]`;

    // Prefer Kajabi-specific classes
    const cls = Array.from(el.classList);
    const kajabi = cls.filter(isKajabiClass);
    if (kajabi.length) return "." + kajabi.map(CSS.escape).join(".");

    // Fall back to first meaningful class
    const meaningful = cls.filter(
      (c) => !c.startsWith("kajabi-finder-") && c.length > 1
    );
    if (meaningful.length) return "." + CSS.escape(meaningful[0]);

    return el.tagName.toLowerCase();
  }

  // ── Find the parent section/block ID for context ──
  function findParentContext(el) {
    let current = el;
    const context = [];
    while (current && current !== document.body) {
      if (current.id && isKajabiId(current.id)) {
        context.unshift(`#${current.id}`);
      }
      current = current.parentElement;
    }
    return context.length ? context.join(" > ") : null;
  }

  // ── Tooltip creation ──

  function createTooltip() {
    const el = document.createElement("div");
    el.className = "kajabi-finder-tooltip";
    el.innerHTML = `
      <div class="kft-header">
        <span class="kft-tag"></span>
        <span class="kft-pinned-badge" style="display:none">PINNED</span>
        <button class="kft-close" style="display:none">&times;</button>
      </div>
      <div class="kft-body"></div>
      <div class="kft-selector" title="Click to copy selector">
        <code></code>
        <span class="kft-copy-icon">COPY</span>
      </div>
    `;
    document.body.appendChild(el);
    return el;
  }

  function populateTooltip(tip, el) {
    const tag = classifyElement(el);
    const id = el.id || null;
    const allClasses = Array.from(el.classList).filter(
      (c) => !c.startsWith("kajabi-finder-")
    );
    const kajabiClasses = allClasses.filter(isKajabiClass);
    const otherClasses = allClasses.filter((c) => !isKajabiClass(c));
    const selector = bestSelector(el);
    const parentContext = findParentContext(el.parentElement);

    // Header
    tip.querySelector(".kft-tag").textContent = tag;

    // Body
    const body = tip.querySelector(".kft-body");
    let html = "";

    if (id) {
      const idType = id.startsWith("section-") ? "Section ID" : id.startsWith("block-") ? "Block ID" : "ID";
      html += `<div class="kft-row">
        <div class="kft-label">${idType}</div>
        <div class="kft-value">#${escapeHtml(id)}</div>
      </div>`;
    }

    // Show kjb-settings-id prominently (Kajabi's proprietary editable element marker)
    const kjbSettingsId = el.getAttribute("kjb-settings-id");
    if (kjbSettingsId) {
      html += `<div class="kft-row">
        <div class="kft-label">KJB Settings ID</div>
        <div class="kft-value" style="color:#fbbf24">${escapeHtml(kjbSettingsId)}</div>
      </div>`;
    }

    // Show data-gb-custom-block if present
    const gbBlock = el.getAttribute("data-gb-custom-block");
    if (gbBlock !== null) {
      html += `<div class="kft-row">
        <div class="kft-label">Custom Block</div>
        <div class="kft-value" style="color:#fbbf24">${escapeHtml(gbBlock || "true")}</div>
      </div>`;
    }

    if (parentContext && !(id && isKajabiId(id))) {
      html += `<div class="kft-row">
        <div class="kft-label">Parent Context</div>
        <div class="kft-value" style="font-size:11px;color:#888">${escapeHtml(parentContext)}</div>
      </div>`;
    }

    if (kajabiClasses.length) {
      html += `<div class="kft-row">
        <div class="kft-label">Kajabi Classes</div>
        <div class="kft-class-list">
          ${kajabiClasses.map((c) => `<span class="kft-class-pill" data-class="${escapeHtml(c)}">.${escapeHtml(c)}</span>`).join("")}
        </div>
      </div>`;
    }

    if (otherClasses.length) {
      html += `<div class="kft-row">
        <div class="kft-label">Other Classes</div>
        <div class="kft-class-list">
          ${otherClasses.slice(0, 12).map((c) => `<span class="kft-class-pill" data-class="${escapeHtml(c)}">.${escapeHtml(c)}</span>`).join("")}
          ${otherClasses.length > 12 ? `<span class="kft-class-pill" style="opacity:.5">+${otherClasses.length - 12} more</span>` : ""}
        </div>
      </div>`;
    }

    // Data attributes (very useful in Kajabi — data-reveal-offset, data-slick-id, kjb-settings-id, etc.)
    const dataAttrs = Array.from(el.attributes)
      .filter((a) => (a.name.startsWith("data-") || KAJABI_ATTRS.includes(a.name)) && a.value && a.name !== "kjb-settings-id" && a.name !== "data-gb-custom-block")
      .slice(0, 6);
    if (dataAttrs.length) {
      html += `<div class="kft-row">
        <div class="kft-label">Data Attributes</div>
        ${dataAttrs.map((a) => `<div class="kft-value" style="font-size:11px">${escapeHtml(a.name)}="${escapeHtml(a.value.slice(0, 60))}"</div>`).join("")}
      </div>`;
    }

    body.innerHTML = html;

    // Selector bar
    tip.querySelector(".kft-selector code").textContent = selector;

    // Bind click-to-copy on pills
    tip.querySelectorAll(".kft-class-pill[data-class]").forEach((pill) => {
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
    const selectorBar = tip.querySelector(".kft-selector");
    selectorBar.onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(selector).then(() => {
        selectorBar.classList.add("copied");
        tip.querySelector(".kft-copy-icon").textContent = "COPIED!";
        setTimeout(() => {
          selectorBar.classList.remove("copied");
          tip.querySelector(".kft-copy-icon").textContent = "COPY";
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
    pinned.querySelector(".kft-pinned-badge").style.display = "";
    const closeBtn = pinned.querySelector(".kft-close");
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
    if (el.closest(".kajabi-finder-tooltip")) return;

    if (hoveredEl) hoveredEl.classList.remove("kajabi-finder-highlight");
    el.classList.add("kajabi-finder-highlight");
    hoveredEl = el;

    if (!tooltip) tooltip = createTooltip();
    populateTooltip(tooltip, el);
    tooltip.classList.add("visible");
    positionTooltip(tooltip, e);
  }

  function onMouseMove(e) {
    if (!enabled || !tooltip) return;
    if (e.target.closest(".kajabi-finder-tooltip")) return;
    positionTooltip(tooltip, e);
  }

  function onMouseOut(e) {
    if (!enabled) return;
    if (hoveredEl) hoveredEl.classList.remove("kajabi-finder-highlight");
    hoveredEl = null;
    if (tooltip) tooltip.classList.remove("visible");
  }

  function onClick(e) {
    if (!enabled) return;
    const el = e.target;
    if (el.closest(".kajabi-finder-tooltip")) return;

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
    if (hoveredEl) hoveredEl.classList.remove("kajabi-finder-highlight");
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
  chrome.storage?.local?.get(["kajabiInspectorEnabled", "kajabiStickyEnabled"], (data) => {
    if (data.kajabiInspectorEnabled) enable();
    if (data.kajabiStickyEnabled !== undefined) stickyMode = data.kajabiStickyEnabled;
  });

  // ── Utility ──
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
})();
