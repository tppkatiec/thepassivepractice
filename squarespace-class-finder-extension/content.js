(() => {
  "use strict";

  let enabled = false;
  let stickyMode = true;
  let hoveredEl = null;
  let tooltip = null;
  let pinnedTooltips = [];

  // ── Squarespace class patterns ──
  const SQS_PATTERNS = [
    /^sqs-/,                  // all sqs-* (blocks, layout, gallery, cart, svg-icon, etc.)
    /^sqsrte-/,               // rich text editor classes
    /^fe-/,                   // Fluid Engine (fe-block, fe-block-{id}, fe-{sectionId})
    /^fluid-engine/,
    /^yui3-/,                 // legacy YUI widgets
    /^page-section/,          // page-section, page-section-*
    /^section-background/,    // section-background, section-background-overlay
    /^section-border/,
    /^section-divider/,
    /^section-/,
    /^content-wrapper$/,
    /^content-wrap$/,
    /^content$/,
    /^sections$/,
    /^collection-content-wrapper/,
    /^collection-/,           // collection-{id}, collection-type-*, collection-layout-*
    /^homepage$/,
    /^view-list$/,
    /^view-item$/,
    /^has-/,                  // has-primary-nav, has-cart, has-logo-image, etc.
    /^tweak-/,                // tweak-* (Site Styles toggles)
    /^scale-/,                // scale-heading-1-font-size, etc.
    /^button-style-/,
    /^button-corner-style-/,
    /^(small|medium|large)-button-shape-/,
    /^image-block-/,          // image-block-card, image-block-outer-wrapper, etc.
    /^gallery-design-/,
    /^gallery-aspect-ratio-/,
    /^gallery-transitions-/,
    /^gallery-/,
    /^event-/,                // event-thumbnails, event-list-*, event-date-label
    /^product-list-/,
    /^product-item-/,
    /^product-/,
    /^show-product-/,
    /^newsletter-style-/,
    /^opentable-style-/,
    /^lightbox-style-/,
    /^social-icons-/,
    /^social-icon-/,
    /^ancillary-/,            // ancillary-header-*-position-*
    /^index-/,                // index-section, index-gallery-*, index-item
    /^page-banner-/,
    /^page-description$/,
    /^page-text-wrapper$/,
    /^page-title$/,
    /^main-content$/,
    /^main-nav$/,
    /^mobileNav$/,
    /^nav-wrapper$/,
    /^primary-nav-wrapper$/,
    /^secondary-nav-wrapper$/,
    /^logo-wrapper$/,
    /^site-/,                 // site-header, site-footer, site-container, etc.
    /^summary-/,              // summary-block-*, summary-title, summary-item
    /^image-list$/,
    /^image-meta$/,
    /^image$/,
    /^image-caption-wrapper$/,
    /^spacer-block$/,
    /^html-block$/,
    /^social-account-links/,
    /^user-items-list/,
    /^form-wrapper$/,
    /^field-list$/,
    /^form-submission/,
    /^native-currency-code-/,
    /^mobile-style-available$/,
    /^touch-styles$/,
    // ── 7.0 Brine/Bedford PascalCase BEM ──
    /^Main$/,
    /^Site/,
    /^Header/,
    /^Footer/,
    /^Mobile-bar/,
    /^Mobile-overlay/,
    /^Parent-item$/,
    /^Icon/,
    /^Index-/,
    /^header-/,
    /^footer-/,
    /^js-/,                   // js-index-item-image, js-* hooks
  ];

  const SQS_BLOCK_TYPES = {
    "sqs-block-image": "Image Block",
    "sqs-block-html": "Text/HTML Block",
    "sqs-block-video": "Video Block",
    "sqs-block-gallery": "Gallery Block",
    "sqs-block-button": "Button Block",
    "sqs-block-spacer": "Spacer Block",
    "sqs-block-code": "Code Block",
    "sqs-block-form": "Form Block",
    "sqs-block-map": "Map Block",
    "sqs-block-newsletter": "Newsletter Block",
    "sqs-block-quote": "Quote Block",
    "sqs-block-twitter": "Twitter Block",
    "sqs-block-social-links": "Social Links Block",
    "sqs-block-socialaccountlinks": "Social Links (v2) Block",
    "sqs-block-audio": "Audio Block",
    "sqs-block-markdown": "Markdown Block",
    "sqs-block-menu": "Menu Block",
    "sqs-block-pricing-plan": "Pricing Block",
    "sqs-block-product": "Product Block",
    "sqs-block-summary-v2": "Summary Block",
    "sqs-block-carousel": "Carousel Block",
    "sqs-block-accordion": "Accordion Block",
    "sqs-block-tourdates": "Tour Dates Block",
    "sqs-block-calendar": "Calendar Block",
    "sqs-block-chart": "Chart Block",
    "sqs-block-donation": "Donation Block",
    "sqs-block-horizontalrule": "Horizontal Rule Block",
    "sqs-block-collectionlink": "Collection Link Block",
    "sqs-block-countdown": "Countdown Block",
    "sqs-block-opentable": "OpenTable Block",
    "sqs-block-embed": "Embed Block",
    "sqs-block-search": "Search Block",
    "sqs-block-ical": "iCal Block",
    "sqs-block-archive": "Archive Block",
    "sqs-block-instagram": "Instagram Block",
    "sqs-block-tag-cloud": "Tag Cloud Block",
    "sqs-block-tock": "Tock Block",
    "sqs-block-zola": "Zola Block",
    "sqs-block-acuity": "Acuity Block",
    "sqs-block-foursquare": "Foursquare Block",
    "sqs-block-yelp-review": "Yelp Review Block",
    "sqs-block-flickr": "Flickr Block",
    "sqs-block-500px": "500px Block",
    "sqs-block-soundcloud": "SoundCloud Block",
    "sqs-block-website-component": "Website Component Block",
  };

  // ── Helpers ──

  function isSqsClass(cls) {
    return SQS_PATTERNS.some((p) => p.test(cls));
  }

  function classifyElement(el) {
    const cls = Array.from(el.classList);
    const tag = el.tagName.toLowerCase();

    // Check for specific block types
    for (const [sqsClass, label] of Object.entries(SQS_BLOCK_TYPES)) {
      if (cls.includes(sqsClass)) return label;
    }

    if (cls.some((c) => c === "sqs-block")) return "Block";
    if (cls.some((c) => c === "sqs-block-content")) return "Block Content";
    if (cls.some((c) => c.startsWith("sqs-row"))) return "Row";
    if (cls.some((c) => c.startsWith("sqs-col-"))) return "Column";
    if (cls.some((c) => c.startsWith("sqs-layout"))) return "Layout";
    if (cls.some((c) => c.startsWith("page-section"))) return "Page Section";
    if (cls.some((c) => c.startsWith("fe-"))) return "Fluid Engine";
    if (cls.some((c) => c.startsWith("sqs-gallery"))) return "Gallery";
    if (cls.some((c) => c.startsWith("summary-"))) return "Summary";
    if (cls.includes("Header") || cls.some((c) => c.startsWith("header-"))) return "Header";
    if (cls.includes("Footer") || cls.some((c) => c.startsWith("footer-"))) return "Footer";
    if (cls.includes("Main")) return "Main";
    if (cls.some((c) => c.startsWith("Site"))) return "Site";

    if (tag === "section") return "Section";
    if (tag === "nav") return "Nav";
    if (tag === "a") return "Link";
    if (tag === "img") return "Image";
    if (tag === "button") return "Button";
    if (/^h[1-6]$/.test(tag)) return "Heading";
    if (tag === "p") return "Text";

    return tag.toUpperCase();
  }

  function bestSelector(el) {
    // Prefer the most specific sqs-block-* class
    const cls = Array.from(el.classList);
    const sqsBlockType = cls.find((c) => SQS_BLOCK_TYPES[c]);
    if (sqsBlockType) return "." + CSS.escape(sqsBlockType);

    // Then any sqs-specific class
    const sqsClasses = cls.filter(isSqsClass);
    if (sqsClasses.length) return "." + sqsClasses.slice(0, 2).map(CSS.escape).join(".");

    // Fall back to first meaningful class
    const meaningful = cls.filter(
      (c) => !c.startsWith("sqsf-") && c.length > 1
    );
    if (meaningful.length) return "." + CSS.escape(meaningful[0]);

    return el.tagName.toLowerCase();
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
      <div class="sqsf-selector" title="Click to copy selector">
        <code></code>
        <span class="sqsf-copy-icon">COPY</span>
      </div>
    `;
    document.body.appendChild(el);
    return el;
  }

  function populateTooltip(tip, el) {
    const tag = classifyElement(el);
    const allClasses = Array.from(el.classList).filter(
      (c) => !c.startsWith("sqsf-")
    );
    const sqsClasses = allClasses.filter(isSqsClass);
    const otherClasses = allClasses.filter((c) => !isSqsClass(c));
    const selector = bestSelector(el);

    tip.querySelector(".sqsf-tag").textContent = tag;

    const body = tip.querySelector(".sqsf-body");
    let html = "";

    if (sqsClasses.length) {
      html += `<div class="sqsf-row">
        <div class="sqsf-label">Squarespace Classes (${sqsClasses.length})</div>
        <div class="sqsf-class-list">
          ${sqsClasses.map((c) => `<span class="sqsf-class-pill sqs" data-class="${escapeHtml(c)}">.${escapeHtml(c)}</span>`).join("")}
        </div>
      </div>`;
    }

    if (otherClasses.length) {
      html += `<div class="sqsf-row">
        <div class="sqsf-label">Other Classes (${otherClasses.length})</div>
        <div class="sqsf-class-list">
          ${otherClasses.slice(0, 15).map((c) => `<span class="sqsf-class-pill" data-class="${escapeHtml(c)}">.${escapeHtml(c)}</span>`).join("")}
          ${otherClasses.length > 15 ? `<span class="sqsf-class-pill" style="opacity:.5">+${otherClasses.length - 15} more</span>` : ""}
        </div>
      </div>`;
    }

    if (!sqsClasses.length && !otherClasses.length) {
      html += `<div class="sqsf-row"><div class="sqsf-value" style="color:#666;font-style:italic">No classes on this element</div></div>`;
    }

    // Data attributes
    const dataAttrs = Array.from(el.attributes)
      .filter((a) => a.name.startsWith("data-") && a.value)
      .slice(0, 5);
    if (dataAttrs.length) {
      html += `<div class="sqsf-row">
        <div class="sqsf-label">Data Attributes</div>
        ${dataAttrs.map((a) => `<div class="sqsf-value" style="font-size:11px">${escapeHtml(a.name)}="${escapeHtml(a.value.slice(0, 60))}"</div>`).join("")}
      </div>`;
    }

    body.innerHTML = html;
    tip.querySelector(".sqsf-selector code").textContent = selector;

    // Bind click-to-copy on pills
    tip.querySelectorAll(".sqsf-class-pill[data-class]").forEach((pill) => {
      pill.addEventListener("click", (e) => {
        e.stopPropagation();
        const cls = "." + pill.dataset.class;
        navigator.clipboard.writeText(cls).then(() => {
          pill.classList.add("copied");
          const orig = pill.textContent;
          pill.textContent = "Copied!";
          setTimeout(() => {
            pill.classList.remove("copied");
            pill.textContent = orig;
          }, 1200);
        });
      });
    });

    // Selector bar
    const selectorBar = tip.querySelector(".sqsf-selector");
    selectorBar.onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(selector).then(() => {
        selectorBar.classList.add("copied");
        tip.querySelector(".sqsf-copy-icon").textContent = "COPIED!";
        setTimeout(() => {
          selectorBar.classList.remove("copied");
          tip.querySelector(".sqsf-copy-icon").textContent = "COPY";
        }, 1200);
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

  chrome.runtime?.onMessage?.addListener((msg) => {
    if (msg.action === "toggleInspector") msg.enabled ? enable() : disable();
    if (msg.action === "toggleSticky") stickyMode = msg.enabled;
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
})();
