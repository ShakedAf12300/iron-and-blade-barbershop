/* =========================================================
   Iron & Blade Barbershop — interactions
   ========================================================= */
(() => {
  "use strict";

  document.documentElement.classList.remove("no-js");

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  // Opening hours [open, close] in 24h, indexed by Date#getDay() (0 = Sunday)
  const HOURS = {
    0: null,
    1: [10, 20],
    2: [10, 20],
    3: [10, 20],
    4: [10, 21],
    5: [9, 21],
    6: [9, 18],
  };

  /* ---------- Sticky nav ---------- */
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 30);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile menu ---------- */
  const burger = $("#burger");
  const menu = $("#navMenu");

  const setMenu = (open) => {
    menu.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("menu-open", open);
  };

  burger.addEventListener("click", () => setMenu(!menu.classList.contains("is-open")));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("is-open")) setMenu(false);
  });
  window.matchMedia("(min-width: 900px)").addEventListener("change", (e) => e.matches && setMenu(false));

  /* ---------- Active nav link ---------- */
  const navLinks = $$(".nav__menu ul a");
  const sections = navLinks.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${entry.target.id}`));
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach((s) => spy.observe(s));

  /* ---------- Scroll reveal ---------- */
  const revealer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  $$(".reveal").forEach((el) => revealer.observe(el));

  /* ---------- Hero stat counters ----------
     The HTML already holds the final values, so they show without JS.
     Here we reset them to 0 and count up once the stats scroll into view. */
  const counters = $$("[data-count]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const formatCount = (el, n) => {
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const animateCount = (el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const duration = 1800;
    const start = performance.now();

    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = formatCount(el, target * eased) + (p === 1 ? suffix : "");
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if (!reduceMotion && counters.length) {
    counters.forEach((el) => (el.textContent = formatCount(el, 0)));
    const counterObserver = new IntersectionObserver((entries, obs) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      obs.disconnect();
      // wait for the hero fade-in on first load, start right away if scrolled to later
      setTimeout(() => counters.forEach(animateCount), Math.max(0, 900 - performance.now()));
    });
    counterObserver.observe(counters[0].closest(".hero__stats"));
  }

  /* ---------- Gallery lightbox ---------- */
  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "Image preview");
  lightbox.innerHTML = '<button class="lightbox__close" aria-label="Close preview">&times;</button><img alt="" />';
  document.body.appendChild(lightbox);
  const lbImg = $("img", lightbox);
  const lbClose = $(".lightbox__close", lightbox);
  let lastFocus = null;

  const openLightbox = (img) => {
    lastFocus = document.activeElement;
    lbImg.src = img.src.replace(/w=\d+/, "w=1600");
    lbImg.alt = img.alt;
    lightbox.classList.add("is-open");
    document.body.classList.add("menu-open");
    lbClose.focus();
  };
  const closeLightbox = () => {
    lightbox.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    lastFocus?.focus();
  };

  $$(".gallery__item").forEach((item) => {
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    const img = $("img", item);
    item.setAttribute("aria-label", `View larger: ${img.alt}`);
    item.addEventListener("click", () => openLightbox(img));
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLightbox(img);
      }
    });
  });
  lightbox.addEventListener("click", (e) => e.target !== lbImg && closeLightbox());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("is-open")) closeLightbox();
  });

  /* ---------- Opening hours: highlight today + live status ---------- */
  const now = new Date();
  const today = now.getDay();
  $(`#hours li[data-day="${today}"]`)?.classList.add("is-today");

  const status = $("#hoursStatus");
  const todayHours = HOURS[today];
  const hourNow = now.getHours() + now.getMinutes() / 60;
  if (todayHours && hourNow >= todayHours[0] && hourNow < todayHours[1]) {
    status.textContent = `Open now · closes at ${todayHours[1]}:00`;
    status.classList.add("is-open");
  } else {
    let d = today;
    let label = "";
    if (todayHours && hourNow < todayHours[0]) {
      label = `today at ${String(todayHours[0]).padStart(2, "0")}:00`;
    } else {
      for (let i = 1; i <= 7; i++) {
        d = (today + i) % 7;
        if (HOURS[d]) {
          const name = i === 1 ? "tomorrow" : new Date(now.getTime() + i * 864e5).toLocaleDateString("en-US", { weekday: "long" });
          label = `${name} at ${String(HOURS[d][0]).padStart(2, "0")}:00`;
          break;
        }
      }
    }
    status.textContent = `Closed now · opens ${label}`;
    status.classList.add("is-closed");
  }

  /* ---------- Booking form ---------- */
  const form = $("#bookingForm");
  const dateInput = $("#date");
  const timeSelect = $("#time");
  const confirmBox = $("#confirm");
  const submitBtn = $("#submitBtn");

  const toISODate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parseDate = (v) => {
    const [y, m, d] = v.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  dateInput.min = toISODate(now);
  const maxDate = new Date(now);
  maxDate.setDate(maxDate.getDate() + 60);
  dateInput.max = toISODate(maxDate);

  const fillTimes = () => {
    const prev = timeSelect.value;
    timeSelect.innerHTML = "";
    const placeholder = new Option("Select a time", "", true, true);
    placeholder.disabled = true;
    timeSelect.add(placeholder);

    if (!dateInput.value) {
      timeSelect.disabled = false;
      return;
    }

    const date = parseDate(dateInput.value);
    const hours = HOURS[date.getDay()];
    if (!hours) {
      placeholder.textContent = "Closed on Sundays";
      timeSelect.disabled = true;
      return;
    }

    const isToday = toISODate(date) === toISODate(new Date());
    const nowH = new Date().getHours() + new Date().getMinutes() / 60;
    let count = 0;
    // last slot starts 1 hour before closing
    for (let t = hours[0]; t <= hours[1] - 1; t += 0.5) {
      if (isToday && t <= nowH + 0.5) continue;
      const h = Math.floor(t);
      const label = `${String(h).padStart(2, "0")}:${t % 1 ? "30" : "00"}`;
      timeSelect.add(new Option(label, label));
      count++;
    }
    if (!count) {
      placeholder.textContent = "No slots left today";
      timeSelect.disabled = true;
      return;
    }
    timeSelect.disabled = false;
    if ([...timeSelect.options].some((o) => o.value === prev && prev)) timeSelect.value = prev;
  };

  dateInput.addEventListener("change", () => {
    fillTimes();
    validateField(dateInput);
  });
  fillTimes();

  const validateField = (el) => {
    const field = el.closest(".field");
    const err = $(".field__error", field);
    let valid = el.checkValidity();

    if (el === dateInput && err) {
      err.textContent = err.dataset.default;
      if (el.value && !HOURS[parseDate(el.value).getDay()]) {
        valid = false;
        err.textContent = "We're closed on Sundays — please pick another day.";
      } else if (el.value && valid === false) {
        err.textContent = "Please choose a date within the next 60 days.";
      }
    }
    if (el === timeSelect && el.disabled) valid = false;

    field.classList.toggle("has-error", !valid);
    return valid;
  };

  const fields = $$("input, select", form);
  fields.forEach((el) => {
    el.addEventListener("blur", () => el.value && validateField(el));
    el.addEventListener("input", () => el.closest(".field").classList.contains("has-error") && validateField(el));
    el.addEventListener("change", () => el.closest(".field").classList.contains("has-error") && validateField(el));
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const results = fields.map(validateField);
    const firstInvalid = fields[results.indexOf(false)];
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    const data = Object.fromEntries(new FormData(form));
    submitBtn.classList.add("is-loading");
    $(".btn__label", submitBtn).textContent = "Booking…";

    // Simulated network request (demo only)
    setTimeout(() => {
      const prettyDate = parseDate(data.date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      const firstName = data.name.trim().split(/\s+/)[0];
      $("#confirmText").textContent = `Thanks, ${firstName}. We've reserved your chair and sent a confirmation to ${data.phone.trim()}.`;

      const details = $("#confirmDetails");
      details.innerHTML = "";
      [
        ["Service", data.service],
        ["Date", prettyDate],
        ["Time", data.time],
        ["Where", "128 Foundry Street"],
      ].forEach(([k, v]) => {
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = k;
        dd.textContent = v;
        details.append(dt, dd);
      });

      form.hidden = true;
      confirmBox.hidden = false;
      confirmBox.focus({ preventScroll: true });
      submitBtn.classList.remove("is-loading");
      $(".btn__label", submitBtn).textContent = "Confirm Booking";
    }, 1100);
  });

  $("#newBooking").addEventListener("click", () => {
    form.reset();
    fillTimes();
    $$(".field", form).forEach((f) => f.classList.remove("has-error"));
    confirmBox.hidden = true;
    form.hidden = false;
    $("#name").focus();
  });

  /* ---------- Footer year ---------- */
  $("#year").textContent = now.getFullYear();
})();
