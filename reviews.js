/* Mahligai Seni - bahagian "Dari rumah pelanggan kami"
   Data: data/reviews.json (ulasan 5 bintang bergambar dari Shopee, dijana oleh build_reviews.py).
   Pautan produk guna laluan #produk/<id> yang sedia ada dalam app.js. */
(function () {
  "use strict";

  var SHOP_URL = "https://shopee.com.my/lasercutmalaysia";
  var MONTHS = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];

  var section = document.getElementById("ulasan");
  var track = document.getElementById("review-track");
  var note = document.getElementById("reviews-note");
  var badge = document.getElementById("rating-badge");
  var prev = document.getElementById("review-prev");
  var next = document.getElementById("review-next");
  if (!section || !track) return;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function date(t) {
    var d = new Date(t * 1000);
    return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  }
  function compact(n) {
    if (n < 1000) return String(n);
    var v = Math.round(n / 100) / 10;
    return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + "k";
  }
  // Nama listing marketplace -> tajuk ringkas untuk label kad
  function shortName(name) {
    var s = String(name || "").replace(/[\u{1F000}-\u{1FFFF}☀-➿️]/gu, " ")
      .split(/\s[|\/]\s|\s-\s/)[0].replace(/\s{2,}/g, " ").trim();
    s = s.replace(/[A-Z][A-Z'’\-]+/g, function (w) {
      return /\d/.test(w) || w.length <= 2 ? w : w.charAt(0) + w.slice(1).toLowerCase();
    });
    return s.length > 56 ? s.slice(0, 54).replace(/\s+\S*$/, "") + "…" : s;
  }
  function textHTML(text) {
    return esc(text).split("\n").map(function (line) {
      var m = line.match(/^([^:]{3,14}):\s(.+)$/);
      return m ? '<span class="rv-kv"><b>' + m[1] + '</b> ' + m[2] + '</span>' : '<span>' + line + '</span>';
    }).join("");
  }

  function card(r, i) {
    var main = r.images[0];
    var thumbs = r.images.length > 1 ? '<div class="rv-thumbs">' + r.images.map(function (im, k) {
      return '<button type="button" class="rv-thumb' + (k === 0 ? ' is-on' : '') + '" data-k="' + k + '" aria-label="Gambar ' + (k + 1) + ' daripada ' + r.images.length + '"' + (k === 0 ? ' aria-current="true"' : '') + '>' +
        '<img src="' + esc(im.sm) + '" alt="" width="96" height="96" loading="lazy" decoding="async"></button>';
    }).join("") + '</div>' : "";
    return '<article class="rv-card" data-i="' + i + '">' +
      '<div class="rv-photo"><img src="' + esc(main.sm) + '" srcset="' + esc(main.sm) + ' 480w, ' + esc(main.lg) + ' 1200w" sizes="(min-width: 1080px) 380px, 82vw" alt="Gambar pelanggan: ' + esc(shortName(r.product_name)) + '" width="' + (main.w || 1200) + '" height="' + (main.h || 1200) + '" loading="lazy" decoding="async"></div>' +
      thumbs +
      '<div class="rv-body">' +
        '<p class="rv-stars"><span aria-hidden="true">' + "★★★★★".slice(0, r.stars) + '</span><span class="sr-only">' + r.stars + ' bintang</span></p>' +
        '<blockquote class="rv-text">' + textHTML(r.text) + '</blockquote>' +
        '<p class="rv-meta"><span class="rv-buyer">' + esc(r.buyer) + '</span> &middot; <time datetime="' + new Date(r.time * 1000).toISOString().slice(0, 10) + '">' + date(r.time) + '</time></p>' +
        '<a class="rv-product" href="#produk/' + r.product_id + '">' + esc(shortName(r.product_name)) + ' <span aria-hidden="true">&rarr;</span></a>' +
      '</div>' +
    '</article>';
  }

  function render(data) {
    var reviews = (data.reviews || []).filter(function (r) { return r.images && r.images.length; });
    if (!reviews.length) return;
    var sr = data.shop_rating || {};
    note.textContent = reviews.length + " ulasan 5 bintang bergambar terkini dari pembeli Shopee · Terbaru dahulu";
    if (sr.rating) {
      badge.innerHTML = '<span class="rb-score">' + Number(sr.rating).toFixed(1) + '<small>/5</small></span>' +
        '<span class="rb-count">' + compact(sr.total_ratings) + ' penilaian kedai di Shopee <span aria-hidden="true">&#8599;</span></span>' +
        '<span class="sr-only">(buka tab baharu)</span>';
      badge.href = SHOP_URL;
    } else {
      badge.hidden = true;
    }
    track.innerHTML = reviews.map(card).join("");
    section.hidden = false;

    track.addEventListener("click", function (e) {
      var t = e.target.closest(".rv-thumb");
      if (!t) return;
      var cardEl = t.closest(".rv-card");
      var r = reviews[+cardEl.getAttribute("data-i")];
      var im = r.images[+t.getAttribute("data-k")];
      var photo = cardEl.querySelector(".rv-photo img");
      photo.src = im.sm;
      photo.srcset = im.sm + " 480w, " + im.lg + " 1200w";
      photo.width = im.w || 1200;
      photo.height = im.h || 1200;
      cardEl.querySelectorAll(".rv-thumb").forEach(function (b) {
        var on = b === t;
        b.classList.toggle("is-on", on);
        if (on) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
      });
    });

    function step(dir) {
      var first = track.querySelector(".rv-card");
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      track.scrollBy({ left: dir * (first ? first.offsetWidth + gap : 320), behavior: "smooth" });
    }
    function syncNav() {
      var max = track.scrollWidth - track.clientWidth - 2;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max;
      prev.parentNode.hidden = max <= 0;
    }
    prev.addEventListener("click", function () { step(-1); });
    next.addEventListener("click", function () { step(1); });
    track.addEventListener("scroll", syncNav, { passive: true });
    window.addEventListener("resize", syncNav);
    track.addEventListener("keydown", function (e) {
      if (e.target !== track) return;
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    });
    syncNav();
    // Pautan terus ke #ulasan: tatal selepas bahagian ini dipaparkan
    if (location.hash === "#ulasan") requestAnimationFrame(function () { section.scrollIntoView(); });
  }

  fetch("data/reviews.json")
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(render)
    .catch(function (err) { console.warn("Ulasan tidak dapat dimuatkan:", err); });
})();
