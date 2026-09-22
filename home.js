/* Mahligai Seni - halaman utama: slider hero, menu slaid masuk, butang carian,
   dan pendedahan lembut semasa tatal. Katalog/modal/URL kekal dalam app.js. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  /* ---------- Hero slider ---------- */
  var SLIDES = [
    { id: "52260663122", name: "Mekah Al-Kursi", sub: "Frame ALLAH, Muhammad dan Ayatul Kursi Dengan Pencahayaan LED" },
    { id: "57462151011", name: "Bumi Berzikir Al-Isra 44", sub: "Frame Surah Al-Isra ayat 44, panel 119cm x 84cm" },
    { id: "54113102030", name: "Masjid Nabawi Berlampu", sub: "Frame Masjid Nabawi berlampu gold beserta khat selawat" }
  ];
  var DELAY = 6000;

  var hero = document.getElementById("hero");
  if (hero) (function () {
    var slides = hero.querySelectorAll(".slide");
    var dots = hero.querySelectorAll(".dot");
    var cap = document.getElementById("hero-cap");
    var capName = document.getElementById("hero-cap-name");
    var capSub = document.getElementById("hero-cap-sub");
    var pauseBtn = document.getElementById("hero-pause");
    var n = Math.min(slides.length, SLIDES.length);
    var i = 0, timer = null, userPaused = reduceMotion, hover = false, focusIn = false;
    if (n < 2) { if (pauseBtn) pauseBtn.hidden = true; return; }

    // Slaid 2-3 guna data-src supaya tidak bersaing dengan gambar LCP semasa muat halaman
    function load(s) {
      var img = s && s.querySelector("img[data-src]");
      if (!img) return;
      if (img.getAttribute("data-srcset")) img.srcset = img.getAttribute("data-srcset");
      img.src = img.getAttribute("data-src");
      img.removeAttribute("data-srcset");
      img.removeAttribute("data-src");
    }
    function loadRest() { each(slides, load); }
    if (document.readyState === "complete") setTimeout(function () { load(slides[1]); }, 0);
    window.addEventListener("load", function () {
      if (window.requestIdleCallback) requestIdleCallback(loadRest, { timeout: 2500 });
      else setTimeout(loadRest, 1200);
    });

    function go(k) {
      k = (k + n) % n;
      if (k === i) return;
      each(slides, function (s, j) {
        var on = j === k;
        s.classList.toggle("is-active", on);
        if (on) s.removeAttribute("aria-hidden"); else s.setAttribute("aria-hidden", "true");
        // Muat gambar slaid seterusnya lebih awal supaya peralihan lancar
        if (on || j === (k + 1) % n) load(s);
      });
      each(dots, function (d, j) {
        if (j === k) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
      });
      var s = SLIDES[k];
      var swap = function () {
        cap.href = "#produk/" + s.id;
        cap.setAttribute("data-open", s.id);
        capName.textContent = s.name;
        capSub.textContent = s.sub;
        cap.classList.remove("is-swapping");
      };
      if (reduceMotion) swap();
      else { cap.classList.add("is-swapping"); setTimeout(swap, 280); }
      i = k;
    }

    function running() { return !userPaused && !hover && !focusIn && !document.hidden; }
    function schedule() {
      clearInterval(timer);
      timer = null;
      if (running()) timer = setInterval(function () { go(i + 1); }, DELAY);
    }
    function syncPause() {
      pauseBtn.setAttribute("aria-pressed", String(userPaused));
      pauseBtn.setAttribute("aria-label", userPaused ? "Mainkan tayangan slaid" : "Jeda tayangan slaid");
    }

    each(dots, function (d, j) {
      d.addEventListener("click", function () { go(j); schedule(); });
    });
    pauseBtn.addEventListener("click", function () { userPaused = !userPaused; syncPause(); schedule(); });

    // Jeda semasa hover hanya untuk tetikus sebenar (ketikan pada skrin sentuh mencetuskan mouseenter tiruan)
    var hasPointer = "PointerEvent" in window;
    hero.addEventListener(hasPointer ? "pointerenter" : "mouseenter", function (e) {
      if (hasPointer && e.pointerType !== "mouse") return;
      hover = true; schedule();
    });
    hero.addEventListener(hasPointer ? "pointerleave" : "mouseleave", function (e) {
      if (hasPointer && e.pointerType !== "mouse") return;
      hover = false; schedule();
    });
    // Jeda semasa fokus hanya untuk fokus papan kekunci, bukan fokus akibat ketikan/klik
    hero.addEventListener("focusin", function (e) {
      var kb = true;
      try { kb = e.target.matches(":focus-visible"); } catch (err) { /* pelayar lama: anggap papan kekunci */ }
      focusIn = kb; schedule();
    });
    hero.addEventListener("focusout", function (e) {
      if (!hero.contains(e.relatedTarget)) { focusIn = false; schedule(); }
    });
    document.addEventListener("visibilitychange", schedule);

    // Anak panah kiri/kanan apabila fokus berada pada kawalan slaid
    hero.addEventListener("keydown", function (e) {
      if (!e.target.closest(".hero-ctrl")) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      go(i + (e.key === "ArrowRight" ? 1 : -1));
      var d = dots[i]; if (d) d.focus();
    });

    // Leret pada skrin sentuh
    var t0 = null;
    hero.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) { t0 = null; return; }
      t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });
    hero.addEventListener("touchend", function (e) {
      if (!t0) return;
      var t = e.changedTouches[0], dx = t.clientX - t0.x, dy = t.clientY - t0.y;
      t0 = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) { go(i + (dx < 0 ? 1 : -1)); schedule(); }
    }, { passive: true });

    syncPause();
    schedule();
  })();

  /* ---------- Menu slaid masuk ---------- */
  var menu = document.getElementById("menu");
  var menuBtn = document.getElementById("menu-btn");
  var panel = document.getElementById("menu-panel");
  if (menu && menuBtn && panel) (function () {
    var closeTimer = null;

    function focusables() {
      return Array.prototype.filter.call(panel.querySelectorAll("a[href], button:not([disabled])"), function (el) {
        return el.offsetParent !== null;
      });
    }
    function open() {
      clearTimeout(closeTimer);
      menu.hidden = false;
      document.body.classList.add("menu-open");
      menuBtn.setAttribute("aria-expanded", "true");
      // Paksa reflow supaya peralihan slaid masuk berlaku
      void panel.offsetWidth;
      menu.classList.add("is-open");
      var first = panel.querySelector(".drawer-links a");
      (first || panel).focus({ preventScroll: true });
    }
    function close(returnFocus) {
      if (menu.hidden) return;
      menu.classList.remove("is-open");
      document.body.classList.remove("menu-open");
      menuBtn.setAttribute("aria-expanded", "false");
      closeTimer = setTimeout(function () { menu.hidden = true; }, reduceMotion ? 0 : 400);
      if (returnFocus) menuBtn.focus({ preventScroll: true });
    }

    menuBtn.addEventListener("click", function () { if (menu.hidden) open(); else close(true); });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("[data-menu-close]")) { close(true); return; }
      var link = e.target.closest("[data-menu-link]");
      if (link) close(false);               // pautan # biasa meneruskan tatal ke bahagian
    });
    document.addEventListener("keydown", function (e) {
      if (menu.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); close(true); return; }
      if (e.key !== "Tab") return;
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  })();

  /* ---------- Ikon carian: terus ke carian katalog ---------- */
  var searchBtn = document.getElementById("search-btn");
  var search = document.getElementById("search");
  if (searchBtn && search) searchBtn.addEventListener("click", function () {
    var bar = document.getElementById("toolbar") || search;
    // Fokus dahulu (tanpa tatal), kemudian tatal: fokus selepas tatal lancar boleh membatalkannya
    search.focus({ preventScroll: true });
    bar.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  });

  /* ---------- Pendedahan lembut semasa tatal ---------- */
  // Bila html.gerak aktif, gerak.js (Motion) mengambil alih pendedahan ini
  if (!reduceMotion && !document.documentElement.classList.contains("gerak") && "IntersectionObserver" in window) {
    var targets = document.querySelectorAll(".rooms .row-head, .room-grid > li, .story-copy, .feature-row > li, .picks .row-head, .pick-row > li");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    each(targets, function (el) {
      var idx = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.style.setProperty("--d", Math.min(idx, 5) * 0.07 + "s");
      el.classList.add("reveal");
      io.observe(el);
    });
  }
})();
