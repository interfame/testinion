/* ============================================================
   RushCodeLab — Static Site Interactivity
   Clean, readable vanilla JavaScript (no dependencies)
   Handles: navbar, mobile menu, dropdowns, animated counters,
   reveal-on-scroll, accordions, category filters, Radix-style
   tabs (Panels & Apps), reseller revenue calculator, and form
   (mailto) fallback.
   ============================================================ */

(function () {
  "use strict";

  // ---- Helpers ----------------------------------------------------------
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  // ---- 1. Navbar: scroll shadow + glass toggle -------------------------
  function initNavbarScroll() {
    const nav = $("#rcl-nav");
    if (!nav) return;
    const update = () => {
      const scrolled = window.scrollY > 16;
      nav.classList.toggle("glass-strong", scrolled);
      nav.classList.toggle("glass", !scrolled);
      nav.classList.toggle("h-14", scrolled);
      nav.classList.toggle("h-16", !scrolled);
      nav.classList.toggle("shadow-[0_8px_40px_-12px_oklch(0_0_0/0.6)]", scrolled);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  // ---- 2. Desktop dropdowns (CSS hover for desktop, JS click for touch) ----
  function initDropdowns() {
    const hasHover = window.matchMedia("(hover: hover)").matches;

    $$(".rcl-nav-group").forEach((group) => {
      const panel = $(".rcl-mega-panel", group);
      const btn = $(".rcl-nav-trigger", group);
      if (!panel || !btn) return;

      // On touch devices (no hover), use click to toggle
      if (!hasHover) {
        on(btn, "click", (e) => {
          e.preventDefault();
          const isOpen = panel.style.display === "block";
          // Close all other panels
          $$(".rcl-mega-panel").forEach((p) => (p.style.display = "none"));
          $$(".rcl-nav-trigger").forEach((b) => b.setAttribute("aria-expanded", "false"));
          // Toggle this one
          panel.style.display = isOpen ? "none" : "block";
          btn.setAttribute("aria-expanded", isOpen ? "false" : "true");
        });
      }

      // Keyboard support (both desktop and touch)
      on(btn, "keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const isOpen = panel.style.display === "block";
          panel.style.display = isOpen ? "none" : "block";
          btn.setAttribute("aria-expanded", isOpen ? "false" : "true");
        } else if (e.key === "Escape") {
          panel.style.display = "none";
          btn.setAttribute("aria-expanded", "false");
        }
      });
    });

    // Close dropdowns when clicking outside (touch devices)
    if (!hasHover) {
      on(document, "click", (e) => {
        if (!e.target.closest(".rcl-nav-group")) {
          $$(".rcl-mega-panel").forEach((p) => (p.style.display = "none"));
          $$(".rcl-nav-trigger").forEach((b) => b.setAttribute("aria-expanded", "false"));
        }
      });
    }
  }

  // ---- 3. Mobile menu (slide-in panel) ---------------------------------
  function initMobileMenu() {
    const toggle = $("#rcl-mobile-toggle");
    const panel = $("#rcl-mobile-panel");
    const overlay = $("#rcl-mobile-overlay");
    const closeBtn = $("#rcl-mobile-close");
    if (!toggle || !panel) return;

    const open = () => {
      panel.classList.add("rcl-mobile-open");
      if (overlay) overlay.style.display = "block";
      document.body.style.overflow = "hidden";
    };
    const close = () => {
      panel.classList.remove("rcl-mobile-open");
      if (overlay) overlay.style.display = "none";
      document.body.style.overflow = "";
    };

    on(toggle, "click", open);
    on(closeBtn, "click", close);
    on(overlay, "click", close);

    // Close on link click
    $$("a", panel).forEach((a) => on(a, "click", close));

    // Accordion groups inside mobile panel
    $$(".rcl-mobile-group", panel).forEach((group) => {
      const btn = $(".rcl-mobile-group-btn", group);
      const body = $(".rcl-mobile-group-body", group);
      if (!btn || !body) return;
      on(btn, "click", () => {
        const isOpen = body.style.display === "block";
        // close all
        $$(".rcl-mobile-group-body", panel).forEach((b) => (b.style.display = "none"));
        $$("[data-chevron]", panel).forEach((c) => c.classList.remove("rotate-180"));
        // open this one
        if (!isOpen) {
          body.style.display = "block";
          const chev = $("[data-chevron]", btn);
          if (chev) chev.classList.add("rotate-180");
        }
      });
    });
  }

  // ---- 4. Animated counters --------------------------------------------
  function initCounters() {
    const counters = $$("[data-count-to]");
    if (!counters.length) return;

    const animate = (el) => {
      const target = parseFloat(el.dataset.countTo);
      const decimals = parseInt(el.dataset.decimals || "0", 10);
      const prefix = el.dataset.prefix || "";
      const suffix = el.dataset.suffix || "";
      const duration = 1800;
      const start = performance.now();

      const format = (v) =>
        v.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });

      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        const val = target * eased;
        el.textContent = prefix + format(val) + suffix;
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = prefix + format(target) + suffix;
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            animate(e.target);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach((c) => io.observe(c));
  }

  // ---- 5. Reveal on scroll ---------------------------------------------
  function initReveal() {
    const reveals = $$(".reveal");
    if (!reveals.length) return;

    // If IntersectionObserver isn't available, show everything
    if (!("IntersectionObserver" in window)) {
      reveals.forEach((r) => r.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((r) => io.observe(r));
  }

  // ---- 6. Accordions (FAQ etc.) ----------------------------------------
  function initAccordions() {
    $$('[data-accordion-trigger]').forEach((trigger) => {
      const item = trigger.closest('[data-accordion-item]');
      if (!item) return;
      // Content is the next sibling of the item (h3)
      let content = item.nextElementSibling;
      if (!content || !content.hasAttribute('data-accordion-content')) {
        // Fallback: search within the accordion root
        const root = item.closest('[data-accordion]');
        if (root) {
          const items = $$('[data-accordion-item]', root);
          const idx = items.indexOf(item);
          const contents = $$('[data-accordion-content]', root);
          if (contents[idx]) content = contents[idx];
        }
      }
      if (!content) return;

      on(trigger, "click", () => {
        const isOpen = item.getAttribute('data-state') === 'open';
        // Close all siblings in same accordion
        const root = item.closest('[data-accordion]');
        if (root) {
          $$('[data-accordion-item]', root).forEach((sib) => {
            if (sib !== item) {
              sib.setAttribute('data-state', 'closed');
              const c = sib.nextElementSibling;
              if (c && c.hasAttribute('data-accordion-content')) {
                c.style.height = '0px';
              }
            }
          });
        }
        // Toggle current
        if (isOpen) {
          item.setAttribute('data-state', 'closed');
          content.style.height = '0px';
        } else {
          item.setAttribute('data-state', 'open');
          content.style.height = content.scrollHeight + 'px';
        }
      });
    });
  }

  // ---- 7. Category filters (portfolio, white-label) --------------------
  function initFilters() {
    $$('[data-filter-group]').forEach((group) => {
      const buttons = $$('[data-filter]', group);
      const items = $$('[data-filter-item]', group);
      if (!buttons.length || !items.length) return;

      buttons.forEach((btn) => {
        on(btn, "click", () => {
          const cat = btn.dataset.filter;
          buttons.forEach((b) => {
            b.classList.remove("bg-primary", "text-primary-foreground");
            b.classList.add("glass");
          });
          btn.classList.add("bg-primary", "text-primary-foreground");
          btn.classList.remove("glass");

          items.forEach((item) => {
            const itemCat = item.dataset.filterItem;
            if (cat === "all" || itemCat === cat) {
              item.style.display = "";
              item.style.opacity = "1";
              item.style.transform = "scale(1)";
            } else {
              item.style.display = "none";
            }
          });
        });
      });
    });
  }


  // ---- 8. Radix-style tabs (Panels & Apps in white-label product pages) ----
  function initTabs() {
    const triggers = $$('[data-slot="tabs-trigger"]');
    if (!triggers.length) return;
    function activate(trigger) {
      const tablist = trigger.closest('[role="tablist"]');
      const siblings = tablist ? $$('[data-slot="tabs-trigger"]', tablist) : triggers;
      siblings.forEach((sib) => { sib.setAttribute("data-state","inactive"); sib.setAttribute("aria-selected","false"); sib.setAttribute("tabindex","-1"); });
      trigger.setAttribute("data-state","active"); trigger.setAttribute("aria-selected","true"); trigger.setAttribute("tabindex","0");
      const panelId = trigger.getAttribute("aria-controls");
      if (!panelId) return;
      const panel = document.getElementById(panelId);
      if (!panel) return;
      const prefixMatch = panelId.match(/^(.+)-content-.+$/);
      let panels = [];
      if (prefixMatch) { const prefix = prefixMatch[1] + "-content-"; panels = $$('[id^="' + prefix.replace(/"/g, '\"') + '"]'); }
      if (!panels.length) panels = [panel];
      panels.forEach((p) => { p.setAttribute("data-state","inactive"); p.setAttribute("hidden",""); });
      panel.setAttribute("data-state","active"); panel.removeAttribute("hidden");
    }
    triggers.forEach((trigger) => {
      on(trigger, "click", () => activate(trigger));
      on(trigger, "keydown", (e) => {
        const tablist = trigger.closest('[role="tablist"]'); if (!tablist) return;
        const sibs = $$('[data-slot="tabs-trigger"]', tablist);
        const idx = sibs.indexOf(trigger);
        let target = null;
        if (e.key === "ArrowRight") target = sibs[(idx+1)%sibs.length];
        else if (e.key === "ArrowLeft") target = sibs[(idx-1+sibs.length)%sibs.length];
        else if (e.key === "Home") target = sibs[0];
        else if (e.key === "End") target = sibs[sibs.length-1];
        if (target) { e.preventDefault(); target.focus(); activate(target); }
      });
    });
  }

  // ---- 9. Reseller revenue calculator ----------------------------------
  function initResellerCalculator() {
    const calc = $("#revenue-calculator");
    if (!calc) return;

    const clientsInput = $("#calc-clients");
    const avgInput = $("#calc-avg");
    const commissionInput = $("#calc-commission");
    const monthlyEl = $("#calc-monthly");
    const yearlyEl = $("#calc-yearly");
    const chartEl = $("#calc-chart");

    if (!clientsInput || !avgInput || !commissionInput) return;

    // Update the slider fill bar
    function updateSliderFill(input) {
      const fill = input.parentElement.querySelector(".rcl-range-fill");
      if (!fill) return;
      const min = parseFloat(input.min);
      const max = parseFloat(input.max);
      const val = parseFloat(input.value);
      const pct = ((val - min) / (max - min)) * 100;
      fill.style.width = pct + "%";
    }

    // Update the value label
    function updateLabel(input, labelEl, format) {
      if (labelEl) labelEl.textContent = format(parseFloat(input.value));
    }

    // Format currency
    const fmtMoney = (v) => "$" + Math.round(v).toLocaleString("en-US");

    // Format number
    const fmtNum = (v) => Math.round(v).toLocaleString("en-US");

    // Build chart bars
    function renderChart(monthly) {
      if (!chartEl) return;
      // Target the inner flex container if present, else the chart element itself
      const target = chartEl.querySelector(".rcl-chart-container") || chartEl;
      const points = 13;
      const bars = [];
      for (let i = 0; i < points; i++) {
        const v = monthly * (0.7 + (i / 12) * 0.5);
        const pct = ((v / (monthly * 1.3)) * 100).toFixed(1);
        bars.push(
          `<div class="rcl-chart-bar" style="height:${Math.max(pct, 4)}%" title="M${i + 1}: ${fmtMoney(v)}"></div>`
        );
      }
      target.innerHTML = bars.join("");
    }

    // Slider value labels
    const clientsLabel = $("#calc-clients-label");
    const avgLabel = $("#calc-avg-label");
    const commissionLabel = $("#calc-commission-label");

    function recalc() {
      const c = parseFloat(clientsInput.value);
      const a = parseFloat(avgInput.value);
      const com = parseFloat(commissionInput.value);
      const monthly = (c * a * com) / 100;
      const yearly = monthly * 12;

      if (monthlyEl) monthlyEl.textContent = fmtMoney(monthly);
      if (yearlyEl) yearlyEl.textContent = fmtMoney(yearly);

      updateSliderFill(clientsInput);
      updateSliderFill(avgInput);
      updateSliderFill(commissionInput);

      updateLabel(clientsInput, clientsLabel, fmtNum);
      updateLabel(avgInput, avgLabel, fmtMoney);
      updateLabel(commissionInput, commissionLabel, (v) => v + "%");

      renderChart(monthly);
    }

    [clientsInput, avgInput, commissionInput].forEach((inp) => {
      on(inp, "input", recalc);
    });

    recalc();
  }

  // ---- 10. Forms (mailto fallback) ----- --------------------------------------
  function initForms() {
    $$("form[data-mailto]").forEach((form) => {
      on(form, "submit", (e) => {
        e.preventDefault();
        const to = form.dataset.mailto;
        const subject = form.dataset.subject || "Contact from RushCodeLab website";
        const fields = $$("input, textarea, select", form);
        const bodyParts = [];
        fields.forEach((f) => {
          if (!f.name) return;
          const label = f.name.charAt(0).toUpperCase() + f.name.slice(1);
          bodyParts.push(label + ": " + f.value);
        });
        const body = bodyParts.join("\n");
        const mailto =
          "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
        window.location.href = mailto;

        // Show success message
        const success = $("[data-form-success]", form.parentElement);
        if (success) {
          form.style.display = "none";
          success.style.display = "block";
        }
      });
    });
  }

  // ---- 11. Tilt cards (subtle 3D hover) --------------------------------
  function initTilt() {
    if (window.matchMedia("(hover: none)").matches) return;
    $$("[data-tilt]").forEach((card) => {
      on(card, "mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
      });
      on(card, "mouseleave", () => {
        card.style.transform = "";
      });
    });
  }

  // ---- Init everything --------------------------------------------------
  ready(() => {
    initNavbarScroll();
    initDropdowns();
    initMobileMenu();
    initCounters();
    initReveal();
    initAccordions();
    initFilters();
    initTabs();
    initResellerCalculator();
    initForms();
    initTilt();
  });
})();
