/* Mahligai Seni — animasi guna Motion (motion.dev, pustaka vanilla oleh pembuat
   Framer Motion). Semua di sini HIASAN: kalau Motion gagal dimuat atau pengguna
   pilih "kurangkan animasi", kelas html.gerak dibuang dan laman kekal lengkap
   tanpa fail ini. Logik laman (katalog, modal, slider, menu) kekal dalam
   app.js / home.js / reviews.js; fail ini hanya mendengar isyarat daripadanya. */
(function () {
  "use strict";

  var root = document.documentElement;
  var kurang = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!window.Motion || kurang) { root.classList.remove("gerak"); return; }
  if (!root.classList.contains("gerak")) return;   // tamat masa (3 saat) — laman sudah dipapar tanpa animasi
  window.__gerak = true;

  var M = window.Motion;
  var animate = M.animate, inView = M.inView, scroll = M.scroll, stagger = M.stagger;
  var EASE = [0.22, 1, 0.36, 1];                         // "ease-out-quint" — mendarat lembut
  var SPRING = { type: "spring", stiffness: 240, damping: 26 };
  var SPRING_LOMPAT = { type: "spring", stiffness: 420, damping: 16 };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function lepas(ctrl, fn) {
    // AnimationPlaybackControls: .finished (baru) atau .then (lama)
    if (ctrl && ctrl.finished) ctrl.finished.then(fn, fn);
    else if (ctrl && ctrl.then) ctrl.then(fn, fn);
    else fn();
  }
  // Pulangkan kawalan kepada CSS (hover, .is-swapping, dll.) selepas animasi
  function bersih(el) {
    el.classList.add("gm-in");
    el.style.opacity = "";
    el.style.transform = "";
    el.style.filter = "";
    el.style.transition = "";
  }
  // Transform dianimasi oleh JS setiap bingkai: matikan peralihan CSS sementara supaya tidak "mengekor"
  function tanpaPeralihan(el) { el.style.transition = "none"; }
  function masuk(els, kf, opt) {
    els = els.filter(Boolean);
    if (!els.length) return null;
    els.forEach(tanpaPeralihan);
    var c = animate(els, kf, opt);
    lepas(c, function () { els.forEach(bersih); });
    return c;
  }

  /* ════════ 1. HERO ════════ */
  var hero = $("#hero");
  if (hero) {
    // Tajuk: pecah nod teks kepada <span> per kata; <br class="m"> dikekalkan
    var h1 = $(".hero-title", hero);
    var kata = [];
    if (h1) {
      Array.prototype.slice.call(h1.childNodes).forEach(function (n) {
        if (n.nodeType !== 3) return;
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (bah) {
          if (!bah) return;
          if (/^\s+$/.test(bah)) { frag.appendChild(document.createTextNode(bah)); return; }
          var s = document.createElement("span");
          s.className = "hero-kata";
          s.textContent = bah;
          frag.appendChild(s);
          kata.push(s);
        });
        h1.replaceChild(frag, n);
      });
      kata.forEach(function (s) { s.style.opacity = "0"; });
      h1.classList.add("gm-in");
      lepas(animate(kata,
        { opacity: [0, 1], y: [26, 0], filter: ["blur(8px)", "blur(0px)"] },
        { duration: 0.85, ease: EASE, delay: stagger(0.07, { startDelay: 0.2 }) }),
        function () { kata.forEach(function (s) { s.style.cssText = ""; s.style.willChange = "auto"; }); });
    }
    var tKata = 0.2 + kata.length * 0.07;
    masuk([$(".hero-eyebrow", hero)], { opacity: [0, 1], y: [14, 0] }, { duration: 0.7, ease: EASE, delay: 0.05 });
    masuk([$(".hero-sub", hero)], { opacity: [0, 1], y: [16, 0] }, { duration: 0.7, ease: EASE, delay: tKata + 0.1 });
    masuk([$(".hero-cta", hero)], { opacity: [0, 1], y: [18, 0], scale: [0.96, 1] }, Object.assign({}, SPRING, { delay: tKata + 0.25 }));
    masuk([$(".hero-cap", hero), $(".hero-ctrl", hero)], { opacity: [0, 1], y: [10, 0] },
      { duration: 0.6, ease: EASE, delay: stagger(0.1, { startDelay: tKata + 0.4 }) });

    // Gambar slaid: skala masuk perlahan pada BEKAS slaid (img dikawal CSS/home.js — tidak disentuh)
    var slaid = $(".hero-slides", hero);
    if (slaid) lepas(animate(slaid, { scale: [1.08, 1] }, { duration: 2.2, ease: EASE }),
      function () { slaid.style.transform = ""; });

    // Paralaks lembut: isi hero naik & pudar sedikit semasa tatal keluar
    var isi = $(".hero-copy", hero);
    if (isi && scroll) {
      scroll(animate(isi, { y: [0, -56], opacity: [1, 0.35] }, { ease: "linear" }),
        { target: hero, offset: ["start start", "end start"] });
    }
  }

  /* ════════ 2. Pendedahan skrol — berkumpulan, berperingkat ════════ */
  function sekali(el, fn, opt) {
    if (!el) return;
    inView(el, function () {
      if (el.__gm) return;
      el.__gm = true;
      fn(el);
    }, opt || { margin: "0px 0px -8% 0px", amount: 0.15 });
  }
  function naik(el, tunda) {
    return masuk([el], { opacity: [0, 1], y: [22, 0] }, { duration: 0.75, ease: EASE, delay: tunda || 0 });
  }

  // Tajuk bahagian
  $$(".rooms .row-head, .picks .row-head, .catalogue .section-head, .toolbar").forEach(function (el) {
    sekali(el, function () { naik(el); });
  });

  // Kad ruang
  sekali($(".room-grid"), function (g) {
    masuk($$(":scope > li", g), { opacity: [0, 1], y: [28, 0], scale: [0.96, 1] },
      Object.assign({}, SPRING, { delay: stagger(0.08) }));
  });

  // Jalur cerita
  sekali($(".story-copy"), function (c) {
    masuk($$(":scope > *", c), { opacity: [0, 1], y: [20, 0] },
      { duration: 0.8, ease: EASE, delay: stagger(0.1) });
    masuk([$(".story-img")], { opacity: [0, 1], scale: [1.06, 1] }, { duration: 1.4, ease: EASE });
  });

  // Baris ciri: ikon "pop" dengan spring kecil + kira naik 4.9
  sekali($(".feature-row"), function (row) {
    var li = $$(":scope > li", row);
    masuk(li, { opacity: [0, 1], y: [16, 0] }, { duration: 0.6, ease: EASE, delay: stagger(0.09) });
    var ikon = li.map(function (l) { return $(":scope > svg", l); }).filter(Boolean);
    lepas(animate(ikon, { scale: [0.4, 1], rotate: [-12, 0] }, Object.assign({}, SPRING_LOMPAT, { delay: stagger(0.09, { startDelay: 0.1 }) })),
      function () { ikon.forEach(function (s) { s.style.transform = ""; }); });
    $$(".kira", row).forEach(function (k) { kiraNaik(k, 0.5); });
  });

  // Koleksi Pilihan (spring)
  sekali($(".pick-row"), function (r) {
    masuk($$(":scope > li", r), { opacity: [0, 1], y: [36, 0], scale: [0.95, 1] },
      Object.assign({}, SPRING, { delay: stagger(0.08) }));
  });

  // Lawat / lokasi
  sekali($(".visit-head"), function (h) {
    masuk($$(":scope > *", h), { opacity: [0, 1], y: [24, 0] }, { duration: 0.8, ease: EASE, delay: stagger(0.12) });
  });
  sekali($(".visit-grid"), function () {
    masuk([$(".visit-media")], { opacity: [0, 1], y: [30, 0], scale: [0.97, 1] }, { duration: 0.9, ease: EASE });
    masuk([$(".visit-info")], { opacity: [0, 1], x: [18, 0] }, { duration: 0.8, ease: EASE, delay: 0.15 });
  });

  /* ════════ 3. Kira naik — hanya nombor yang sudah ada di laman ════════ */
  function kiraNaik(el, tunda) {
    var asal = el.textContent;
    var m = asal.match(/^(\s*)(\d+(?:\.\d+)?)(.*)$/);
    if (!m) return;
    var ke = parseFloat(m[2]);
    var dp = (m[2].split(".")[1] || "").length;
    lepas(animate(0, ke, {
      duration: 1.5, ease: EASE, delay: tunda || 0,
      onUpdate: function (v) { el.textContent = m[1] + v.toFixed(dp) + m[3]; }
    }), function () { el.textContent = asal; });   // teks akhir sentiasa tepat seperti asal
  }
  function kiraNod(nod, tunda) {
    // Nod teks pertama dalam elemen (cth. "4.9" dalam .rb-score, "95.5k penilaian ..." dalam .rb-count)
    if (!nod || nod.nodeType !== 3) return;
    var asal = nod.nodeValue;
    var m = asal.match(/^(\s*)(\d+(?:\.\d+)?)(.*)$/);
    if (!m) return;
    var ke = parseFloat(m[2]);
    var dp = (m[2].split(".")[1] || "").length;
    lepas(animate(0, ke, {
      duration: 1.6, ease: EASE, delay: tunda || 0,
      onUpdate: function (v) { nod.nodeValue = m[1] + v.toFixed(dp) + m[3]; }
    }), function () { nod.nodeValue = asal; });
  }

  /* ════════ 4. Katalog — kad masuk bila dilukis / ditapis / "Paparkan lagi" ════════ */
  var grid = $("#grid");
  var henti = [];
  var giliran = { masa: 0, n: 0 };
  function tundaGiliran() {
    var kini = performance.now();
    if (kini - giliran.masa > 180) giliran = { masa: kini, n: 0 }; else giliran.n++;
    return Math.min(giliran.n, 6) * 0.06;
  }
  function kadMasuk(li, tunda, pantas) {
    masuk([li], { opacity: [0, 1], y: [pantas ? 14 : 26, 0], scale: [0.97, 1] },
      { type: "spring", stiffness: 260, damping: 28, delay: tunda });
  }
  function katalog(from) {
    if (!grid) return;
    if (!from) { henti.forEach(function (f) { f(); }); henti = []; }
    var baru = Array.prototype.slice.call(grid.children, from || 0).filter(function (li) {
      return !li.classList.contains("sk-card");
    });
    var vh = window.innerHeight, kini = [];
    baru.forEach(function (li) {
      var r = li.getBoundingClientRect();
      li.style.opacity = "0";
      if (r.top < vh && r.bottom > 0) kini.push(li);
      else henti.push(inView(li, function () {
        if (li.__gm) return;
        li.__gm = true;
        kadMasuk(li, tundaGiliran());
      }, { margin: "0px 0px -6% 0px", amount: 0.1 }));
    });
    kini.forEach(function (li, i) { li.__gm = true; kadMasuk(li, Math.min(i, 10) * 0.045, true); });
  }
  document.addEventListener("katalog:render", function (e) { katalog(e.detail && e.detail.from); });
  // Katalog mungkin sudah dilukis sebelum fail ini dimuat (CDN lambat): biarkan yang kelihatan,
  // animasikan yang di bawah lipatan sahaja
  if (grid && grid.children.length && !grid.querySelector(".sk-card")) {
    $$(":scope > li", grid).forEach(function (li) {
      var r = li.getBoundingClientRect();
      if (r.top > window.innerHeight) {
        li.style.opacity = "0";
        henti.push(inView(li, function () {
          if (li.__gm) return; li.__gm = true; kadMasuk(li, tundaGiliran());
        }, { amount: 0.1 }));
      }
    });
  }

  /* ════════ 5. Ulasan — kepala, kira naik penarafan, kad berperingkat ════════ */
  function ulasan() {
    var sek = $("#ulasan");
    if (!sek || sek.__gmSedia) return;
    sek.__gmSedia = true;
    sekali($(".reviews-head", sek), function (h) {
      naik(h);
      var skor = $(".rb-score", h), kira = $(".rb-count", h);
      if (skor) kiraNod(skor.firstChild, 0.2);
      if (kira) kiraNod(kira.firstChild, 0.3);
    });
    sekali($("#review-track", sek), function (t) {
      bersih(t);
      var kad = $$(".rv-card", t);
      var nampak = kad.slice(0, 4), lain = kad.slice(4);
      lain.forEach(function (k) { k.style.opacity = ""; });
      nampak.forEach(function (k) { k.style.opacity = "0"; });
      lepas(animate(nampak, { opacity: [0, 1], y: [30, 0], scale: [0.96, 1] },
        Object.assign({}, SPRING, { delay: stagger(0.09) })),
        function () { nampak.forEach(function (k) { k.style.opacity = ""; k.style.transform = ""; }); });
      naik($(".review-nav", sek), 0.3);
    }, { amount: 0.1 });
  }
  document.addEventListener("ulasan:render", ulasan);
  if ($("#review-track .rv-card")) ulasan();

  /* ════════ 6. Bar kemajuan skrol + WhatsApp terapung ════════ */
  var bar = document.createElement("div");
  bar.className = "bar-skrol";
  bar.setAttribute("aria-hidden", "true");
  document.body.insertBefore(bar, document.body.firstChild);
  if (scroll) scroll(animate(bar, { scaleX: [0, 1] }, { ease: "linear" }));

  var wa = $(".wa-float");
  if (wa) {
    var waNampak = false, waAnim = null;
    var semakWa = function () {
      var patut = window.scrollY > window.innerHeight * 0.5;
      if (patut === waNampak) return;
      waNampak = patut;
      if (waAnim && waAnim.stop) waAnim.stop();
      tanpaPeralihan(wa);
      if (patut) {
        wa.classList.add("nampak");
        waAnim = animate(wa, { opacity: [0, 1], scale: [0.6, 1] }, SPRING_LOMPAT);
        lepas(waAnim, function () { if (waNampak) { wa.style.opacity = ""; wa.style.transform = ""; wa.style.transition = ""; } });
      } else {
        waAnim = animate(wa, { opacity: 0, scale: 0.6 }, { duration: 0.18, ease: "easeIn" });
        lepas(waAnim, function () {
          if (waNampak) return;
          wa.classList.remove("nampak");
          wa.style.opacity = ""; wa.style.transform = ""; wa.style.transition = "";
        });
      }
    };
    window.addEventListener("scroll", semakWa, { passive: true });
    semakWa();
  }

  /* ════════ 7. Maklum balas tekan (delegasi — termasuk butang yang dilukis kemudian) ════════ */
  var TEKAN = ".btn, .chip, .icon-btn, .review-btn, .hero-pause, .opt, .room-clear, .modal-close, .pd-thumbs button, .rv-thumb";
  document.addEventListener("pointerdown", function (e) {
    if (e.button !== 0) return;
    var el = e.target.closest && e.target.closest(TEKAN);
    if (!el || el.disabled) return;
    tanpaPeralihan(el);
    animate(el, { scale: 0.95 }, { duration: 0.1, ease: "easeOut" });
    var lepasTekan = function () {
      window.removeEventListener("pointerup", lepasTekan);
      window.removeEventListener("pointercancel", lepasTekan);
      lepas(animate(el, { scale: 1 }, { type: "spring", stiffness: 520, damping: 20 }),
        function () { el.style.transform = ""; el.style.transition = ""; });   // pulangkan hover/:active CSS
    };
    window.addEventListener("pointerup", lepasTekan);
    window.addEventListener("pointercancel", lepasTekan);
  }, { passive: true });

  /* ════════ 8. Modal produk — buka/tutup spring, tukar gambar ════════ */
  var desktop = window.matchMedia("(min-width: 860px)");
  document.addEventListener("modal:buka", function (e) {
    var m = e.detail.modal;
    var panel = $(".modal-panel", m), latar = $(".modal-backdrop", m);
    if (latar) lepas(animate(latar, { opacity: [0, 1] }, { duration: 0.28, ease: EASE }), function () { latar.style.opacity = ""; });
    if (panel) lepas(animate(panel, desktop.matches
        ? { opacity: [0, 1], y: [24, 0], scale: [0.97, 1] }
        : { opacity: [0.4, 1], y: [80, 0] },
      { type: "spring", stiffness: 300, damping: 30 }),
      function () { panel.style.opacity = ""; panel.style.transform = ""; });
  });
  document.addEventListener("modal:tutup", function (e) {
    // app.js menyorok modal serta-merta; kita animasikan salinan visual yang tidak boleh disentuh
    var m = e.detail.modal;
    if (!m || m.hidden) return;
    var panel = $(".modal-panel", m);
    var klon = m.cloneNode(true);
    klon.removeAttribute("id");
    $$("[id]", klon).forEach(function (n) { n.removeAttribute("id"); });
    klon.classList.add("modal-klon");
    klon.setAttribute("aria-hidden", "true");
    klon.setAttribute("inert", "");
    document.body.appendChild(klon);
    var kPanel = $(".modal-panel", klon), kLatar = $(".modal-backdrop", klon);
    if (panel && kPanel) kPanel.scrollTop = panel.scrollTop;
    animate(kLatar, { opacity: [1, 0] }, { duration: 0.22, ease: "easeOut" });
    lepas(animate(kPanel, desktop.matches
        ? { opacity: [1, 0], y: [0, 16], scale: [1, 0.98] }
        : { opacity: [1, 0], y: [0, 60] },
      { duration: 0.22, ease: [0.4, 0, 1, 1] }),
      function () { klon.remove(); });
  });
  document.addEventListener("modal:gambar", function (e) {
    var img = e.detail.img, a = e.detail.arah || 1;
    lepas(animate(img, { x: [a * 36, 0], scale: [0.97, 1] }, { type: "spring", stiffness: 280, damping: 28 }),
      function () { img.style.transform = ""; });
  });

  /* ════════ 9. Menu laci — pautan masuk berperingkat ════════ */
  var menu = $("#menu");
  if (menu && window.MutationObserver) {
    var dahBuka = false;
    new MutationObserver(function () {
      var buka = menu.classList.contains("is-open");
      if (buka === dahBuka) return;
      dahBuka = buka;
      if (!buka) return;
      var item = $$(".drawer-links li, .drawer-actions > *, .drawer-note", menu);
      item.forEach(function (i) { i.style.opacity = "0"; });
      lepas(animate(item, { opacity: [0, 1], x: [-16, 0] },
        { duration: 0.45, ease: EASE, delay: stagger(0.045, { startDelay: 0.12 }) }),
        function () { item.forEach(function (i) { i.style.opacity = ""; i.style.transform = ""; }); });
    }).observe(menu, { attributes: true, attributeFilter: ["class"] });
  }
})();
