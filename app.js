/* Mahligai Seni - laman galeri (final)
   Pure static: data dimuat dari data/products.json + data/collections.json.
   Tiada troli; setiap produk dipautkan ke halaman produk Shopee. */
(function () {
  "use strict";

  var ROOT = "";
  var SHOP_URL = "https://shopee.com.my/lasercutmalaysia";
  var PAGE_SIZE = 24;
  var NEW_DAYS = 90;                 // "Baharu" hanya jika dicipta dalam ~90 hari
  var DECOR = { "khat-3d-cantum": 1, "frame-minimalis-3d": 1, "frame-ayat-doa": 1, "asmaul-husna": 1, "kaabah-masjid": 1 };
  // Hero: produk pilihan (yang pertama dipaparkan besar). Jika ada yang
  // tiada dalam data, tempat kosong diisi dengan produk terbaru.
  var HERO_PICKS = ["19976012599", "18495308634", "52260663122"];
  var HERO_COUNT = 3;
  // Nilai ?susun= dalam URL <-> nilai dalaman
  var SORT_URL = { "sold": "terlaris", "price-asc": "harga-rendah", "price-desc": "harga-tinggi", "new": "terbaru" };
  var SORT_FROM_URL = {};
  Object.keys(SORT_URL).forEach(function (k) { SORT_FROM_URL[SORT_URL[k]] = k; });

  var GRID_SIZES = "(min-width: 1240px) 290px, (min-width: 1080px) 23vw, (min-width: 720px) 31vw, 48vw";
  var FEAT_SIZES = "(min-width: 1240px) 600px, (min-width: 1080px) 47vw, (min-width: 720px) 63vw, 48vw";

  var state = {
    products: [],
    byId: {},
    collections: [],
    collBySlug: {},
    coll: "semua",
    query: "",
    rawQuery: "",
    sort: "sold",
    shown: PAGE_SIZE,
    filtered: [],
    featured: {}
  };

  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  var els = {
    grid: $("#grid"),
    count: $("#result-count"),
    more: $("#more-btn"),
    moreNote: $("#more-note"),
    moreBar: $("#more-bar"),
    moreProgress: $("#more-progress"),
    empty: $("#empty"),
    chips: $("#chip-row"),
    search: $("#search"),
    searchClear: $("#search-clear"),
    sort: $("#sort"),
    collDesc: $("#coll-desc"),
    collIndex: $("#collection-index"),
    hero: $("#hero-feature"),
    modal: $("#modal"),
    panel: $("#modal-panel"),
    body: $("#modal-body"),
    error: $("#load-error")
  };

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function img(path) { return ROOT + path; }
  function srcset(im) { return esc(img(im.sm)) + " 480w, " + esc(img(im.lg)) + " 1200w"; }
  function norm(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/\s+/g, " ").trim();
  }
  // Buang emoji hiasan daripada nama listing untuk paparan yang lebih kemas
  var EMOJI_RE;
  try { EMOJI_RE = new RegExp("[\\p{Extended_Pictographic}\\u{FE0F}\\u{200D}]", "gu"); }
  catch (e) { EMOJI_RE = /[☀-➿️‍]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF]/g; }
  function cleanName(s) {
    return String(s || "").replace(EMOJI_RE, " ").replace(/\s{2,}/g, " ").trim();
  }
  function money(n) {
    return "RM " + Number(n).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function priceHTML(min, max) {
    if (max > min) return '<span class="from">Dari</span>' + money(min);
    return money(min);
  }
  // 203,360 -> "203.4k", 19,610 -> "19.6k" (satu titik perpuluhan; tepat seperti data)
  function compact(n) {
    if (n >= 1000) {
      var v = Math.round(n / 100) / 10;
      return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + "k";
    }
    return String(n);
  }
  function isNew(p) {
    return p.created && (Date.now() / 1000 - p.created) < NEW_DAYS * 86400;
  }
  // Teks jualan: "19.6k terjual", "Baharu" (hanya jika benar-benar baharu), atau kosong
  function soldText(p) {
    if (p.sold > 0) return compact(p.sold) + " terjual";
    return isNew(p) ? "Baharu" : "";
  }
  function collName(p) {
    var c = state.collBySlug[p._coll];
    return c ? c.name : "";
  }
  var ICON_EXT = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5"/></svg>';

  // Pudar masuk gambar selepas dimuat (.loaded)
  document.addEventListener("load", markLoaded, true);
  document.addEventListener("error", markLoaded, true);
  function markLoaded(e) {
    var t = e.target;
    if (t && t.tagName === "IMG") t.classList.add("loaded");
  }
  function markCompleted(root) {
    each((root || document).querySelectorAll("img.fade:not(.loaded)"), function (im) {
      if (im.complete) im.classList.add("loaded");
    });
  }

  /* ---------- URL state (?koleksi= ?cari= ?susun=) ---------- */
  function readURLState() {
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { return; }
    var k = q.get("koleksi");
    if (k && state.collBySlug[k]) state.coll = k;
    var c = q.get("cari");
    if (c) {
      state.rawQuery = c;
      state.query = norm(c);
      els.search.value = c;
    }
    var s = q.get("susun");
    if (s && SORT_FROM_URL[s]) state.sort = SORT_FROM_URL[s];
    els.sort.value = state.sort;
  }
  function writeURLState() {
    var q = new URLSearchParams();
    if (state.coll !== "semua") q.set("koleksi", state.coll);
    if (state.rawQuery.trim()) q.set("cari", state.rawQuery.trim());
    if (state.sort !== "sold") q.set("susun", SORT_URL[state.sort]);
    var qs = q.toString();
    var url = location.pathname + (qs ? "?" + qs : "") + location.hash;
    if (url !== location.pathname + location.search + location.hash) {
      try { history.replaceState(history.state, "", url); } catch (e) { /* abaikan */ }
    }
  }

  /* ---------- data ---------- */
  Promise.all([
    fetch(ROOT + "data/products.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
    fetch(ROOT + "data/collections.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
  ]).then(function (res) {
    var pdata = res[0], cdata = res[1];
    var map = cdata.products || {};
    state.collections = (cdata.collections || []).slice();
    state.collections.forEach(function (c) { state.collBySlug[c.slug] = c; c.count = 0; });

    state.products = (pdata.products || []).map(function (p) {
      var m = map[String(p.id)] || {};
      p._coll = m.collection || "";
      p._tags = m.tags || [];
      p._name = cleanName(p.name) || p.name;
      p.images = p.images || [];
      if (state.collBySlug[p._coll]) state.collBySlug[p._coll].count++;
      state.byId[String(p.id)] = p;
      return p;
    });
    state.products.forEach(function (p) {
      p._search = norm([p.name, p.sku, collName(p), p._tags.join(" ")].join(" "));
    });
    // sembunyi koleksi kosong, kekalkan susunan fail
    state.collections = state.collections.filter(function (c) { return c.count > 0; });
    state.collBySlug = {};
    state.collections.forEach(function (c) { state.collBySlug[c.slug] = c; });

    readURLState();
    syncClear();
    renderStats();
    renderHero();
    renderCollections();
    renderChips();
    syncCollUI();
    applyFilters();
    handleRoute(true);
    // Pautan dalam halaman selepas kandungan async mengubah susun atur
    if (/^#(katalog|koleksi)$/.test(location.hash)) {
      var target = document.getElementById(location.hash.slice(1));
      if (target) requestAnimationFrame(function () { target.scrollIntoView(); });
    }
  }).catch(function (err) {
    console.error(err);
    els.count.textContent = "";
    els.grid.innerHTML = "";
    els.grid.removeAttribute("aria-busy");
    els.error.hidden = false;
    els.hero.innerHTML = "";
  });

  /* ---------- hero ---------- */
  function renderStats() {
    var sold = state.products.reduce(function (a, p) { return a + (p.sold || 0); }, 0);
    var set = function (k, v) { var el = document.querySelector('[data-stat="' + k + '"]'); if (el) el.textContent = v; };
    set("products", state.products.length);
    set("collections", state.collections.length);
    set("sold", compact(sold));
    var full = document.querySelector('[data-stat="sold"]');
    if (full) full.setAttribute("title", sold.toLocaleString("en-MY") + " unit");
  }

  function renderHero() {
    var chosen = HERO_PICKS.map(function (id) { return state.byId[id]; })
      .filter(function (p) { return p && p.images.length; });
    var latest = state.products.filter(function (p) { return p.images.length && chosen.indexOf(p) < 0; })
      .sort(function (a, b) { return b.created - a.created; });
    var picks = chosen.concat(latest).slice(0, HERO_COUNT)
      .map(function (p) { return { p: p, im: p.images[0] }; });
    var main = picks[0], side = picks.slice(1, 3);
    if (!main) { els.hero.innerHTML = ""; return; }
    var mp = main.p;
    var mSold = soldText(mp);
    var html = '<div class="feature-layout">' +
      '<div class="feature-badge" aria-hidden="true"><div>Pilihan<b>Galeri</b></div></div>' +
      '<a class="feature-main" href="#produk/' + mp.id + '" data-open="' + mp.id + '">' +
        '<div class="frame-img mat"><img class="fade" src="' + esc(img(main.im.lg)) + '" srcset="' + srcset(main.im) + '" sizes="(min-width: 960px) 34vw, 92vw" alt="' + esc(mp._name) + '" width="1200" height="1200" fetchpriority="high" decoding="async"></div>' +
        '<div class="feature-caption">' +
          '<span class="kicker">' + esc(collName(mp) || "Karya pilihan") + '</span>' +
          '<span class="ttl">' + esc(shortTitle(mp._name)) + '</span>' +
          '<span class="meta"><strong>' + (mp.price_max > mp.price_min ? "Dari " : "") + money(mp.price_min) + '</strong>' + esc(mSold) + '</span>' +
        '</div>' +
      '</a>' +
      '<div class="feature-side">' +
        side.map(function (x) {
          return '<a class="feature-tile" href="#produk/' + x.p.id + '" data-open="' + x.p.id + '">' +
            '<div class="frame-img mat"><img class="fade" src="' + esc(img(x.im.sm)) + '" srcset="' + srcset(x.im) + '" sizes="(min-width: 960px) 17vw, (min-width: 600px) 34vw, 46vw" alt="' + esc(x.p._name) + '" width="480" height="480" decoding="async"></div>' +
            '<span>' + esc(shortTitle(x.p._name)) + '</span></a>';
        }).join("") +
      '</div></div>';
    els.hero.innerHTML = html;
    markCompleted(els.hero);
  }

  // Pendekkan tajuk marketplace yang panjang untuk kapsyen (paparan sahaja)
  function shortTitle(name) {
    var s = name.split(/\s[|\/]\s|\s-\s/)[0];
    s = s.replace(/[A-Z][A-Z'\-]+/g, function (w) {
      return /\d/.test(w) || w.length <= 2 ? w : w.charAt(0) + w.slice(1).toLowerCase();
    });
    if (s.length > 64) s = s.slice(0, 62).replace(/\s+\S*$/, "") + "…";
    return s;
  }

  /* ---------- koleksi ---------- */
  function coverFor(slug) {
    var best = null;
    state.products.forEach(function (p) {
      if (p._coll === slug && p.images.length && (!best || p.sold > best.sold)) best = p;
    });
    return best;
  }

  function renderCollections() {
    els.collIndex.innerHTML = state.collections.map(function (c) {
      var cover = coverFor(c.slug);
      return '<li><button type="button" class="coll-card" data-coll="' + esc(c.slug) + '" aria-pressed="false">' +
        '<span class="thumb">' + (cover ? '<img class="fade" src="' + esc(img(cover.images[0].sm)) + '" alt="" width="480" height="480" loading="lazy" decoding="async">' : "") + '</span>' +
        '<span><span class="num" aria-hidden="true"></span>' +
        '<span class="nm">' + esc(c.name) + '</span>' +
        '<span class="ds">' + esc(c.description || "") + '</span>' +
        '<span class="ct">' + c.count + ' produk</span></span>' +
      '</button></li>';
    }).join("");
    markCompleted(els.collIndex);
  }

  function renderChips() {
    var all = [{ slug: "semua", name: "Semua", count: state.products.length }].concat(state.collections);
    els.chips.innerHTML = all.map(function (c) {
      return '<button type="button" class="chip" data-coll="' + esc(c.slug) + '" aria-pressed="' + (c.slug === state.coll) + '">' +
        esc(c.name) + '<small>' + c.count + '</small></button>';
    }).join("");
  }

  function syncCollUI() {
    each(document.querySelectorAll("[data-coll]"), function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-coll") === state.coll));
    });
    var c = state.coll !== "semua" ? state.collBySlug[state.coll] : null;
    if (c && c.description) {
      els.collDesc.innerHTML = '<strong>' + esc(c.name) + '</strong> ' + esc(c.description);
      els.collDesc.hidden = false;
    } else {
      els.collDesc.textContent = "";
      els.collDesc.hidden = true;
    }
    var chip = els.chips.querySelector('[data-coll="' + state.coll + '"]');
    if (chip && chip.scrollIntoView && els.chips.scrollWidth > els.chips.clientWidth) {
      var left = chip.offsetLeft - (els.chips.clientWidth - chip.offsetWidth) / 2;
      els.chips.scrollTo ? els.chips.scrollTo({ left: left }) : (els.chips.scrollLeft = left);
    }
  }

  function setCollection(slug, scroll) {
    state.coll = slug;
    state.shown = PAGE_SIZE;
    syncCollUI();
    applyFilters();
    if (scroll) {
      var cat = document.getElementById("katalog");
      cat.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-coll]");
    if (!b) return;
    var slug = b.getAttribute("data-coll");
    var fromIndex = b.classList.contains("coll-card");
    if (fromIndex && state.coll === slug) slug = "semua";
    setCollection(slug, fromIndex);
  });

  /* ---------- katalog ---------- */
  var searchTimer;
  function syncClear() { els.searchClear.hidden = !els.search.value; }
  function runSearch() {
    state.rawQuery = els.search.value;
    state.query = norm(els.search.value);
    state.shown = PAGE_SIZE;
    applyFilters();
  }
  els.search.addEventListener("input", function () {
    syncClear();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(runSearch, 120);
  });
  els.search.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && els.search.value) {
      e.preventDefault();
      e.stopPropagation();
      clearSearch();
    }
  });
  els.searchClear.addEventListener("click", clearSearch);
  function clearSearch() {
    clearTimeout(searchTimer);
    els.search.value = "";
    syncClear();
    runSearch();
    els.search.focus();
  }
  els.sort.addEventListener("change", function () {
    state.sort = els.sort.value;
    state.shown = PAGE_SIZE;
    applyFilters();
  });
  els.more.addEventListener("click", function () {
    var firstNew = state.shown;
    state.shown += PAGE_SIZE;
    renderGrid(firstNew);
  });
  $("#reset-filters").addEventListener("click", function () {
    els.search.value = "";
    state.query = "";
    state.rawQuery = "";
    syncClear();
    setCollection("semua", false);
    els.search.focus();
  });

  function applyFilters() {
    var terms = state.query ? state.query.split(" ") : [];
    var list = state.products.filter(function (p) {
      if (state.coll !== "semua" && p._coll !== state.coll) return false;
      for (var i = 0; i < terms.length; i++) if (p._search.indexOf(terms[i]) < 0) return false;
      return true;
    });
    var cmp = {
      "sold": function (a, b) { return b.sold - a.sold || b.likes - a.likes; },
      "price-asc": function (a, b) { return a.price_min - b.price_min || a.price_max - b.price_max || b.sold - a.sold; },
      // Kad memaparkan "Dari <price_min>", jadi susun ikut price_min supaya senarai kelihatan tertib
      "price-desc": function (a, b) { return b.price_min - a.price_min || b.price_max - a.price_max || b.sold - a.sold; },
      "new": function (a, b) { return b.created - a.created; }
    }[state.sort];
    list.sort(cmp);
    var isDefault = state.sort === "sold" && state.coll === "semua" && !state.query;
    // Paparan lalai: bawa hiasan dinding terlaris ke kedudukan pertama (selebihnya kekal ikut jualan)
    if (isDefault) {
      for (var d = 0; d < list.length; d++) {
        if (DECOR[list[d]._coll] && list[d].images.length) { if (d > 0) list.unshift(list.splice(d, 1)[0]); break; }
      }
    }
    state.filtered = list;

    // Kad berganda: pada paparan lalai Terlaris, produk hiasan pertama dalam setiap 12
    state.featured = {};
    if (isDefault) {
      for (var s = 0; s < list.length; s += 12) {
        for (var j = s; j < Math.min(s + 12, list.length); j++) {
          if (DECOR[list[j]._coll] && list[j].images.length) { state.featured[list[j].id] = 1; break; }
        }
      }
    }
    writeURLState();
    renderGrid(0);
  }

  function cardHTML(p, i) {
    var first = p.images[0];
    var feat = !!state.featured[p.id];
    var tag = p.stock <= 0 ? '<span class="card-tag out">Habis stok</span>'
      : (p.sold <= 0 && isNew(p) ? '<span class="card-tag">Baharu</span>' : "");
    var sold = p.sold > 0 ? compact(p.sold) + " terjual" : "";
    return '<li class="' + (feat ? "is-feature" : "") + '"><article class="card' + (feat ? " card--feature" : "") + '">' +
      '<div class="card-media">' +
        (first ? '<img class="fade" src="' + esc(img(first.sm)) + '" srcset="' + srcset(first) + '" sizes="' + (feat ? FEAT_SIZES : GRID_SIZES) + '" alt="' + esc(p._name) + '" width="480" height="480"' + (i < 4 ? '' : ' loading="lazy"') + ' decoding="async">' : "") +
        tag +
        (feat ? '<span class="card-ribbon">Hiasan Dinding</span>' : "") +
      '</div>' +
      '<div class="card-body">' +
        (collName(p) ? '<span class="card-coll">' + esc(collName(p)) + '</span>' : "") +
        '<h3 class="card-title"><a href="#produk/' + p.id + '" data-open="' + p.id + '">' + esc(p._name) + '</a></h3>' +
        '<div class="card-foot">' +
          '<span class="price">' + priceHTML(p.price_min, p.price_max) + '</span>' +
          (sold ? '<span class="sold">' + esc(sold) + '</span>' : "") +
        '</div>' +
        '<a class="card-shop" href="' + esc(p.url) + '" target="_blank" rel="noopener">Beli di Shopee <span aria-hidden="true">&#8599;</span><span class="sr-only">: ' + esc(p._name) + ' (tab baharu)</span></a>' +
      '</div>' +
    '</article></li>';
  }

  function renderGrid(from) {
    var list = state.filtered;
    var end = Math.min(state.shown, list.length);
    els.grid.removeAttribute("aria-busy");
    if (from === 0) {
      els.grid.innerHTML = list.slice(0, end).map(cardHTML).join("");
    } else {
      els.grid.insertAdjacentHTML("beforeend", list.slice(from, end).map(function (p, i) { return cardHTML(p, from + i); }).join(""));
      var newLink = els.grid.children[from] && els.grid.children[from].querySelector(".card-title a");
      if (newLink) newLink.focus({ preventScroll: true });
    }
    markCompleted(els.grid);
    var cname = state.coll !== "semua" && state.collBySlug[state.coll] ? state.collBySlug[state.coll].name : "";
    var ctx = (cname ? " dalam <em>" + esc(cname) + "</em>" : "") + (state.query ? " untuk “" + esc(state.rawQuery.trim()) + "”" : "");
    els.count.innerHTML = "<strong>" + list.length + "</strong> produk" + ctx;
    els.empty.hidden = list.length > 0;
    var remaining = list.length - end;
    els.more.hidden = remaining <= 0;
    els.more.innerHTML = 'Paparkan lagi <span class="more-n">(' + remaining + ')</span>';
    els.more.setAttribute("aria-label", "Paparkan lagi, " + remaining + " produk belum dipaparkan");
    if (list.length) {
      els.moreNote.textContent = "Memaparkan " + end + " daripada " + list.length + " produk";
      els.moreProgress.hidden = false;
      els.moreBar.style.width = (end / list.length * 100).toFixed(1) + "%";
      els.moreProgress.setAttribute("aria-valuenow", String(end));
      els.moreProgress.setAttribute("aria-valuemax", String(list.length));
    } else {
      els.moreNote.textContent = "";
      els.moreProgress.hidden = true;
    }
  }

  /* ---------- routing + modal ---------- */
  var ROUTE_RE = /^#produk\/(\d+)$/;
  var openedByNav = false;
  var lastFocus = null;
  var lastFocusId = null;
  var current = null;
  var baseTitle = document.title;

  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[data-open]");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    // Dari produk ke produk dalam modal: ganti hash supaya "Kembali" masih menutup modal sekali sahaja
    if (!els.modal.hidden && els.modal.contains(a)) {
      e.preventDefault();
      try { history.replaceState(history.state, "", location.pathname + location.search + "#produk/" + a.getAttribute("data-open")); } catch (err) { /* abaikan */ }
      openProduct(a.getAttribute("data-open"));
      return;
    }
    lastFocus = a;
    lastFocusId = a.getAttribute("data-open");
    openedByNav = true;
  });
  window.addEventListener("hashchange", function () { handleRoute(false); });

  function handleRoute(initial) {
    if (!state.products.length) return;
    var m = location.hash.match(ROUTE_RE);
    if (m) {
      if (initial) openedByNav = false;
      openProduct(m[1]);
    } else if (!els.modal.hidden) {
      closeModalUI();
    }
  }

  function requestClose() {
    if (openedByNav && ROUTE_RE.test(location.hash)) {
      openedByNav = false;
      history.back();
    } else {
      history.replaceState(history.state, "", location.pathname + location.search);
      closeModalUI();
    }
  }

  function setInert(on) {
    if (on) {
      each(document.querySelectorAll("body > *:not(#modal):not(script)"), function (el) {
        if (el.hasAttribute("data-inerted")) return;
        // Hanya tanda elemen yang kita ubah; kekalkan aria-hidden sedia ada (cth. sprite SVG)
        el.setAttribute("data-inerted", el.hasAttribute("aria-hidden") ? "keep" : "");
        el.setAttribute("inert", "");
        el.setAttribute("aria-hidden", "true");
      });
    } else {
      each(document.querySelectorAll("body > [data-inerted]"), function (el) {
        var keep = el.getAttribute("data-inerted") === "keep";
        el.removeAttribute("data-inerted");
        el.removeAttribute("inert");
        if (!keep) el.removeAttribute("aria-hidden");
      });
    }
  }

  function closeModalUI() {
    els.modal.hidden = true;
    setInert(false);
    document.body.classList.remove("is-locked");
    document.title = baseTitle;
    current = null;
    els.body.innerHTML = "";
    var target = lastFocus && document.contains(lastFocus) ? lastFocus : null;
    // Jika grid telah dilukis semula, cari pautan kad yang sepadan melalui data-id
    if (!target && lastFocusId) target = els.grid.querySelector('.card-title a[data-open="' + lastFocusId + '"]') || document.querySelector('a[data-open="' + lastFocusId + '"]');
    if (target) target.focus({ preventScroll: true });
    lastFocus = null;
    lastFocusId = null;
  }

  els.modal.addEventListener("click", function (e) {
    if (e.target === els.modal || e.target.closest("[data-close]")) requestClose();
  });

  document.addEventListener("keydown", function (e) {
    if (els.modal.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); requestClose(); return; }
    if (e.key === "Tab") trapFocus(e);
    if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && current && e.target.closest && !e.target.closest("input,select,textarea,.opts")) {
      stepImage(e.key === "ArrowLeft" ? -1 : 1);
    }
  });

  function trapFocus(e) {
    var f = Array.prototype.filter.call(
      els.panel.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (el) { return el.offsetParent !== null || el === document.activeElement; }
    );
    if (!f.length) { e.preventDefault(); els.panel.focus(); return; }
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === els.panel)) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    } else if (!els.panel.contains(document.activeElement)) {
      e.preventDefault(); first.focus();
    }
  }

  function realTiers(p) {
    // Tier dengan satu pilihan kosong hanyalah pemegang tempat untuk "tiada variasi"
    return (p.tiers || []).map(function (t, i) { return { name: t.name, options: t.options, index: i }; })
      .filter(function (t) { return !(t.options.length <= 1 && !String(t.options[0] || "").trim()); });
  }

  function showModal() {
    if (els.modal.hidden) {
      if (!lastFocus) lastFocus = document.activeElement;
      els.modal.hidden = false;
      setInert(true);
      document.body.classList.add("is-locked");
    }
  }

  function relatedFor(p) {
    return state.products.filter(function (q) { return q !== p && q._coll && q._coll === p._coll && q.images.length; })
      .sort(function (a, b) { return b.sold - a.sold; }).slice(0, 4);
  }

  function openProduct(id) {
    var p = state.byId[id];
    showModal();

    if (!p) {
      current = null;
      document.title = "Produk tidak ditemui | Mahligai Seni";
      els.body.innerHTML = '<div class="pd-missing"><h2 id="pd-title" class="pd-title">Produk tidak ditemui</h2>' +
        '<p>Produk ini mungkin tidak lagi tersedia. Lihat katalog atau kedai Shopee kami.</p>' +
        '<a class="btn btn-primary" href="' + SHOP_URL + '" target="_blank" rel="noopener">Kedai Shopee<span class="sr-only"> (buka tab baharu)</span></a></div>';
      els.panel.focus();
      return;
    }

    var tiers = realTiers(p);
    current = {
      p: p,
      tiers: tiers,
      sel: (p.tiers || []).map(function (t) { return (t.options.length === 1) ? 0 : null; }),
      idx: 0
    };
    if (!tiers.length) current.sel = (p.tiers || []).map(function () { return 0; });

    document.title = p._name + " | Mahligai Seni";

    var desc = p.description || "";
    var metaBits = [];
    var st = soldText(p);
    if (st) metaBits.push(esc(st));
    if (p.days_to_ship) metaBits.push("Masa penyediaan: " + p.days_to_ship + " hari");
    if (p.sku) metaBits.push("SKU: " + esc(p.sku));
    var related = relatedFor(p);

    els.body.innerHTML =
      '<article class="pd">' +
        '<div class="pd-gallery">' +
          '<div class="pd-main" id="pd-main">' +
            (p.images.length ? '<img id="pd-img" src="" alt="" width="1200" height="1200">' : '<div class="pd-noimg">Tiada gambar</div>') +
            (p.images.length > 1 ?
              '<button type="button" class="pd-nav prev" data-step="-1" aria-label="Gambar sebelumnya"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
              '<button type="button" class="pd-nav next" data-step="1" aria-label="Gambar seterusnya"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>' : "") +
            '<span class="pd-counter" id="pd-counter" aria-live="polite"></span>' +
          '</div>' +
          (p.images.length > 1 ? '<ul class="pd-thumbs" aria-label="Gambar produk">' +
            p.images.map(function (im, i) {
              return '<li><button type="button" data-thumb="' + i + '" aria-label="Gambar ' + (i + 1) + ' daripada ' + p.images.length + '">' +
                '<img src="' + esc(img(im.sm)) + '" alt="" width="64" height="64" loading="lazy" decoding="async"></button></li>';
            }).join("") + '</ul>' : "") +
          (p.images.length > 1 ? '<p class="pd-swipe-hint" aria-hidden="true">Leret gambar untuk melihat seterusnya</p>' : "") +
        '</div>' +
        '<div class="pd-info">' +
          '<p class="eyebrow pd-coll"><span class="rule" aria-hidden="true"></span>' + esc(collName(p) || "Mahligai Seni") + '</p>' +
          '<h2 class="pd-title" id="pd-title">' + esc(p._name) + '</h2>' +
          (metaBits.length ? '<p class="pd-meta">' + metaBits.map(function (m) { return "<span>" + m + "</span>"; }).join("") + '</p>' : "") +
          '<div class="pd-pricebox">' +
            '<span class="pd-price" id="pd-price"></span>' +
            '<span class="stock" id="pd-stock" role="status"></span>' +
          '</div>' +
          tiers.map(function (t) {
            var withImg = tiers.length === 1;
            return '<fieldset class="tier"><legend>' + esc(t.name || "Pilihan") + '<b id="tier-val-' + t.index + '"></b></legend>' +
              '<div class="opts" role="radiogroup" aria-label="' + esc(t.name || "Pilihan") + '" data-tier="' + t.index + '">' +
              t.options.map(function (o, oi) {
                var v = withImg ? findVariation(p, p.tiers.map(function (_, k) { return k === t.index ? oi : 0; })) : null;
                var thumb = v && v.image ? '<img src="' + esc(img(v.image.sm)) + '" alt="" width="30" height="30" loading="lazy">' : "";
                return '<button type="button" class="opt" role="radio" aria-checked="false" tabindex="-1" data-tier="' + t.index + '" data-opt="' + oi + '">' +
                  thumb + '<span>' + esc(o) + '</span></button>';
              }).join("") +
              '</div></fieldset>';
          }).join("") +
          (tiers.length ? '<p class="pd-picked" id="pd-picked"></p>' : "") +
          '<div class="pd-buy">' +
            '<a class="btn btn-primary btn-shopee" href="' + esc(p.url) + '" target="_blank" rel="noopener">' + ICON_EXT +
              'Beli di Shopee<span class="sr-only"> (buka tab baharu)</span></a>' +
            '<small>Pembelian dan pembayaran diselesaikan di Shopee.' + (tiers.length ? ' Sila pilih variasi yang sama di halaman Shopee.' : '') + '</small>' +
          '</div>' +
          '<section class="pd-desc" aria-labelledby="pd-desc-h">' +
            '<h3 id="pd-desc-h">Butiran Produk</h3>' +
            (desc ? '<div class="pd-desc-text" id="pd-desc-text">' + esc(desc) + '</div>' +
              '<button type="button" class="linklike pd-desc-toggle" id="pd-desc-toggle" aria-expanded="false" aria-controls="pd-desc-text" hidden>Baca selanjutnya</button>'
              : '<p class="pd-hint">Tiada penerangan.</p>') +
            (p.description_images && p.description_images.length ? '<div class="pd-desc-imgs">' +
              p.description_images.map(function (im) {
                var dims = im.w && im.h ? ' width="' + im.w + '" height="' + im.h + '"' : "";
                return '<img src="' + esc(img(im.sm)) + '" srcset="' + srcset(im) + '" sizes="(min-width: 860px) 480px, 92vw" alt="' + esc(p._name) + ' — gambar penerangan"' + dims + ' loading="lazy" decoding="async">';
              }).join("") + '</div>' : "") +
          '</section>' +
          (related.length ? '<section class="pd-related" aria-labelledby="pd-rel-h">' +
            '<h3 id="pd-rel-h">Dari koleksi yang sama</h3>' +
            '<ul>' + related.map(function (q) {
              return '<li><a href="#produk/' + q.id + '" data-open="' + q.id + '">' +
                '<span class="rel-img"><img class="fade" src="' + esc(img(q.images[0].sm)) + '" alt="" width="480" height="480" loading="lazy" decoding="async"></span>' +
                '<span class="rel-name">' + esc(q._name) + '</span>' +
                '<span class="rel-price">' + priceHTML(q.price_min, q.price_max) + '</span></a></li>';
            }).join("") + '</ul></section>' : "") +
        '</div>' +
      '</article>';

    each(els.body.querySelectorAll(".opts"), function (g) {
      var b = g.querySelector(".opt"); if (b) b.tabIndex = 0;
    });

    if (p.images.length) showImage(0, p.images[0]);
    updateSelection();
    markCompleted(els.body);
    els.panel.scrollTop = 0;
    els.panel.focus({ preventScroll: true });

    var dt = $("#pd-desc-text", els.body), tg = $("#pd-desc-toggle", els.body);
    if (dt && tg && dt.scrollHeight > dt.clientHeight + 8) {
      dt.classList.add("is-clamped");
      tg.hidden = false;
    }
  }

  function findVariation(p, sel) {
    if (!sel.every(function (s) { return s != null; })) return null;
    var vs = p.variations || [];
    for (var i = 0; i < vs.length; i++) {
      var ti = vs[i].tier_index || [];
      var ok = true;
      for (var k = 0; k < sel.length; k++) {
        if (ti[k] !== sel[k]) { ok = false; break; }
      }
      if (ok) return vs[i];
    }
    return null;
  }

  function matching(p, sel) {
    return (p.variations || []).filter(function (v) {
      var ti = v.tier_index || [];
      return sel.every(function (s, k) { return s == null || ti[k] === s; });
    });
  }

  // fromUser: tukar gambar utama kepada gambar variasi hanya apabila pembeli memilih sendiri
  function updateSelection(fromUser) {
    if (!current) return;
    var p = current.p, sel = current.sel;
    var complete = sel.every(function (s) { return s != null; });
    var hasVars = (p.variations || []).length > 0;
    var v = complete ? findVariation(p, sel) : null;
    var priceEl = $("#pd-price", els.body), stockEl = $("#pd-stock", els.body);

    if (v) {
      priceEl.innerHTML = money(v.price);
      setStock(stockEl, v.stock > 0 ? "ok" : "out");
      if (v.image && fromUser) showImage(-1, v.image);
    } else if (complete && hasVars && current.tiers.length) {
      // Gabungan pilihan ini tidak wujud sebagai variasi
      priceEl.innerHTML = priceHTML(p.price_min, p.price_max);
      setStock(stockEl, "muted", "Tiada gabungan ini");
    } else {
      var ms = matching(p, sel);
      var prices = ms.map(function (x) { return x.price; });
      var mn = prices.length ? Math.min.apply(null, prices) : p.price_min;
      var mx = prices.length ? Math.max.apply(null, prices) : p.price_max;
      priceEl.innerHTML = priceHTML(mn, mx);
      var anyStock = ms.length ? ms.some(function (x) { return x.stock > 0; }) : p.stock > 0;
      if (!anyStock) setStock(stockEl, "out");
      else if (complete || !current.tiers.length) setStock(stockEl, "ok");
      else setStock(stockEl, "muted", "Pilih variasi untuk semak stok");
    }

    current.tiers.forEach(function (t) {
      var btns = els.body.querySelectorAll('.opt[data-tier="' + t.index + '"]');
      each(btns, function (b) {
        var oi = +b.getAttribute("data-opt");
        var chosen = sel[t.index] === oi;
        b.setAttribute("aria-checked", String(chosen));
        var probe = sel.slice(); probe[t.index] = oi;
        var avail = matching(p, probe).some(function (x) { return x.stock > 0; });
        b.classList.toggle("is-out", !avail);
        b.setAttribute("aria-label", t.options[oi] + (avail ? "" : " (habis stok)"));
      });
      if (sel[t.index] != null) {
        each(btns, function (b) { b.tabIndex = (+b.getAttribute("data-opt") === sel[t.index]) ? 0 : -1; });
      }
      var lv = $("#tier-val-" + t.index, els.body);
      if (lv) lv.textContent = sel[t.index] != null ? t.options[sel[t.index]] : "";
    });

    var picked = $("#pd-picked", els.body);
    if (picked) {
      if (v) picked.innerHTML = 'Pilihan anda: <b>' + esc(current.tiers.map(function (t) { return t.options[sel[t.index]]; }).join(" / ")) + '</b>. Pilih variasi yang sama selepas membuka Shopee.';
      else if (complete) picked.textContent = "Gabungan ini tiada dalam senarai variasi. Sila tukar salah satu pilihan.";
      else picked.textContent = "Pilih " + current.tiers.filter(function (t) { return sel[t.index] == null; }).map(function (t) { return (t.name || "pilihan").toLowerCase(); }).join(" dan ") + " untuk melihat harga dan stok tepat.";
    }
  }

  function setStock(el, kind, text) {
    el.className = "stock " + kind;
    el.textContent = text || (kind === "ok" ? "Tersedia" : "Habis stok");
  }

  function showImage(i, imObj) {
    if (!current) return;
    var p = current.p;
    var el = $("#pd-img", els.body);
    if (!el || !imObj) return;
    var src = img(imObj.lg);
    if (el.getAttribute("src") !== src) {
      el.classList.add("is-loading");
      el.onload = el.onerror = function () { el.classList.remove("is-loading"); };
      el.setAttribute("src", src);
    }
    el.alt = p._name + (i >= 0 ? " — gambar " + (i + 1) : " — variasi pilihan");
    current.idx = i;
    var counter = $("#pd-counter", els.body);
    if (counter) counter.textContent = i >= 0 ? (i + 1) + " / " + p.images.length : "Variasi";
    each(els.body.querySelectorAll("[data-thumb]"), function (b) {
      if (+b.getAttribute("data-thumb") === i) {
        b.setAttribute("aria-current", "true");
        var ul = b.closest("ul");
        if (ul && ul.scrollWidth > ul.clientWidth) ul.scrollLeft = b.parentNode.offsetLeft - ul.clientWidth / 2 + 32;
      } else b.removeAttribute("aria-current");
    });
  }

  function stepImage(d) {
    if (!current) return;
    var n = current.p.images.length;
    if (n < 2) return;
    var i = current.idx < 0 ? (d > 0 ? 0 : n - 1) : (current.idx + d + n) % n;
    showImage(i, current.p.images[i]);
  }

  els.body.addEventListener("click", function (e) {
    var t = e.target.closest("[data-thumb]");
    if (t) { var i = +t.getAttribute("data-thumb"); showImage(i, current.p.images[i]); return; }
    var s = e.target.closest("[data-step]");
    if (s) { stepImage(+s.getAttribute("data-step")); return; }
    var o = e.target.closest(".opt");
    if (o) { choose(o); return; }
    var tg = e.target.closest("#pd-desc-toggle");
    if (tg) {
      var dt = $("#pd-desc-text", els.body);
      var open = dt.classList.toggle("is-open");
      dt.classList.toggle("is-clamped", !open);
      tg.setAttribute("aria-expanded", String(open));
      tg.textContent = open ? "Tutup" : "Baca selanjutnya";
    }
  });

  // Leret kiri/kanan pada gambar utama
  var touch = null;
  els.body.addEventListener("touchstart", function (e) {
    if (!e.target.closest("#pd-main") || e.touches.length !== 1) { touch = null; return; }
    touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  els.body.addEventListener("touchend", function (e) {
    if (!touch) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - touch.x, dy = t.clientY - touch.y;
    touch = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) stepImage(dx < 0 ? 1 : -1);
  }, { passive: true });

  function choose(o) {
    var ti = +o.getAttribute("data-tier"), oi = +o.getAttribute("data-opt");
    current.sel[ti] = oi;
    updateSelection(true);
  }

  // Navigasi kekunci anak panah untuk kumpulan radio
  els.body.addEventListener("keydown", function (e) {
    var o = e.target.closest && e.target.closest(".opt");
    if (!o) return;
    var keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); choose(o); return; }
    if (!(e.key in keys)) return;
    e.preventDefault();
    var btns = Array.prototype.slice.call(o.parentNode.querySelectorAll(".opt"));
    var n = (btns.indexOf(o) + keys[e.key] + btns.length) % btns.length;
    btns.forEach(function (b) { b.tabIndex = -1; });
    btns[n].tabIndex = 0;
    btns[n].focus();
    choose(btns[n]);
  });

  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();
})();
