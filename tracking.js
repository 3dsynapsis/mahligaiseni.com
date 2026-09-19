/* Mahligai Seni - penjejakan iklan Google
   - Simpan gclid/gbraid/wbraid dari URL (90 hari) supaya klik iklan boleh dikaitkan dengan tindakan pelawat.
   - Tambah rujukan iklan ke mesej WhatsApp (wa.me ?text=) bila pelawat datang dari iklan.
   - Hantar event klik: shopee_click, whatsapp_click, phone_click.
   Tag Google hanya dimuat bila TAG_IDS diisi. */
(function () {
  "use strict";

  // ID tag dari Google Ads (AW-XXXXXXXXXX) dan/atau GA4 (G-XXXXXXXXXX). Kosong = tiada tag dimuat.
  var TAG_IDS = ["AW-939345913"];
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
  function saved() {
    try {
      var v = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (v && v.id && Date.now() - v.t < MAX_AGE) return v;
    } catch (e) { /* abaikan */ }
    return null;
  }

  // Baca ID klik sebelum app.js menulis semula URL
  try {
    var q = new URLSearchParams(location.search);
    for (var i = 0; i < CLICK_KEYS.length; i++) {
      var id = q.get(CLICK_KEYS[i]);
      if (id) { save({ key: CLICK_KEYS[i], id: id, t: Date.now() }); break; }
    }
  } catch (e) { /* abaikan */ }

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

  // Tambah rujukan iklan ke mesej WhatsApp (sekali sahaja setiap pautan)
  function tagWhatsApp(a) {
    var ref = saved();
    if (!ref || a.getAttribute("data-ref-added")) return;
    try {
      var url = new URL(a.href);
      var text = url.searchParams.get("text") || "";
      url.searchParams.set("text", text + "\n\n(Ruj. iklan: " + ref.id + ")");
      a.href = url.toString();
      a.setAttribute("data-ref-added", "1");
    } catch (e) { /* abaikan */ }
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
