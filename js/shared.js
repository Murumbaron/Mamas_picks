/* Shared pieces used on every page: header, footer, announcement bar,
   book banner, language switch, analytics and small helpers.
   Settings live in js/config.js and js/features.js. */
(function () {
  "use strict";

  var C = window.SITE || {};
  var F = window.FEATURES || {};
  var SW_BUILTIN = {
    "Blog": "Blogu",
    "From the blog": "Kutoka kwenye blogu",
    "See all posts": "Tazama makala zote",
    "Read more": "Soma zaidi",
    "min read": "dakika za kusoma",
    "Share this post": "Shiriki makala hii",
    "Copy link": "Nakili kiungo",
    "Link copied": "Kiungo kimenakiliwa",
    "More to read": "Soma zaidi makala nyingine",
    "Load more": "Pakia zaidi",
    "Loading posts...": "Inapakia makala...",
    "No posts yet. Please check back soon.": "Bado hakuna makala. Tafadhali rudi tena hivi karibuni."
  };
  var SW = {};
  Object.keys(SW_BUILTIN).forEach(function (k) { SW[k] = SW_BUILTIN[k]; });
  Object.keys(F.SWAHILI || {}).forEach(function (k) { SW[k] = F.SWAHILI[k]; });
  var page = document.body.getAttribute("data-page") || "";

  var lang = "en";
  try { lang = localStorage.getItem("mp_lang") === "sw" ? "sw" : "en"; } catch (e) {}

  function t(s) { return lang === "sw" && SW[s] ? SW[s] : s; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function cleanUrl(u) {
    u = String(u || "").trim();
    try { return new URL(u).origin; } catch (e) { return u.replace(/\/+$/, ""); }
  }

  var API = cleanUrl(C.SUPABASE_URL);
  var KEY = String(C.SUPABASE_ANON_KEY || "").trim();
  var canLog = Boolean(API && KEY);

  /* ---------- analytics ---------- */
  if (F.GA_ID) {
    var g = document.createElement("script");
    g.async = true;
    g.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(F.GA_ID);
    document.head.appendChild(g);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", F.GA_ID);
  } else if (F.PLAUSIBLE_DOMAIN) {
    var pl = document.createElement("script");
    pl.defer = true;
    pl.setAttribute("data-domain", F.PLAUSIBLE_DOMAIN);
    pl.src = "https://plausible.io/js/script.js";
    document.head.appendChild(pl);
    window.plausible = window.plausible || function () {
      (window.plausible.q = window.plausible.q || []).push(arguments);
    };
  }

  function track(name, props) {
    try {
      if (window.gtag) window.gtag("event", name, props || {});
      if (window.plausible) window.plausible(name, { props: props || {} });
    } catch (e) {}
  }

  /* Anonymous click counter for the dashboard "Insights" tab.
     Quietly does nothing if the optional supabase-upgrade.sql has not been run. */
  var logBroken = false;
  function logClick(productId, kind) {
    if (!canLog || logBroken || !productId) return;
    try {
      fetch(API + "/rest/v1/click_events", {
        method: "POST",
        headers: { apikey: KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ product_id: String(productId).slice(0, 80), kind: kind || "click" })
      }).then(function (r) { if (!r.ok) logBroken = true; })
        .catch(function () { logBroken = true; });
    } catch (e) { logBroken = true; }
  }

  /* ---------- blog helpers shared by the blog, post and home pages ---------- */
  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function fetchPosts(opts) {
    opts = opts || {};
    if (!canLog) return Promise.resolve([]);
    var cols = opts.full ? "*" : "id,title,slug,excerpt,cover_url,category,reading_minutes,published_at";
    var q = "select=" + cols + "&published=eq.true&order=published_at.desc";
    if (opts.slug) q += "&slug=eq." + encodeURIComponent(opts.slug);
    if (opts.category) q += "&category=eq." + encodeURIComponent(opts.category);
    if (opts.limit) q += "&limit=" + opts.limit;
    if (opts.offset) q += "&offset=" + opts.offset;
    return fetch(API + "/rest/v1/posts?" + q, { headers: { apikey: KEY } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(function (e) { console.warn("Blog posts could not be loaded", e); return null; });
  }

  function postCard(p) {
    var img = p.cover_url
      ? '<img src="' + esc(p.cover_url) + '" alt="" loading="lazy">'
      : '<span class="pc-fallback" aria-hidden="true">📝</span>';
    return '<a class="post-card" href="post.html?slug=' + encodeURIComponent(p.slug) + '">' +
      '<span class="pc-img">' + img + "</span>" +
      '<span class="pc-body">' +
        (p.category ? '<span class="tag">' + esc(p.category) + "</span>" : "") +
        "<h3>" + esc(p.title) + "</h3>" +
        (p.excerpt ? "<p>" + esc(p.excerpt) + "</p>" : "") +
        '<span class="meta">' + esc(fmtDate(p.published_at)) + (p.reading_minutes ? " &middot; " + p.reading_minutes + " " + esc(t("min read")) : "") + "</span>" +
      "</span></a>";
  }

  window.MP = { lang: lang, t: t, esc: esc, API: API, KEY: KEY, track: track, logClick: logClick,
                fetchPosts: fetchPosts, postCard: postCard, fmtDate: fmtDate };

  /* ---------- announcement bar ---------- */
  (function promo() {
    var p = F.PROMO;
    if (!p || !p.text) return;
    var today = new Date().toISOString().slice(0, 10);
    if (p.start && today < p.start) return;
    if (p.end && today > p.end) return;
    var key = "mp_promo_" + p.text;
    try { if (localStorage.getItem(key) === "closed") return; } catch (e) {}
    var bar = document.createElement("div");
    bar.className = "promo";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Announcement");
    bar.innerHTML = "<span>" + esc(p.text) + "</span>" +
      (p.link ? ' <a href="' + esc(p.link) + '">' + esc(p.linkText || "Learn more") + "</a>" : "") +
      '<button type="button" aria-label="Close announcement">&times;</button>';
    bar.querySelector("button").addEventListener("click", function () {
      bar.remove();
      try { localStorage.setItem(key, "closed"); } catch (e) {}
    });
    document.body.insertBefore(bar, document.body.firstChild);
  })();

  /* ---------- demo banner (home page only) ---------- */
  if (page === "home" && C.SHOW_SETUP_BANNER) {
    var sb = document.createElement("div");
    sb.className = "setup-banner";
    sb.textContent = "Demo mode: set SHOW_SETUP_BANNER to false in js/config.js when you are ready to go live.";
    document.body.insertBefore(sb, document.body.firstChild);
  }

  /* ---------- header ---------- */
  var HEART = '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>';
  var file = (location.pathname.split("/").pop() || "index.html");
  var NAV = [
    ["index.html", "Shop"],
    ["blog.html", "Blog"],
    ["guides.html", "Guides"],
    ["about.html", "About"]
  ];
  // Pages that belong under a menu item (so the menu item stays highlighted)
  var PARENT = {
    "post.html": "blog.html",
    "hospital-bag-checklist.html": "guides.html", "due-date-calculator.html": "guides.html",
    "newborn-essentials-guide.html": "guides.html", "baby-shower-gift-guide.html": "guides.html"
  };
  var currentNav = PARENT[location.pathname.split("/").pop()] || (location.pathname.split("/").pop() || "index.html");

  var headerEl = document.getElementById("site-header");
  if (headerEl) {
    var links = NAV.map(function (n) {
      var cur = n[0] === currentNav ? ' aria-current="page"' : "";
      return '<a href="' + n[0] + '"' + cur + ">" + esc(t(n[1])) + "</a>";
    }).join("");
    headerEl.className = "site-header";
    headerEl.innerHTML =
      '<div class="wrap nav">' +
        '<a class="logo" href="index.html" aria-label="' + esc(C.SITE_NAME) + ' home">' +
          '<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="#14303a"/><path transform="translate(8 8)" fill="#e0476f" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>' +
          "<span>" + esc(C.SITE_NAME) + "</span></a>" +
        '<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-links">' + esc(t("Menu")) + "</button>" +
        '<nav class="nav-links" id="nav-links" aria-label="Main">' + links +
          '<span class="lang" role="group" aria-label="Language">' +
            '<button type="button" data-lang="en" aria-pressed="' + (lang === "en") + '">EN</button>' +
            '<button type="button" data-lang="sw" aria-pressed="' + (lang === "sw") + '">SW</button>' +
          "</span>" +
        "</nav>" +
      "</div>";

    var toggle = headerEl.querySelector(".nav-toggle");
    var nav = headerEl.querySelector(".nav-links");
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    Array.prototype.forEach.call(headerEl.querySelectorAll("[data-lang]"), function (b) {
      b.addEventListener("click", function () {
        try { localStorage.setItem("mp_lang", b.getAttribute("data-lang")); } catch (e) {}
        location.reload();
      });
    });
  }

  /* ---------- footer ---------- */
  var footerEl = document.getElementById("site-footer");
  if (footerEl) {
    var social = [
      ["WhatsApp channel", F.WHATSAPP_CHANNEL], ["TikTok", F.TIKTOK], ["Instagram", F.INSTAGRAM],
      ["Facebook", F.FACEBOOK], ["YouTube", F.YOUTUBE]
    ].filter(function (s) { return s[1]; }).map(function (s) {
      return '<li><a href="' + esc(s[1]) + '" target="_blank" rel="noopener">' + esc(s[0]) + "</a></li>";
    });
    if (F.CONTACT_EMAIL) social.push('<li><a href="mailto:' + esc(F.CONTACT_EMAIL) + '">' + esc(F.CONTACT_EMAIL) + "</a></li>");
    social.push('<li><a href="contact.html">' + esc(t("Contact")) + "</a></li>");

    var joinBtns = "";
    if (F.NEWSLETTER_LINK) {
      joinBtns += '<a href="' + esc(F.NEWSLETTER_LINK) + '" target="_blank" rel="noopener">' + esc(t(F.NEWSLETTER_BUTTON || "Get the free sample chapter")) + "</a>";
    }
    if (F.WHATSAPP_CHANNEL) {
      joinBtns += '<a href="' + esc(F.WHATSAPP_CHANNEL) + '" target="_blank" rel="noopener">' + esc(t("Join our WhatsApp channel")) + "</a>";
    }
    var join = joinBtns
      ? '<div class="join"><p>' + esc(t(F.JOIN_TEXT || "Get new picks and helpful tips for mums, straight to your phone.")) + '</p><div class="join-actions">' + joinBtns + "</div></div>"
      : "";

    footerEl.className = "site-footer";
    footerEl.innerHTML =
      '<div class="wrap">' + join +
        '<div class="footer-grid">' +
          "<div><h3>" + esc(C.SITE_NAME) + "</h3><p>" + esc(t("Handpicked finds for bump, birth and baby")) + ".</p></div>" +
          "<div><h3>" + esc(t("Explore")) + '</h3><ul><li><a href="index.html">' + esc(t("Shop")) + '</a></li><li><a href="blog.html">' + esc(t("Blog")) + '</a></li><li><a href="guides.html">' + esc(t("Guides")) +
            '</a></li><li><a href="hospital-bag-checklist.html">' + esc(t("Hospital bag list")) + '</a></li><li><a href="due-date-calculator.html">' + esc(t("Due date calculator")) +
            '</a></li><li><a href="about.html">' + esc(t("About")) + '</a></li><li><a href="privacy.html">' + esc(t("Privacy")) + "</a></li></ul></div>" +
          "<div><h3>" + esc(t("Connect")) + "</h3><ul>" + social.join("") + "</ul></div>" +
        "</div>" +
        '<div class="disclosure"><p><strong>' + esc(t("Affiliate disclosure:")) + "</strong> " +
          esc(t("Some links on this site are affiliate links. If you buy through them, we may earn a small commission from Jumia at no extra cost to you.")) + "</p>" +
          "<p>" + esc(t("Prices, photos and availability are set by Jumia and can change. Check the product page before you order.")) + "</p>" +
          "<p>&copy; " + new Date().getFullYear() + " " + esc(C.SITE_NAME) + "</p></div>" +
      "</div>";
  }

  /* ---------- book banner ---------- */
  var bar = document.createElement("aside");
  bar.className = "book-bar";
  bar.setAttribute("aria-label", "Featured book");
  bar.innerHTML =
    '<div class="inner"><span class="icon" aria-hidden="true">📖</span>' +
    '<div class="text"><span class="title">' + esc(C.BOOK_TITLE) + '</span><span class="pitch">' + esc(C.BOOK_PITCH) + "</span></div>" +
    '<a class="buy" target="_blank" rel="noopener noreferrer" href="' + esc(C.BOOK_LINK || "#") + '" aria-label="' + esc(C.BOOK_BUTTON + ": " + C.BOOK_TITLE) + '">' + esc(C.BOOK_BUTTON) + "</a></div>";
  bar.querySelector(".buy").addEventListener("click", function () { track("book_click", { title: C.BOOK_TITLE }); });
  document.body.appendChild(bar);

  /* ---------- back to top ---------- */
  var top = document.createElement("button");
  top.type = "button";
  top.className = "to-top";
  top.setAttribute("aria-label", t("Back to top"));
  top.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  top.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
  document.body.appendChild(top);
  window.addEventListener("scroll", function () {
    top.classList.toggle("show", window.scrollY > 700);
  }, { passive: true });

  /* ---------- translate marked text ---------- */
  if (lang === "sw") {
    document.documentElement.lang = page === "home" ? "sw" : document.documentElement.lang;
    Array.prototype.forEach.call(document.querySelectorAll("[data-t]"), function (el) { el.textContent = t(el.textContent.trim()); });
  }
  Array.prototype.forEach.call(document.querySelectorAll("[data-t-placeholder]"), function (el) {
    el.setAttribute("placeholder", t(el.getAttribute("data-t-placeholder")));
  });

  /* ---------- contact details used on other pages ---------- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-contact-email]"), function (el) {
    if (F.CONTACT_EMAIL) {
      el.innerHTML = '<a href="mailto:' + esc(F.CONTACT_EMAIL) + '">' + esc(F.CONTACT_EMAIL) + "</a>";
    } else {
      el.innerHTML = '<a href="contact.html">the contact page</a>';
    }
  });
})();
