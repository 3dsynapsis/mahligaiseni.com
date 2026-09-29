/* Mahligai Seni - penjejakan iklan (Google Ads + GA4) & tanda sumber lead
   - Simpan gclid/gbraid/wbraid dari URL (90 hari) untuk kegunaan akan datang.
   - Tambah TANDA SUMBER ke mesej WhatsApp (wa.me ?text=), sama cara dgn
     medallanyard.com (website/js/sumber.js dlm repo SaaS):
       (ref: G-Ads)   = datang dari iklan Google (30 hari)
       (ref: ChatGPT) = datang dari iklan ChatGPT (utm_source=chatgpt & utm_medium=cpc)
       (ref: Web)     = pelawat biasa
     ⚠️ Teks ini DIBACA oleh SaaS (dashboard/leads/_laporan_harian.py ->
     TANDA_GOOGLE / TANDA_CHATGPT). Tukar di sini = tukar di sana juga.
   - Hantar event klik: shopee_click, whatsapp_click, phone_click (ke Google Ads & GA4).
   GA4 = property "Mahligai Seni" (BERASINGAN dari Medal — jangan campur jenama). */
(function () {
  "use strict";

  // ID tag dari Google Ads (AW-XXXXXXXXXX) dan/atau GA4 (G-XXXXXXXXXX). Kosong = tiada tag dimuat.
  var TAG_IDS = ["AW-939345913", "G-HRW2QRWZC1"];
  // Label conversion Google Ads ("AW-XXXXXXXXXX/abcDEF123"). Kosong = hanya event biasa dihantar.
  var CONVERSIONS = {
    shopee_click: "AW-939345913/GIOICLHoxv0cEPmP9b8D",   // Klik Shopee - Mahligai Seni
    whatsapp_click: "AW-939345913/oA1iCKvoxv0cEPmP9b8D", // Klik WhatsApp - Mahligai Seni
    phone_click: "AW-939345913/w-5oCK7oxv0cEPmP9b8D"     // Klik Telefon - Mahligai Seni
  };

  var CLICK_KEYS = ["gclid", "gbraid", "wbraid"];
  var STORE_KEY = "ms_iklan";
  var MAX_AGE = 90 * 86400000;

  function save(v) { try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch (e) { /* abaikan */ } }

  // Sumber iklan terakhir (last click) — 30 hari, sama dgn laman Medal.
  var SUMBER_KEY = "ms_sumber";
  var SUMBER_AGE = 30 * 86400000;
  var TANDA = { gads: "(ref: G-Ads)", chatgpt: "(ref: ChatGPT)", web: "(ref: Web)" };
  var sumberIni = null;   // sandaran bila storan disekat (mod peribadi)

  // Baca ID klik & sumber sebelum app.js menulis semula URL
  try {
    var q = new URLSearchParams(location.search);
    for (var i = 0; i < CLICK_KEYS.length; i++) {
      var id = q.get(CLICK_KEYS[i]);
      if (id) { save({ key: CLICK_KEYS[i], id: id, t: Date.now() }); sumberIni = "gads"; break; }
    }
    var src = (q.get("utm_source") || "").toLowerCase();
    var paid = /^(cpc|ppc|paid)/i.test(q.get("utm_medium") || "");
    if (paid && src === "google") sumberIni = "gads";
    // ChatGPT biasa (bukan iklan) tambah utm_source=chatgpt.com tanpa medium
    // -> itu bukan iklan, jadi syarat cpc WAJIB.
    if (paid && src === "chatgpt") sumberIni = "chatgpt";
    if (sumberIni) localStorage.setItem(SUMBER_KEY, JSON.stringify({ s: sumberIni, t: Date.now() }));
  } catch (e) { /* abaikan */ }

  function sumber() {
    try {
      var v = JSON.parse(localStorage.getItem(SUMBER_KEY) || "null");
      if (v && TANDA[v.s] && Date.now() - v.t < SUMBER_AGE) return v.s;
    } catch (e) { /* abaikan */ }
    return sumberIni || "web";
  }

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  if (TAG_IDS.length) {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(TAG_IDS[0]);
    document.head.appendChild(s);
    window.gtag("js", new Date());
    TAG_IDS.forEach(function (tid) { window.gtag("config", tid); });
  }

  function track(name, link) {
    window.gtag("event", name, { link_url: link });
    if (CONVERSIONS[name]) window.gtag("event", "conversion", { send_to: CONVERSIONS[name] });
  }

  // Tambah tanda sumber ke mesej WhatsApp (sekali sahaja setiap pautan)
  function tagWhatsApp(a) {
    try {
      var url = new URL(a.href);
      var text = url.searchParams.get("text") || "Assalamualaikum Mahligai Seni.";
      if (text.indexOf("(ref:") !== -1) return;   // dah bertanda
      url.searchParams.set("text", text.replace(/\s+$/, "") + "\n\n" + TANDA[sumber()]);
      a.href = url.toString();
    } catch (e) { /* pautan pelik — biar asal, jualan lebih penting */ }
  }

  // Fasa capture: pautan dikemas kini sebelum pelayar membukanya
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    var href = a.href;
    if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href)) {
      tagWhatsApp(a);
      track("whatsapp_click", href.split("?")[0]);
    } else if (/^tel:/.test(href)) {
      track("phone_click", href);
    } else if (/^https:\/\/([a-z]+\.)?shopee\.com\.my\//.test(href)) {
      track("shopee_click", href);
    }
  }, true);
})();
