/* Mama Picks Kenya: public site logic.
   You normally do not need to edit this file. Settings live in js/config.js. */
(function () {
  "use strict";

  var C = window.SITE;
  var USE_BACKEND = Boolean(C.SUPABASE_URL && C.SUPABASE_ANON_KEY);
  var API = (C.SUPABASE_URL || "").replace(/\/$/, "");
  var ALL = "all";

  var PRODUCTS = [];
  var ALL_CATEGORIES = [];
  var categoryById = {};
  var activeCategory = ALL;
  var query = "";
  var remote = {};          // product id -> heart count (backend mode)
  var saved = new Set();    // hearts this visitor has tapped

  var $grid = document.getElementById("grid");
  var $count = document.getElementById("count");
  var $empty = document.getElementById("empty");
  var $categories = document.getElementById("categories");
  var $q = document.getElementById("q");

  /* ---------- helpers ---------- */
  function slug(str) {
    return String(str).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function headers() { return { apikey: C.SUPABASE_ANON_KEY }; }

  try { saved = new Set(JSON.parse(localStorage.getItem("wishlist_ids") || "[]")); } catch (e) {}
  function persistSaved() {
    try { localStorage.setItem("wishlist_ids", JSON.stringify(Array.from(saved))); } catch (e) {}
  }

  /* ---------- page text from config ---------- */
  document.title = C.SITE_NAME + " | Pregnancy and baby finds from Jumia";
  document.getElementById("siteName").textContent = C.SITE_NAME;
  document.getElementById("year").textContent = "© " + new Date().getFullYear() + " " + C.SITE_NAME;
  if (C.SHOW_SETUP_BANNER) document.getElementById("setupBanner").hidden = false;

  document.getElementById("bookTitle").textContent = C.BOOK_TITLE;
  document.getElementById("bookPitch").textContent = C.BOOK_PITCH;
  var bookBtn = document.getElementById("bookBtn");
  bookBtn.textContent = C.BOOK_BUTTON;
  bookBtn.href = C.BOOK_LINK || "#";
  bookBtn.setAttribute("aria-label", C.BOOK_BUTTON + ": " + C.BOOK_TITLE);

  /* ---------- load products ---------- */
  function fromStatic() {
    return (window.STATIC_PRODUCTS || []).map(function (p) {
      return {
        _id: p.id || slug(p.name), name: p.name, desc: p.desc || "", category: p.category || "",
        image: p.image || "", link: p.link || C.DEFAULT_LINK, price: p.price || "",
        trending: !!p.trending, wishlist: p.wishlist || 0
      };
    });
  }

  function loadProducts() {
    if (!USE_BACKEND) return Promise.resolve(fromStatic());
    var url = API + "/rest/v1/products?select=*&published=eq.true&order=sort_order.asc,created_at.desc";
    return fetch(url, { headers: headers() })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (rows) {
        return rows.map(function (r) {
          return {
            _id: r.id, name: r.name, desc: r.description || "", category: r.category || "",
            image: r.image_url || "", link: r.link || C.DEFAULT_LINK, price: r.price || "",
            trending: !!r.trending, wishlist: 0
          };
        });
      })
      .catch(function (e) {
        console.warn("Could not reach the dashboard database, showing js/products.js instead", e);
        USE_FALLBACK_COUNTS = true;
        return fromStatic();
      });
  }
  var USE_FALLBACK_COUNTS = false;

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
  }

  function buildChips() {
    var items = [{ id: ALL, label: "All" }, { id: "trending", label: "Trending" }].concat(ALL_CATEGORIES);
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
      });
      $categories.appendChild(b);
    });
  }

  /* ---------- hearts ---------- */
  function wishCount(p) {
    if (USE_BACKEND && !USE_FALLBACK_COUNTS) return remote[p._id] || 0;
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
    btn.querySelector(".n").textContent = n > 0 ? shortNumber(n) : "Save";
    btn.setAttribute("aria-label",
      (on ? "Remove " : "Save ") + p.name + (on ? " from" : " to") + " wishlist. " + n + " saved.");
  }
  function toggleWish(p, btn) {
    var was = saved.has(p._id);
    var live = USE_BACKEND && !USE_FALLBACK_COUNTS;
    if (was) saved.delete(p._id); else saved.add(p._id);
    persistSaved();
    if (live) remote[p._id] = Math.max(0, (remote[p._id] || 0) + (was ? -1 : 1));
    updateWishUI(p, btn);
    if (!live) return;
    fetch(API + "/rest/v1/rpc/" + (was ? "remove_wish" : "add_wish"), {
      method: "POST",
      headers: { apikey: C.SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ pid: String(p._id) })
    }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
    }).catch(function () {
      // undo the tap if the server did not accept it
      if (was) saved.add(p._id); else saved.delete(p._id);
      persistSaved();
      remote[p._id] = Math.max(0, (remote[p._id] || 0) + (was ? 1 : -1));
      updateWishUI(p, btn);
    });
  }

  /* ---------- cards ---------- */
  function matches(p) {
    if (activeCategory === "trending" && !p.trending) return false;
    if (activeCategory !== ALL && activeCategory !== "trending" && p.category !== activeCategory) return false;
    if (query && (p.name + " " + p.desc).toLowerCase().indexOf(query) === -1) return false;
    return true;
  }

  function makeBadge() {
    var b = document.createElement("span");
    b.className = "badge";
    b.textContent = "Trending";
    return b;
  }

  function buildCard(p) {
    var cat = categoryById[p.category] || { emoji: "🛍️", tint: "#eee" };
    var el = document.createElement("article");
    el.className = "card";

    var photo = document.createElement("div");
    photo.className = "photo";

    function showFallback() {
      Array.prototype.slice.call(photo.querySelectorAll("img, .fallback, .badge"))
        .forEach(function (n) { n.remove(); });
      var f = document.createElement("div");
      f.className = "fallback";
      f.style.background = cat.tint;
      f.textContent = cat.emoji;
      f.setAttribute("aria-hidden", "true");
      photo.appendChild(f);
      if (p.trending) photo.appendChild(makeBadge());
    }

    if (p.image) {
      var img = document.createElement("img");
      img.src = p.image;
      img.alt = p.name;
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.addEventListener("error", showFallback);
      photo.appendChild(img);
      if (p.trending) photo.appendChild(makeBadge());
    } else {
      showFallback();
    }

    var wish = document.createElement("button");
    wish.type = "button";
    wish.className = "wish";
    wish.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg><span class="n"></span>';
    wish.addEventListener("click", function () { toggleWish(p, wish); });
    updateWishUI(p, wish);
    photo.appendChild(wish);

    var info = document.createElement("div");
    info.className = "info";

    var h = document.createElement("h2");
    h.textContent = p.name;
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

    var a = document.createElement("a");
    a.className = "btn";
    a.href = p.link;
    a.target = "_blank";
    a.rel = "sponsored noopener noreferrer";
    a.textContent = "Check it out";
    a.setAttribute("aria-label", "Check out " + p.name + " on Jumia");
    info.appendChild(a);

    el.appendChild(photo);
    el.appendChild(info);
    return el;
  }

  function render() {
    var list = PRODUCTS.filter(matches);
    $grid.innerHTML = "";
    list.forEach(function (p) { $grid.appendChild(buildCard(p)); });

    if (list.length === 0) {
      if (PRODUCTS.length === 0) {
        $empty.innerHTML = "<p><strong>New picks are on the way.</strong></p><p>Please check back soon.</p>";
      } else {
        $empty.innerHTML = "<p><strong>No products match that search.</strong></p><p>Try a different word or pick another category above.</p>";
      }
    }
    $empty.hidden = list.length > 0;
    $count.textContent = list.length + (list.length === 1 ? " product" : " products");
  }

  $q.addEventListener("input", function (e) {
    query = e.target.value.trim().toLowerCase();
    render();
  });

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
  $count.textContent = "Loading products...";
  setupAds();

  Promise.all([loadProducts(), Promise.resolve()]).then(function (res) {
    PRODUCTS = res[0];
    return loadCounts();
  }).then(function () {
    buildCategories();
    buildChips();
    render();
  });
})();
