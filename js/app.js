/* Mama Picks Kenya: shop page logic.
   You normally do not need to edit this file. Settings live in js/config.js and js/features.js. */
(function () {
  "use strict";

  var C = window.SITE;
  var F = window.FEATURES || {};
  var MP = window.MP;
  var t = MP.t;
  var USE_BACKEND = Boolean(C.SUPABASE_URL && C.SUPABASE_ANON_KEY);
  var API = MP.API;
  var ALL = "all";

  var PRODUCTS = [];
  var ALL_CATEGORIES = [];
  var categoryById = {};
  var activeCategory = ALL;
  var budgetIdx = -1;
  var sortKey = "featured";
  var query = "";
  var remote = {};          // product id -> heart count (backend mode)
  var saved = new Set();    // hearts this visitor has tapped
  var USE_FALLBACK_COUNTS = false;
  var sharedIds = [];

  var $grid = document.getElementById("grid");
  var $count = document.getElementById("count");
  var $empty = document.getElementById("empty");
  var $categories = document.getElementById("categories");
  var $budgets = document.getElementById("budgets");
  var $notice = document.getElementById("notice");
  var $picks = document.getElementById("picks");
  var $strip = document.getElementById("strip");
  var $q = document.getElementById("q");
  var $sort = document.getElementById("sort");

  /* ---------- helpers ---------- */
  function slug(str) {
    return String(str).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function headers() { return { apikey: MP.KEY }; }
  function priceValue(s) {
    var m = String(s || "").replace(/,/g, "").match(/\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }
  function pageBase() { return location.origin + location.pathname; }
  function productUrl(p) { return pageBase() + "?p=" + encodeURIComponent(p._id); }
  function waLink(text) { return "https://wa.me/?text=" + encodeURIComponent(text); }
  function catLabel(c) { return t(c.label); }

  try { saved = new Set(JSON.parse(localStorage.getItem("wishlist_ids") || "[]")); } catch (e) {}
  function persistSaved() {
    try { localStorage.setItem("wishlist_ids", JSON.stringify(Array.from(saved))); } catch (e) {}
  }

  /* ---------- URL parameters (shareable links) ---------- */
  var params = new URLSearchParams(location.search);
  var startProduct = params.get("p");
  sharedIds = (params.get("list") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 60);
  activeCategory = sharedIds.length ? "shared" : (params.get("cat") || ALL);
  var b0 = parseInt(params.get("budget"), 10);
  budgetIdx = isNaN(b0) ? -1 : b0;

  function syncUrl() {
    try {
      var u = new URL(location.href);
      if (activeCategory === ALL || activeCategory === "shared") u.searchParams.delete("cat");
      else u.searchParams.set("cat", activeCategory);
      if (budgetIdx >= 0) u.searchParams.set("budget", String(budgetIdx)); else u.searchParams.delete("budget");
      if (activeCategory !== "shared") u.searchParams.delete("list");
      history.replaceState(null, "", u.toString());
    } catch (e) {}
  }

  /* ---------- load products ---------- */
  function fromStatic() {
    return (window.STATIC_PRODUCTS || []).map(function (p, i) {
      return {
        _id: p.id || slug(p.name), name: p.name, desc: p.desc || "", category: p.category || "",
        image: p.image || "", link: p.link || C.DEFAULT_LINK, price: p.price || "",
        trending: !!p.trending, badge: p.badge || "", wishlist: p.wishlist || 0,
        created: 0, idx: i, priceValue: priceValue(p.price)
      };
    });
  }

  function loadProducts() {
    if (!USE_BACKEND) return Promise.resolve(fromStatic());
    var url = API + "/rest/v1/products?select=*&published=eq.true&order=sort_order.asc,created_at.desc";
    return fetch(url, { headers: headers() })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (rows) {
        return rows.map(function (r, i) {
          return {
            _id: r.id, name: r.name, desc: r.description || "", category: r.category || "",
            image: r.image_url || "", link: r.link || C.DEFAULT_LINK, price: r.price || "",
            trending: !!r.trending, badge: r.badge || "", wishlist: 0,
            created: Date.parse(r.created_at) || 0, idx: i, priceValue: priceValue(r.price)
          };
        });
      })
      .catch(function (e) {
        console.warn("Could not reach the dashboard database, showing js/products.js instead", e);
        USE_FALLBACK_COUNTS = true;
        return fromStatic();
      });
  }

  function loadCounts() {
    if (!USE_BACKEND || USE_FALLBACK_COUNTS) return Promise.resolve();
    return fetch(API + "/rest/v1/wishlist_counts?select=product_id,clicks,adjust", { headers: headers() })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (rows) {
        rows.forEach(function (row) {
          remote[row.product_id] = Math.max(0, (row.clicks || 0) + (row.adjust || 0));
        });
      })
      .catch(function (e) { console.warn("Heart counts could not be loaded", e); });
  }

  /* ---------- categories ---------- */
  function buildCategories() {
    ALL_CATEGORIES = C.CATEGORIES.slice();
    var tints = ["#fde9ef", "#e6f1fb", "#fff5d6", "#e9f6ee", "#f3e8fb", "#e8eefc"];
    PRODUCTS.forEach(function (p) {
      if (p.category && !ALL_CATEGORIES.some(function (c) { return c.id === p.category; })) {
        ALL_CATEGORIES.push({
          id: p.category,
          label: p.category.charAt(0).toUpperCase() + p.category.slice(1),
          emoji: "🛍️",
          tint: tints[ALL_CATEGORIES.length % tints.length]
        });
      }
    });
    categoryById = {};
    ALL_CATEGORIES.forEach(function (c) { categoryById[c.id] = c; });

    var special = [ALL, "trending", "wishlist", "shared"];
    if (special.indexOf(activeCategory) === -1 && !categoryById[activeCategory]) activeCategory = ALL;
    if (budgetIdx >= (F.BUDGETS || []).length) budgetIdx = -1;
  }

  function savedCount() {
    return PRODUCTS.filter(function (p) { return saved.has(p._id); }).length;
  }

  function buildChips() {
    var n = savedCount();
    var items = [{ id: ALL, label: t("All") }, { id: "trending", label: t("Trending") }]
      .concat(ALL_CATEGORIES.map(function (c) { return { id: c.id, label: catLabel(c) }; }))
      .concat([{ id: "wishlist", label: t("My list") + (n ? " (" + n + ")" : "") }]);
    $categories.innerHTML = "";
    items.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = c.label;
      b.setAttribute("aria-pressed", String(c.id === activeCategory));
      b.addEventListener("click", function () {
        activeCategory = c.id;
        buildChips();
        render();
        syncUrl();
      });
      $categories.appendChild(b);
    });
  }

  function buildBudgets() {
    var list = F.BUDGETS || [];
    $budgets.innerHTML = "";
    if (!list.length) return;
    var items = [{ label: t("Any price"), i: -1 }].concat(list.map(function (b, i) { return { label: t(b.label), i: i }; }));
    items.forEach(function (it) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip sm";
      b.textContent = it.label;
      b.setAttribute("aria-pressed", String(it.i === budgetIdx));
      b.addEventListener("click", function () {
        budgetIdx = it.i;
        buildBudgets();
        render();
        syncUrl();
      });
      $budgets.appendChild(b);
    });
  }

  /* ---------- hearts ---------- */
  function liveHearts() { return USE_BACKEND && !USE_FALLBACK_COUNTS; }
  function wishCount(p) {
    if (liveHearts()) return remote[p._id] || 0;
    return (p.wishlist || 0) + (saved.has(p._id) ? 1 : 0);
  }
  function shortNumber(n) {
    if (n < 1000) return String(n);
    var k = n / 1000;
    return (k >= 10 ? String(Math.round(k)) : k.toFixed(1)).replace(/\.0$/, "") + "k";
  }
  function updateWishUI(p, btn) {
    var on = saved.has(p._id);
    var n = wishCount(p);
    btn.setAttribute("aria-pressed", String(on));
    btn.querySelector(".n").textContent = n > 0 ? shortNumber(n) : t("Save");
    btn.setAttribute("aria-label",
      (on ? "Remove " : "Save ") + p.name + (on ? " from" : " to") + " wishlist. " + n + " saved.");
  }
  function syncAllHearts(p) {
    Array.prototype.forEach.call(document.querySelectorAll(".wish"), function (b) {
      if (b.getAttribute("data-pid") === String(p._id)) updateWishUI(p, b);
    });
    buildChips();
    if (activeCategory === "wishlist") { render(); }
  }
  function makeWishButton(p) {
    var wish = document.createElement("button");
    wish.type = "button";
    wish.className = "wish";
    wish.setAttribute("data-pid", String(p._id));
    wish.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg><span class="n"></span>';
    wish.addEventListener("click", function () { toggleWish(p); });
    updateWishUI(p, wish);
    return wish;
  }
  function toggleWish(p) {
    var was = saved.has(p._id);
    var live = liveHearts();
    if (was) saved.delete(p._id); else saved.add(p._id);
    persistSaved();
    if (live) remote[p._id] = Math.max(0, (remote[p._id] || 0) + (was ? -1 : 1));
    syncAllHearts(p);
    MP.track(was ? "unsave" : "save", { product: p.name });
    if (!live) return;
    fetch(API + "/rest/v1/rpc/" + (was ? "remove_wish" : "add_wish"), {
      method: "POST",
      headers: { apikey: MP.KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ pid: String(p._id) })
    }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
    }).catch(function () {
      // undo the tap if the server did not accept it
      if (was) saved.add(p._id); else saved.delete(p._id);
      persistSaved();
      remote[p._id] = Math.max(0, (remote[p._id] || 0) + (was ? 1 : -1));
      syncAllHearts(p);
    });
  }

  /* ---------- filtering and sorting ---------- */
  function matches(p) {
    if (activeCategory === "trending" && !p.trending) return false;
    if (activeCategory === "wishlist" && !saved.has(p._id)) return false;
    if (activeCategory === "shared" && sharedIds.indexOf(String(p._id)) === -1) return false;
    if (["all", "trending", "wishlist", "shared"].indexOf(activeCategory) === -1 && p.category !== activeCategory) return false;
    if (query && (p.name + " " + p.desc).toLowerCase().indexOf(query) === -1) return false;
    if (budgetIdx >= 0) {
      var b = (F.BUDGETS || [])[budgetIdx];
      if (!b || p.priceValue == null) return false;
      if (b.min != null && p.priceValue < b.min) return false;
      if (b.max != null && p.priceValue >= b.max) return false;
    }
    return true;
  }

  function sorted(list) {
    var arr = list.slice();
    if (sortKey === "newest") {
      arr.sort(function (a, b) { return (b.created - a.created) || (b.idx - a.idx); });
    } else if (sortKey === "price-asc" || sortKey === "price-desc") {
      var dir = sortKey === "price-asc" ? 1 : -1;
      arr.sort(function (a, b) {
        var av = a.priceValue, bv = b.priceValue;
        if (av == null && bv == null) return a.idx - b.idx;
        if (av == null) return 1;
        if (bv == null) return -1;
        return (dir * (av - bv)) || (a.idx - b.idx);
      });
    }
    return arr;
  }

  /* ---------- cards ---------- */
  function badgeNodes(p) {
    var wrap = document.createElement("div");
    wrap.className = "badges";
    if (p.trending) {
      var b = document.createElement("span");
      b.className = "badge";
      b.textContent = t("Trending");
      wrap.appendChild(b);
    }
    if (p.badge) {
      var b2 = document.createElement("span");
      b2.className = "badge alt";
      b2.textContent = t(p.badge);
      wrap.appendChild(b2);
    }
    return wrap.children.length ? wrap : null;
  }

  function imageBox(p, container, onOpen) {
    var cat = categoryById[p.category] || { emoji: "🛍️", tint: "#eee" };
    function showFallback() {
      Array.prototype.slice.call(container.querySelectorAll("img, .fallback")).forEach(function (n) { n.remove(); });
      var f = document.createElement("div");
      f.className = "fallback";
      f.style.background = cat.tint;
      f.textContent = cat.emoji;
      f.setAttribute("aria-hidden", "true");
      container.insertBefore(f, container.firstChild);
    }
    if (p.image) {
      var img = document.createElement("img");
      img.src = p.image;
      img.alt = onOpen ? "" : p.name;
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.addEventListener("error", showFallback);
      container.insertBefore(img, container.firstChild);
    } else {
      showFallback();
    }
  }

  function shareText(p) { return p.name + " - " + productUrl(p); }

  function makeShareLink(p) {
    var a = document.createElement("a");
    a.className = "share-btn";
    a.href = waLink(shareText(p));
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.setAttribute("aria-label", t("Share on WhatsApp") + ": " + p.name);
    a.title = t("Share on WhatsApp");
    a.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>';
    a.addEventListener("click", function () { MP.logClick(p._id, "share"); MP.track("share", { product: p.name }); });
    return a;
  }

  function makeBuyLink(p) {
    var a = document.createElement("a");
    a.className = "btn";
    a.href = p.link;
    a.target = "_blank";
    a.rel = "sponsored noopener noreferrer";
    a.textContent = t("Check it out");
    a.setAttribute("aria-label", "Check out " + p.name + " on Jumia");
    a.addEventListener("click", function () { MP.logClick(p._id, "click"); MP.track("outbound_click", { product: p.name }); });
    return a;
  }

  function buildCard(p) {
    var el = document.createElement("article");
    el.className = "card";

    var photo = document.createElement("div");
    photo.className = "photo";
    var open = document.createElement("button");
    open.type = "button";
    open.className = "photo-open";
    open.setAttribute("aria-label", "View details for " + p.name);
    imageBox(p, open, true);
    open.addEventListener("click", function () { openQuickView(p, open); });
    photo.appendChild(open);
    var badges = badgeNodes(p);
    if (badges) photo.appendChild(badges);
    photo.appendChild(makeWishButton(p));

    var info = document.createElement("div");
    info.className = "info";
    var h = document.createElement("h2");
    var tb = document.createElement("button");
    tb.type = "button";
    tb.className = "title-open";
    tb.textContent = p.name;
    tb.addEventListener("click", function () { openQuickView(p, tb); });
    h.appendChild(tb);
    var d = document.createElement("p");
    d.className = "desc";
    d.textContent = p.desc;
    info.appendChild(h);
    info.appendChild(d);
    if (p.price) {
      var pr = document.createElement("p");
      pr.className = "price";
      pr.textContent = p.price;
      info.appendChild(pr);
    }
    var actions = document.createElement("div");
    actions.className = "actions";
    actions.appendChild(makeBuyLink(p));
    actions.appendChild(makeShareLink(p));
    info.appendChild(actions);

    el.appendChild(photo);
    el.appendChild(info);
    return el;
  }

  /* ---------- picks strip ---------- */
  function renderStrip() {
    var trending = PRODUCTS.filter(function (p) { return p.trending; }).slice(0, 8);
    var show = trending.length >= 3 && activeCategory === ALL && !query && budgetIdx < 0;
    $picks.hidden = !show;
    $strip.innerHTML = "";
    if (!show) return;
    trending.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pick";
      var box = document.createElement("span");
      box.className = "pimg";
      imageBox(p, box, true);
      var name = document.createElement("span");
      name.className = "pname";
      name.textContent = p.name;
      b.appendChild(box);
      b.appendChild(name);
      b.addEventListener("click", function () { openQuickView(p, b); });
      $strip.appendChild(b);
    });
  }

  /* ---------- notices (my list / shared list) ---------- */
  function renderNotice() {
    $notice.hidden = true;
    $notice.innerHTML = "";
    function addBtn(label, handler, href) {
      var el = document.createElement(href ? "a" : "button");
      el.className = "btn-sm";
      el.textContent = label;
      if (href) { el.href = href; el.target = "_blank"; el.rel = "noopener noreferrer"; }
      else { el.type = "button"; }
      if (handler) el.addEventListener("click", handler);
      $notice.appendChild(el);
    }
    if (activeCategory === "shared") {
      $notice.innerHTML = "<span>" + MP.esc(t("Someone shared a wishlist with you.")) + "</span>";
      addBtn(t("See all products"), function () {
        activeCategory = ALL; sharedIds = [];
        buildChips(); render(); syncUrl();
      });
      $notice.hidden = false;
    } else if (activeCategory === "wishlist") {
      var mine = PRODUCTS.filter(function (p) { return saved.has(p._id); });
      if (!mine.length) {
        $notice.innerHTML = "<span>" + MP.esc(t("Your saved list is empty. Tap the heart on products you like.")) + "</span>";
      } else {
        var link = pageBase() + "?list=" + mine.map(function (p) { return encodeURIComponent(p._id); }).join(",");
        $notice.innerHTML = "<span>" + mine.length + " " + MP.esc(t(mine.length === 1 ? "product" : "products")) + "</span>";
        addBtn(t("Share my list on WhatsApp"), function () { MP.track("share_list", { items: mine.length }); },
          waLink((C.SITE_NAME || "My") + " wishlist: " + link));
      }
      $notice.hidden = false;
    }
  }

  /* ---------- render ---------- */
  function render() {
    var list = sorted(PRODUCTS.filter(matches));
    $grid.innerHTML = "";
    list.forEach(function (p) { $grid.appendChild(buildCard(p)); });

    if (list.length === 0 && activeCategory !== "wishlist") {
      if (PRODUCTS.length === 0) {
        $empty.innerHTML = "<p><strong>" + MP.esc(t("New picks are on the way.")) + "</strong></p><p>" + MP.esc(t("Please check back soon.")) + "</p>";
      } else {
        $empty.innerHTML = "<p><strong>" + MP.esc(t("No products match that search.")) + "</strong></p><p>" + MP.esc(t("Try a different word or pick another category above.")) + "</p>";
      }
      $empty.hidden = false;
    } else {
      $empty.hidden = true;
    }
    $count.textContent = list.length + " " + t(list.length === 1 ? "product" : "products");
    renderStrip();
    renderNotice();
  }

  /* ---------- quick view ---------- */
  var qvEl = null, qvLastFocus = null;

  function closeQuickView() {
    if (!qvEl) return;
    qvEl.remove();
    qvEl = null;
    document.body.style.overflow = "";
    document.removeEventListener("keydown", qvKeys);
    try {
      var u = new URL(location.href);
      u.searchParams.delete("p");
      history.replaceState(null, "", u.toString());
    } catch (e) {}
    if (qvLastFocus && document.body.contains(qvLastFocus)) qvLastFocus.focus();
  }

  function qvKeys(e) {
    if (e.key === "Escape") { closeQuickView(); return; }
    if (e.key !== "Tab" || !qvEl) return;
    var f = qvEl.querySelectorAll("button, a[href], select, input");
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function openQuickView(p, trigger) {
    closeQuickView();
    qvLastFocus = trigger || null;
    var cat = categoryById[p.category];

    qvEl = document.createElement("div");
    qvEl.className = "modal";
    qvEl.setAttribute("role", "dialog");
    qvEl.setAttribute("aria-modal", "true");
    qvEl.setAttribute("aria-label", p.name);

    var box = document.createElement("div");
    box.className = "qv";

    var close = document.createElement("button");
    close.type = "button";
    close.className = "qv-close";
    close.setAttribute("aria-label", t("Close"));
    close.innerHTML = "&times;";
    close.addEventListener("click", closeQuickView);

    var photo = document.createElement("div");
    photo.className = "qv-photo";
    imageBox(p, photo, true);
    var badges = badgeNodes(p);
    if (badges) photo.appendChild(badges);
    photo.appendChild(makeWishButton(p));

    var body = document.createElement("div");
    body.className = "qv-body";
    if (cat) {
      var kicker = document.createElement("p");
      kicker.className = "qv-kicker";
      kicker.textContent = cat.emoji + " " + catLabel(cat);
      body.appendChild(kicker);
    }
    var h = document.createElement("h2");
    h.textContent = p.name;
    body.appendChild(h);
    if (p.price) {
      var pr = document.createElement("p");
      pr.className = "qv-price";
      pr.textContent = p.price;
      body.appendChild(pr);
    }
    var d = document.createElement("p");
    d.className = "qv-desc";
    d.textContent = p.desc;
    body.appendChild(d);
    var actions = document.createElement("div");
    actions.className = "actions";
    actions.appendChild(makeBuyLink(p));
    actions.appendChild(makeShareLink(p));
    body.appendChild(actions);

    box.appendChild(close);
    box.appendChild(photo);
    box.appendChild(body);
    qvEl.appendChild(box);
    qvEl.addEventListener("click", function (e) { if (e.target === qvEl) closeQuickView(); });
    document.body.appendChild(qvEl);
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", qvKeys);
    close.focus();

    try {
      var u = new URL(location.href);
      u.searchParams.set("p", String(p._id));
      history.replaceState(null, "", u.toString());
    } catch (e) {}
    MP.track("view_product", { product: p.name });
  }

  /* ---------- controls ---------- */
  $q.addEventListener("input", function (e) {
    query = e.target.value.trim().toLowerCase();
    render();
  });
  Array.prototype.forEach.call($sort.options, function (o) { o.textContent = t(o.textContent); });
  $sort.addEventListener("change", function () { sortKey = $sort.value; render(); });

  /* ---------- Google AdSense side banners ---------- */
  function setupAds() {
    var rails = [["adLeft", C.AD_SLOT_LEFT], ["adRight", C.AD_SLOT_RIGHT]];
    function visible(el) { return getComputedStyle(el).display !== "none"; }

    if (!C.ADSENSE_CLIENT) {
      rails.forEach(function (r) {
        var el = document.getElementById(r[0]);
        if (C.SHOW_SETUP_BANNER && visible(el)) {
          el.innerHTML = '<div class="ad-placeholder">Ad space<br>160 × 600<br><br>Add your AdSense details in js/config.js</div>';
        } else {
          el.remove();
        }
      });
      return;
    }

    var script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(C.ADSENSE_CLIENT);
    document.head.appendChild(script);

    rails.forEach(function (r) {
      var el = document.getElementById(r[0]);
      if (!r[1] || !visible(el)) { el.remove(); return; }   // no slot ID, or screen too small
      var ins = document.createElement("ins");
      ins.className = "adsbygoogle";
      ins.style.cssText = "display:inline-block;width:160px;height:600px";
      ins.setAttribute("data-ad-client", C.ADSENSE_CLIENT);
      ins.setAttribute("data-ad-slot", r[1]);
      el.appendChild(ins);
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
    });
  }

  /* ---------- start ---------- */
  $count.textContent = t("Loading products...");
  for (var s = 0; s < 8; s++) {
    var sk = document.createElement("div");
    sk.className = "skeleton";
    $grid.appendChild(sk);
  }
  setupAds();

  loadProducts().then(function (list) {
    PRODUCTS = list;
    return loadCounts();
  }).then(function () {
    buildCategories();
    buildChips();
    buildBudgets();
    syncUrl();
    render();
    if (startProduct) {
      var p = PRODUCTS.filter(function (x) { return String(x._id) === startProduct; })[0];
      if (p) openQuickView(p, null);
    }
  });
})();
