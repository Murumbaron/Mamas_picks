/* Mama Picks Kenya: dashboard logic.
   Talks to Supabase (database + image storage). Settings live in ../js/config.js */
(function () {
  "use strict";

  var C = window.SITE;
  var BUCKET = "product-images";
  var IMG_SIZE = 800;     // every uploaded photo becomes a square of this many pixels
  var JPEG_QUALITY = 0.86;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function slug(str) {
    return String(str).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  var toastTimer;
  function toast(msg, isError) {
    var t = $("#toast");
    t.textContent = msg;
    t.style.background = isError ? "#b91c1c" : "";
    show(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { hide(t); }, isError ? 6000 : 3000);
  }

  /* ---------- not configured / library missing ---------- */
  if (!C.SUPABASE_URL || !C.SUPABASE_ANON_KEY) { show($("#notConfigured")); return; }
  if (!window.supabase) {
    $("#notConfigured").querySelector("p").textContent =
      "The Supabase library could not be loaded. Check your internet connection and refresh.";
    show($("#notConfigured"));
    return;
  }

  /* Accepts a pasted address even with a trailing slash or extra path,
     and reduces it to the plain  https://xxxx.supabase.co  form. */
  function cleanUrl(u) {
    u = String(u || "").trim();
    try { return new URL(u).origin; } catch (e) { return u.replace(/\/+$/, ""); }
  }
  var sb = window.supabase.createClient(cleanUrl(C.SUPABASE_URL), String(C.SUPABASE_ANON_KEY).trim());

  /* ---------- state ---------- */
  var products = [];
  var images = [];          // {name, url, created}
  var counts = {};          // product id -> {clicks, adjust}
  var pickerCallback = null;
  var blogImages = [];      // images inside the blog/ folder
  var posts = [];
  var blogReady = false;    // true once supabase-blog.sql has been run
  var HAS_BADGE = false;    // true once the optional supabase-upgrade.sql has been run

  /* ---------- modals ---------- */
  function openModal(id) {
    var m = $("#" + id);
    m.classList.remove("hidden");
    m.classList.add("flex");
  }
  function closeModal(id) {
    var m = $("#" + id);
    m.classList.add("hidden");
    m.classList.remove("flex");
  }
  document.addEventListener("click", function (e) {
    var c = e.target.closest("[data-close]");
    if (c) closeModal(c.getAttribute("data-close"));
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!$("#pickerModal").classList.contains("hidden")) { closeModal("pickerModal"); return; }
    if (!$("#postModal").classList.contains("hidden")) { requestClosePost(); return; }
    closeModal("productModal");
  });

  /* ---------- auth ---------- */
  function showLogin(message) {
    hide($("#appView"));
    show($("#loginView"));
    var err = $("#loginError");
    if (message) { err.textContent = message; show(err); } else { hide(err); }
  }

  async function enter(session) {
    var res = await sb.rpc("is_admin");
    if (res.error || res.data !== true) {
      await sb.auth.signOut();
      showLogin("This account is not the dashboard admin. Check the email you put in supabase-setup.sql.");
      return;
    }
    $("#userEmail").textContent = session.user.email;
    hide($("#loginView"));
    show($("#appView"));
    var probe = await sb.from("products").select("badge").limit(1);
    HAS_BADGE = !probe.error;
    if (HAS_BADGE) show($("#pfBadgeWrap")); else hide($("#pfBadgeWrap"));
    await refreshAll();
  }

  $("#loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var btn = $("#loginBtn");
    btn.disabled = true;
    hide($("#loginError"));
    var res = await sb.auth.signInWithPassword({
      email: $("#email").value.trim(),
      password: $("#password").value
    });
    btn.disabled = false;
    if (res.error) { showLogin(res.error.message); return; }
    await enter(res.data.session);
  });

  $("#signOut").addEventListener("click", async function () {
    await sb.auth.signOut();
    products = []; images = []; counts = {};
    showLogin();
  });

  /* ---------- tabs ---------- */
  function selectTab(which) {
    ["products", "images", "blog", "insights"].forEach(function (name) {
      var cap = name.charAt(0).toUpperCase() + name.slice(1);
      $("#tab" + cap).setAttribute("aria-selected", String(name === which));
      if (name === which) show($("#panel" + cap)); else hide($("#panel" + cap));
    });
    if (which === "insights") loadInsights();
  }
  $("#tabProducts").addEventListener("click", function () { selectTab("products"); });
  $("#tabImages").addEventListener("click", function () { selectTab("images"); });
  $("#tabBlog").addEventListener("click", function () { selectTab("blog"); });
  $("#tabInsights").addEventListener("click", function () { selectTab("insights"); });

  /* ---------- loading data ---------- */
  async function loadProducts() {
    var r = await sb.from("products").select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (r.error) { toast("Could not load products: " + r.error.message, true); return; }
    products = r.data || [];
  }

  async function loadCounts() {
    var r = await sb.from("wishlist_counts").select("*");
    if (r.error) { toast("Could not load heart counts: " + r.error.message, true); return; }
    counts = {};
    (r.data || []).forEach(function (row) { counts[row.product_id] = row; });
  }

  function mapFiles(list, prefix) {
    return (list || [])
      .filter(function (o) { return o.name && o.name.charAt(0) !== "." && o.id; })   // skips folders
      .map(function (o) {
        var path = prefix + o.name;
        return {
          name: o.name,
          path: path,
          url: sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
          created: o.created_at
        };
      });
  }

  async function loadImages() {
    var r = await sb.storage.from(BUCKET).list("", {
      limit: 500,
      sortBy: { column: "created_at", order: "desc" }
    });
    if (r.error) { toast("Could not load photos: " + r.error.message, true); return; }
    images = mapFiles(r.data, "");
  }

  async function loadBlogImages() {
    var r = await sb.storage.from(BUCKET).list("blog", {
      limit: 500,
      sortBy: { column: "created_at", order: "desc" }
    });
    if (r.error) { blogImages = []; return; }
    blogImages = mapFiles(r.data, "blog/");
  }

  async function loadPosts() {
    var r = await sb.from("posts").select("*").order("created_at", { ascending: false });
    if (r.error) { blogReady = false; posts = []; return; }
    blogReady = true;
    posts = r.data || [];
  }

  async function refreshAll() {
    await Promise.all([loadProducts(), loadImages(), loadBlogImages(), loadCounts(), loadPosts()]);
    renderProducts();
    renderImages();
    renderBlog();
  }

  /* ---------- products list ---------- */
  function categoryEmoji(id) {
    var c = (C.CATEGORIES || []).filter(function (x) { return x.id === id; })[0];
    return c ? c.emoji : "🛍️";
  }

  function heartsText(id) {
    var c = counts[id] || { clicks: 0, adjust: 0 };
    var shown = Math.max(0, (c.clicks || 0) + (c.adjust || 0));
    return { clicks: c.clicks || 0, adjust: c.adjust || 0, shown: shown };
  }

  function renderProducts() {
    $("#productsTitle").textContent = "Products (" + products.length + ")";
    var list = $("#productList");
    list.innerHTML = "";
    if (products.length === 0) { show($("#productsEmpty")); return; }
    hide($("#productsEmpty"));

    products.forEach(function (p) {
      var h = heartsText(p.id);
      var thumb = p.image_url
        ? '<img src="' + esc(p.image_url) + '" alt="" class="h-full w-full object-contain">'
        : '<span class="text-2xl">' + categoryEmoji(p.category) + "</span>";
      var badges = "";
      if (p.trending) badges += '<span class="rounded bg-sun px-2 py-0.5 text-xs font-bold">Trending</span> ';
      if (p.badge) badges += '<span class="rounded bg-ink px-2 py-0.5 text-xs font-bold text-white">' + esc(p.badge) + '</span> ';
      if (!p.published) badges += '<span class="rounded bg-ink px-2 py-0.5 text-xs font-bold text-white">Hidden</span> ';

      var row = document.createElement("div");
      row.className = "flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm";
      row.innerHTML =
        '<div class="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-lg border border-line bg-white">' + thumb + "</div>" +
        '<div class="min-w-0 flex-1">' +
          '<p class="truncate font-semibold">' + esc(p.name) + "</p>" +
          '<p class="truncate text-sm text-soft">' + esc(p.category || "no category") + (p.price ? " · " + esc(p.price) : "") + "</p>" +
          '<p class="text-xs text-soft">Hearts shown: ' + h.shown + " (" + h.clicks + " real " + (h.adjust >= 0 ? "+ " : "- ") + Math.abs(h.adjust) + " adjustment)</p>" +
          '<div class="mt-1">' + badges + "</div>" +
        "</div>" +
        '<div class="flex flex-none flex-col items-end gap-2">' +
          '<div class="flex gap-2">' +
            '<button type="button" class="btn-ghost !px-3" data-action="up" data-id="' + esc(p.id) + '" aria-label="Move ' + esc(p.name) + ' up" title="Move up">&uarr;</button>' +
            '<button type="button" class="btn-ghost !px-3" data-action="down" data-id="' + esc(p.id) + '" aria-label="Move ' + esc(p.name) + ' down" title="Move down">&darr;</button>' +
          "</div>" +
          '<div class="flex gap-2">' +
            '<button type="button" class="btn-ghost" data-action="edit" data-id="' + esc(p.id) + '">Edit</button>' +
            '<button type="button" class="btn-ghost" data-action="duplicate" data-id="' + esc(p.id) + '">Copy</button>' +
            '<button type="button" class="btn-danger" data-action="delete" data-id="' + esc(p.id) + '">Delete</button>' +
          "</div>" +
        "</div>";
      list.appendChild(row);
    });
  }

  $("#productList").addEventListener("click", function (e) {
    var b = e.target.closest("[data-action]");
    if (!b) return;
    var id = b.getAttribute("data-id");
    var p = products.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    var act = b.getAttribute("data-action");
    if (act === "edit") openProductForm(p, false);
    else if (act === "duplicate") openProductForm(p, true);
    else if (act === "up") moveProduct(p, -1);
    else if (act === "down") moveProduct(p, 1);
    else deleteProduct(p);
  });

  /* Move a product up or down the list (the order shoppers see). */
  async function moveProduct(p, dir) {
    var i = products.indexOf(p);
    var j = i + dir;
    if (i < 0 || j < 0 || j >= products.length) return;
    var order = products.slice();
    order[i] = order[j];
    order[j] = p;
    var jobs = [];
    order.forEach(function (item, idx) {
      var want = idx * 10;
      if (item.sort_order !== want) {
        jobs.push(sb.from("products").update({ sort_order: want }).eq("id", item.id));
      }
    });
    var results = await Promise.all(jobs);
    var bad = results.filter(function (r) { return r.error; })[0];
    if (bad) { toast("Could not reorder: " + bad.error.message, true); }
    await loadProducts();
    renderProducts();
  }

  async function deleteProduct(p) {
    if (!confirm('Delete "' + p.name + '"? This cannot be undone.\n\n(The photo stays in your Photo library.)')) return;
    var r = await sb.from("products").delete().eq("id", p.id);
    if (r.error) { toast("Could not delete: " + r.error.message, true); return; }
    await sb.from("wishlist_counts").delete().eq("product_id", p.id);
    toast("Product deleted");
    await Promise.all([loadProducts(), loadCounts()]);
    renderProducts();
    renderImages();
  }

  /* ---------- product form ---------- */
  function fillCategoryList() {
    var dl = $("#catList");
    dl.innerHTML = (C.CATEGORIES || []).map(function (c) {
      return '<option value="' + esc(c.id) + '">' + esc(c.label) + "</option>";
    }).join("");
  }

  function setFormImage(url) {
    $("#pfImage").value = url || "";
    var box = $("#pfPreview");
    if (url) {
      box.innerHTML = '<img src="' + esc(url) + '" alt="Selected photo" class="h-full w-full object-contain">';
      show($("#pfRemoveImage"));
    } else {
      box.textContent = categoryEmoji($("#pfCategory").value.trim().toLowerCase());
      hide($("#pfRemoveImage"));
    }
  }

  function openProductForm(p, asCopy) {
    fillCategoryList();
    var fresh = !p || asCopy;
    $("#productModalTitle").textContent = !p ? "Add product" : (asCopy ? "Copy product" : "Edit product");
    $("#pfId").value = fresh ? "" : p.id;
    $("#pfName").value = !p ? "" : (asCopy ? p.name + " (copy)" : p.name);
    $("#pfDesc").value = !p ? "" : (p.description || "");
    $("#pfCategory").value = !p ? "" : (p.category || "");
    $("#pfPrice").value = !p ? "" : (p.price || "");
    $("#pfLink").value = !p ? (C.DEFAULT_LINK || "") : (p.link || "");
    $("#pfSort").value = !p ? 0 : (p.sort_order || 0);
    $("#pfBadge").value = !p ? "" : (p.badge || "");
    $("#pfTrending").checked = !p ? false : !!p.trending;
    $("#pfPublished").checked = !p ? true : !!p.published;
    $("#pfCrop").checked = false;
    $("#pfUploadStatus").textContent = "";

    var h = fresh ? { clicks: 0, adjust: 0, shown: 0 } : heartsText(p.id);
    $("#pfAdjust").value = h.adjust;
    $("#pfHearts").textContent = "Real taps so far: " + h.clicks + ". Shown on the site = real taps + this number.";

    setFormImage(!p ? "" : p.image_url);
    openModal("productModal");
    $("#pfName").focus();
  }

  $("#addProduct").addEventListener("click", function () { openProductForm(null, false); });
  $("#pfRemoveImage").addEventListener("click", function () { setFormImage(""); });
  $("#pfCategory").addEventListener("input", function () {
    if (!$("#pfImage").value) setFormImage("");
  });

  $("#pfPick").addEventListener("click", function () {
    openPicker(function (url) { setFormImage(url); });
  });

  $("#pfFile").addEventListener("change", async function (e) {
    var file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    $("#pfUploadStatus").textContent = "Uploading...";
    try {
      var url = await uploadPhoto(file, $("#pfCrop").checked ? "crop" : "fit");
      setFormImage(url);
      $("#pfUploadStatus").textContent = "Photo uploaded.";
      await loadImages();
      renderImages();
    } catch (err) {
      $("#pfUploadStatus").textContent = "";
      toast(err.message || "Upload failed", true);
    }
  });

  $("#productForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var name = $("#pfName").value.trim();
    if (!name) { toast("Please enter a product name", true); return; }

    var payload = {
      name: name,
      description: $("#pfDesc").value.trim(),
      category: $("#pfCategory").value.trim().toLowerCase().replace(/\s+/g, "-"),
      image_url: $("#pfImage").value,
      link: $("#pfLink").value.trim() || C.DEFAULT_LINK || "",
      price: $("#pfPrice").value.trim(),
      trending: $("#pfTrending").checked,
      published: $("#pfPublished").checked,
      sort_order: parseInt($("#pfSort").value, 10) || 0
    };
    if (HAS_BADGE) payload.badge = $("#pfBadge").value.trim();
    var adjust = parseInt($("#pfAdjust").value, 10) || 0;
    var id = $("#pfId").value;

    var save = $("#pfSave");
    save.disabled = true;
    save.textContent = "Saving...";

    try {
      if (id) {
        var u = await sb.from("products").update(payload).eq("id", id);
        if (u.error) throw u.error;
      } else {
        var ins = await sb.from("products").insert(payload).select().single();
        if (ins.error) throw ins.error;
        id = ins.data.id;
      }
      var w = await sb.from("wishlist_counts").upsert(
        { product_id: String(id), adjust: adjust }, { onConflict: "product_id" });
      if (w.error) throw w.error;

      closeModal("productModal");
      toast("Saved");
      await Promise.all([loadProducts(), loadCounts()]);
      renderProducts();
      renderImages();
    } catch (err) {
      toast("Could not save: " + (err.message || err), true);
    } finally {
      save.disabled = false;
      save.textContent = "Save product";
    }
  });

  /* ---------- image processing and upload ---------- */
  function loadImageElement(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('"' + file.name + '" could not be read as a picture. Try a JPG, PNG or WebP file.'));
      };
      img.src = url;
    });
  }

  /* Resizes any picture to a square IMG_SIZE x IMG_SIZE JPEG.
     mode "fit":  whole picture visible, white borders where needed
     mode "crop": picture fills the square, edges trimmed */
  async function makeSquareBlob(file, mode) {
    var img = await loadImageElement(file);
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var canvas = document.createElement("canvas");
    canvas.width = IMG_SIZE;
    canvas.height = IMG_SIZE;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, IMG_SIZE, IMG_SIZE);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    var scale = mode === "crop"
      ? Math.max(IMG_SIZE / iw, IMG_SIZE / ih)
      : Math.min(IMG_SIZE / iw, IMG_SIZE / ih);
    var w = iw * scale, h = ih * scale;
    ctx.drawImage(img, (IMG_SIZE - w) / 2, (IMG_SIZE - h) / 2, w, h);
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) {
        if (b) resolve(b); else reject(new Error("Could not process the picture"));
      }, "image/jpeg", JPEG_QUALITY);
    });
  }

  /* Blog images keep their shape: shrunk to at most BLOG_MAX pixels wide (never enlarged). */
  var BLOG_MAX = 1200;
  async function makeBlogBlob(file) {
    var img = await loadImageElement(file);
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var scale = Math.min(1, BLOG_MAX / iw);
    var w = Math.max(1, Math.round(iw * scale)), h = Math.max(1, Math.round(ih * scale));
    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) {
        if (b) resolve(b); else reject(new Error("Could not process the picture"));
      }, "image/jpeg", JPEG_QUALITY);
    });
  }

  /* mode: "fit" or "crop" = square product photo; "blog" = blog image (own shape, in the blog/ folder) */
  async function uploadPhoto(file, mode) {
    if (!/^image\//.test(file.type)) throw new Error('"' + file.name + '" is not a picture.');
    var isBlog = mode === "blog";
    var blob = isBlog ? await makeBlogBlob(file) : await makeSquareBlob(file, mode);
    var base = slug(file.name.replace(/\.[^.]+$/, "")) || "photo";
    var path = (isBlog ? "blog/" : "") + Date.now() + "-" + base + ".jpg";
    var up = await sb.storage.from(BUCKET).upload(path, blob, {
      contentType: "image/jpeg",
      cacheControl: "31536000",
      upsert: false
    });
    if (up.error) throw new Error("Upload failed: " + up.error.message);
    return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  /* ---------- images tab ---------- */
  $("#uploadKind").addEventListener("change", function () {
    if ($("#uploadKind").value === "blog") hide($("#fitWrap")); else show($("#fitWrap"));
  });

  $("#uploadInput").addEventListener("change", async function (e) {
    var files = Array.prototype.slice.call(e.target.files);
    e.target.value = "";
    if (files.length === 0) return;
    var status = $("#uploadStatus");
    var mode = $("#uploadKind").value === "blog" ? "blog" : $("#fitMode").value;
    var done = 0, failed = [];
    for (var i = 0; i < files.length; i++) {
      status.textContent = "Uploading " + (i + 1) + " of " + files.length + "...";
      try { await uploadPhoto(files[i], mode); done++; }
      catch (err) { failed.push(err.message); }
    }
    status.textContent = done + " photo" + (done === 1 ? "" : "s") + " uploaded." +
      (failed.length ? " " + failed.length + " failed." : "");
    if (failed.length) toast(failed[0], true);
    await Promise.all([loadImages(), loadBlogImages()]);
    renderImages();
  });

  function usageText(url) {
    var prods = products.filter(function (p) { return p.image_url === url; }).length;
    var blogs = posts.filter(function (p) { return p.cover_url === url || (p.content || "").indexOf(url) !== -1; }).length;
    var parts = [];
    if (prods) parts.push(prods + " product" + (prods === 1 ? "" : "s"));
    if (blogs) parts.push(blogs + " post" + (blogs === 1 ? "" : "s"));
    return { count: prods + blogs, text: parts.join(" and ") };
  }

  function renderGrid(list, grid, empty, title, label) {
    title.textContent = label + " (" + list.length + ")";
    grid.innerHTML = "";
    if (list.length === 0) { show(empty); return; }
    hide(empty);
    list.forEach(function (img) {
      var u = usageText(img.url);
      var card = document.createElement("div");
      card.className = "overflow-hidden rounded-2xl bg-white shadow-sm";
      card.innerHTML =
        '<div class="aspect-square bg-white"><img src="' + esc(img.url) + '" alt="" loading="lazy" class="h-full w-full object-contain"></div>' +
        '<div class="p-2">' +
          '<p class="truncate text-xs text-soft" title="' + esc(img.name) + '">' + esc(img.name) + "</p>" +
          '<p class="text-xs ' + (u.count ? "font-semibold text-ink" : "text-soft") + '">' + (u.count ? "Used by " + esc(u.text) : "Not used") + "</p>" +
          '<div class="mt-2 flex gap-2">' +
            '<button type="button" class="btn-ghost flex-1 !px-2 !py-1 !text-xs" data-action="copy" data-path="' + esc(img.path) + '">Copy link</button>' +
            '<button type="button" class="btn-danger flex-1 !px-2 !py-1 !text-xs" data-action="delete" data-path="' + esc(img.path) + '">Delete</button>' +
          "</div>" +
        "</div>";
      grid.appendChild(card);
    });
  }

  function renderImages() {
    renderGrid(images, $("#imageGrid"), $("#imagesEmpty"), $("#imagesTitle"), "Product photos");
    renderGrid(blogImages, $("#blogImageGrid"), $("#blogImagesEmpty"), $("#blogImagesTitle"), "Blog images");
  }

  async function onImageGridClick(e) {
    var b = e.target.closest("[data-action]");
    if (!b) return;
    var path = b.getAttribute("data-path");
    var img = images.concat(blogImages).filter(function (x) { return x.path === path; })[0];
    if (!img) return;

    if (b.getAttribute("data-action") === "copy") {
      try { await navigator.clipboard.writeText(img.url); toast("Link copied"); }
      catch (err) { prompt("Copy this link:", img.url); }
      return;
    }

    var u = usageText(img.url);
    var msg = u.count
      ? "This image is used by " + u.text + ". If you delete it, it will disappear from " +
        (u.count === 1 ? "it" : "them") + " until you choose a new one.\n\nDelete anyway?"
      : "Delete this image? This cannot be undone.";
    if (!confirm(msg)) return;

    var r = await sb.storage.from(BUCKET).remove([path]);
    if (r.error) { toast("Could not delete: " + r.error.message, true); return; }
    toast("Image deleted");
    await Promise.all([loadImages(), loadBlogImages()]);
    renderImages();
  }
  $("#imageGrid").addEventListener("click", onImageGridClick);
  $("#blogImageGrid").addEventListener("click", onImageGridClick);

  /* ---------- picker ---------- */
  /* kind "blog": blog images first, then product photos. Otherwise product photos only. */
  function openPicker(cb, kind) {
    pickerCallback = cb;
    var grid = $("#pickerGrid");
    grid.innerHTML = "";
    var groups = kind === "blog"
      ? [["Blog images", blogImages], ["Product photos", images]]
      : [["", images]];
    var total = 0;
    groups.forEach(function (g) {
      if (!g[1].length) return;
      total += g[1].length;
      if (g[0]) {
        var h = document.createElement("p");
        h.className = "col-span-full mt-2 text-sm font-bold";
        h.textContent = g[0];
        grid.appendChild(h);
      }
      g[1].forEach(function (img) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "aspect-square overflow-hidden rounded-xl border-2 border-line bg-white hover:border-cta focus:border-cta focus:outline-none";
        b.innerHTML = '<img src="' + esc(img.url) + '" alt="' + esc(img.name) + '" loading="lazy" class="h-full w-full object-contain">';
        b.addEventListener("click", function () {
          closeModal("pickerModal");
          if (pickerCallback) pickerCallback(img.url);
        });
        grid.appendChild(b);
      });
    });
    if (total === 0) show($("#pickerEmpty")); else hide($("#pickerEmpty"));
    openModal("pickerModal");
  }

  /* ---------- blog ---------- */
  var BLOG_SQL_NOTE = "<strong>The blog needs a one-time setup.</strong> In Supabase, open <em>SQL Editor</em>, paste the contents of <code>supabase-blog.sql</code>, and click <em>Run</em>. Then reload this page.";

  function postStatus(p) {
    if (!p.published) return { label: "Draft", cls: "bg-line text-ink" };
    if (p.published_at && new Date(p.published_at) > new Date()) return { label: "Scheduled", cls: "bg-sun text-ink" };
    return { label: "Published", cls: "bg-ink text-white" };
  }

  function renderBlog() {
    var notice = $("#blogNotice");
    var list = $("#postList");
    list.innerHTML = "";
    hide($("#postsEmpty"));
    $("#blogTitle").textContent = blogReady ? "Blog posts (" + posts.length + ")" : "Blog posts";
    if (!blogReady) {
      notice.innerHTML = BLOG_SQL_NOTE;
      show(notice);
      $("#addPost").disabled = true;
      return;
    }
    hide(notice);
    $("#addPost").disabled = false;
    if (posts.length === 0) { show($("#postsEmpty")); return; }

    posts.forEach(function (p) {
      var st = postStatus(p);
      var date = p.published_at ? new Date(p.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "No date";
      var thumb = p.cover_url
        ? '<img src="' + esc(p.cover_url) + '" alt="" class="h-full w-full object-cover">'
        : '<span class="text-2xl">📝</span>';
      var row = document.createElement("div");
      row.className = "flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm";
      row.innerHTML =
        '<div class="flex h-16 w-24 flex-none items-center justify-center overflow-hidden rounded-lg border border-line bg-mint">' + thumb + "</div>" +
        '<div class="min-w-0 flex-1">' +
          '<p class="truncate font-semibold">' + esc(p.title) + "</p>" +
          '<p class="truncate text-sm text-soft">' + esc(p.category || "No category") + " &middot; " + esc(date) + " &middot; " + (p.reading_minutes || 1) + " min</p>" +
          '<span class="mt-1 inline-block rounded px-2 py-0.5 text-xs font-bold ' + st.cls + '">' + st.label + "</span>" +
        "</div>" +
        '<div class="flex flex-none flex-col gap-2 sm:flex-row">' +
          '<button type="button" class="btn-ghost" data-post-action="edit" data-id="' + esc(p.id) + '">Edit</button>' +
          (p.published ? '<a class="btn-ghost" target="_blank" rel="noopener" href="../post.html?slug=' + encodeURIComponent(p.slug) + '">View</a>' : "") +
          '<button type="button" class="btn-danger" data-post-action="delete" data-id="' + esc(p.id) + '">Delete</button>' +
        "</div>";
      list.appendChild(row);
    });
  }

  $("#postList").addEventListener("click", function (e) {
    var b = e.target.closest("[data-post-action]");
    if (!b) return;
    var p = posts.filter(function (x) { return x.id === b.getAttribute("data-id"); })[0];
    if (!p) return;
    if (b.getAttribute("data-post-action") === "edit") openPostForm(p); else deletePost(p);
  });

  async function deletePost(p) {
    if (!confirm('Delete the post "' + p.title + '"? This cannot be undone.\n\n(Its images stay in your library.)')) return;
    var r = await sb.from("posts").delete().eq("id", p.id);
    if (r.error) { toast("Could not delete: " + r.error.message, true); return; }
    toast("Post deleted");
    await loadPosts();
    renderBlog();
    renderImages();
  }

  /* ----- post editor ----- */
  var editor = $("#postEditor");
  var postDirty = false;
  var slugTouched = false;
  var savedRange = null;

  function postSlug(str) {
    return String(str).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  }
  function toLocalInput(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return "";
    var pad = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function countWords(html) {
    var tmp = document.createElement("div");
    tmp.innerHTML = html;
    var text = (tmp.textContent || "").trim();
    return text ? text.split(/\s+/).length : 0;
  }
  function updateWordCount() {
    var w = countWords(editor.innerHTML);
    $("#poWords").textContent = w;
    $("#poMinutes").textContent = Math.max(1, Math.ceil(w / 200));
  }
  function markDirty() { postDirty = true; }

  function setCover(url) {
    $("#poCover").value = url || "";
    var box = $("#poPreview");
    if (url) {
      box.innerHTML = '<img src="' + esc(url) + '" alt="Cover image" class="h-full w-full object-cover">';
      show($("#poRemoveCover"));
    } else {
      box.textContent = "📝";
      hide($("#poRemoveCover"));
    }
  }

  function setPreviewMode(on) {
    if (on) {
      $("#postPreviewBox").innerHTML = window.MPSanitize.clean(editor.innerHTML) || '<p class="text-soft">Nothing to preview yet.</p>';
      hide(editor); hide($("#postToolbar")); show($("#postPreviewBox"));
      $("#poPreviewToggle").textContent = "Back to editing";
    } else {
      show(editor); show($("#postToolbar")); hide($("#postPreviewBox"));
      $("#poPreviewToggle").textContent = "Preview";
    }
  }

  function openPostForm(p) {
    var isNew = !p;
    $("#postModalTitle").textContent = isNew ? "New post" : "Edit post";
    $("#poId").value = isNew ? "" : p.id;
    $("#poTitle").value = isNew ? "" : p.title;
    $("#poSlug").value = isNew ? "" : p.slug;
    slugTouched = !isNew;
    $("#poCategory").value = isNew ? "" : (p.category || "");
    $("#poExcerpt").value = isNew ? "" : (p.excerpt || "");
    $("#poExcerptCount").textContent = $("#poExcerpt").value.length;
    editor.innerHTML = isNew ? "" : window.MPSanitize.clean(p.content || "");
    document.querySelector('input[name="poStatus"][value="' + (!isNew && p.published ? "published" : "draft") + '"]').checked = true;
    $("#poDate").value = isNew ? "" : toLocalInput(p.published_at);
    $("#poUploadStatus").textContent = "";
    setCover(isNew ? "" : p.cover_url);
    setPreviewMode(false);
    updateWordCount();

    var live = $("#poLive");
    var link = $("#poViewLink");
    if (!isNew && p.published) {
      link.href = "../post.html?slug=" + encodeURIComponent(p.slug);
      show(link);
    } else { hide(link); }
    hide(live);

    postDirty = false;
    openModal("postModal");
    $("#poTitle").focus();
  }

  function requestClosePost() {
    if (postDirty && !confirm("Close without saving your changes?")) return;
    closeModal("postModal");
    postDirty = false;
  }

  $("#addPost").addEventListener("click", function () { openPostForm(null); });
  $("#postClose").addEventListener("click", requestClosePost);
  $("#postCancel").addEventListener("click", requestClosePost);

  $("#poTitle").addEventListener("input", function () {
    if (!slugTouched) $("#poSlug").value = postSlug($("#poTitle").value);
    markDirty();
  });
  $("#poSlug").addEventListener("input", function () { slugTouched = true; markDirty(); });
  $("#poSlug").addEventListener("blur", function () { $("#poSlug").value = postSlug($("#poSlug").value); });
  ["#poCategory", "#poDate"].forEach(function (sel) { $(sel).addEventListener("input", markDirty); });
  Array.prototype.forEach.call(document.querySelectorAll('input[name="poStatus"]'), function (r) { r.addEventListener("change", markDirty); });
  $("#poExcerpt").addEventListener("input", function () {
    $("#poExcerptCount").textContent = $("#poExcerpt").value.length;
    markDirty();
  });
  $("#poRemoveCover").addEventListener("click", function () { setCover(""); markDirty(); });
  $("#poPick").addEventListener("click", function () { openPicker(function (url) { setCover(url); markDirty(); }, "blog"); });
  $("#poPreviewToggle").addEventListener("click", function () {
    setPreviewMode(editor.classList.contains("hidden") ? false : true);
  });

  $("#poFile").addEventListener("change", async function (e) {
    var file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    $("#poUploadStatus").textContent = "Uploading...";
    try {
      var url = await uploadPhoto(file, "blog");
      setCover(url);
      markDirty();
      $("#poUploadStatus").textContent = "Image uploaded.";
      await loadBlogImages();
      renderImages();
    } catch (err) {
      $("#poUploadStatus").textContent = "";
      toast(err.message || "Upload failed", true);
    }
  });

  /* Toolbar. mousedown is cancelled so the text selection is not lost. */
  document.addEventListener("selectionchange", function () {
    var sel = window.getSelection();
    if (sel.rangeCount && editor.contains(sel.anchorNode)) savedRange = sel.getRangeAt(0).cloneRange();
  });
  function restoreSelection() {
    editor.focus();
    if (savedRange) {
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
    }
  }
  function exec(cmd, val) {
    restoreSelection();
    try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch (e) {}
    document.execCommand(cmd, false, val || null);
    markDirty();
    updateWordCount();
  }
  $("#postToolbar").addEventListener("mousedown", function (e) {
    if (e.target.closest("button")) e.preventDefault();
  });
  $("#postToolbar").addEventListener("click", function (e) {
    var b = e.target.closest("[data-cmd]");
    if (b) exec(b.getAttribute("data-cmd"));
  });
  $("#tbBlock").addEventListener("change", function () {
    exec("formatBlock", "<" + $("#tbBlock").value + ">");
    $("#tbBlock").value = "p";
    editor.focus();
  });
  $("#tbLink").addEventListener("click", function () {
    var url = prompt("Paste the link (for example your Jumia affiliate link):", "https://");
    if (!url || url === "https://") return;
    if (!/^(https?:\/\/|mailto:|tel:)/i.test(url)) url = "https://" + url;
    var sel = window.getSelection();
    if (!savedRange || savedRange.collapsed) {
      var label = prompt("Link text (what readers will see):", "Check it out");
      if (!label) return;
      var a = document.createElement("a");
      a.href = url;
      a.textContent = label;
      exec("insertHTML", a.outerHTML);
    } else {
      exec("createLink", url);
    }
  });
  $("#tbImage").addEventListener("click", function () {
    openPicker(function (url) {
      var alt = prompt("Describe the picture in a few words (helps people who cannot see it, and Google):", "") || "";
      var img = document.createElement("img");
      img.src = url;
      img.alt = alt;
      exec("insertHTML", img.outerHTML);
    }, "blog");
  });

  editor.addEventListener("focus", function () {
    try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch (e) {}
  });
  editor.addEventListener("input", function () { markDirty(); updateWordCount(); });
  editor.addEventListener("paste", function (e) {
    e.preventDefault();
    var cd = e.clipboardData || window.clipboardData;
    var html = cd.getData("text/html");
    var text = cd.getData("text/plain");
    if (html) {
      document.execCommand("insertHTML", false, window.MPSanitize.clean(html));
    } else {
      var esc2 = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      var paras = esc2.split(/\n{2,}/).map(function (t) { return "<p>" + t.replace(/\n/g, "<br>") + "</p>"; }).join("");
      document.execCommand("insertHTML", false, paras);
    }
  });

  $("#postForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var title = $("#poTitle").value.trim();
    if (!title) { toast("Please enter a title", true); return; }
    var content = window.MPSanitize.clean(editor.innerHTML);
    var published = document.querySelector('input[name="poStatus"]:checked').value === "published";
    if (published && !content) { toast("Please write something before publishing", true); return; }

    var slugVal = postSlug($("#poSlug").value || title) || ("post-" + Date.now());
    $("#poSlug").value = slugVal;

    var dateVal = $("#poDate").value ? new Date($("#poDate").value) : null;
    if (dateVal && isNaN(dateVal)) dateVal = null;
    if (published && !dateVal) dateVal = new Date();

    var payload = {
      title: title,
      slug: slugVal,
      excerpt: $("#poExcerpt").value.trim(),
      content: content,
      cover_url: $("#poCover").value,
      category: $("#poCategory").value.trim(),
      reading_minutes: Math.max(1, Math.ceil(countWords(content) / 200)),
      published: published,
      published_at: dateVal ? dateVal.toISOString() : null,
      updated_at: new Date().toISOString()
    };
    var id = $("#poId").value;

    var save = $("#poSave");
    save.disabled = true;
    save.textContent = "Saving...";
    try {
      var r = id
        ? await sb.from("posts").update(payload).eq("id", id)
        : await sb.from("posts").insert(payload).select().single();
      if (r.error) {
        if (r.error.code === "23505" || /duplicate|unique/i.test(r.error.message || "")) {
          throw new Error("That web address is already used by another post. Please change it.");
        }
        throw r.error;
      }
      postDirty = false;
      closeModal("postModal");
      toast(published ? "Post saved and published" : "Draft saved");
      await loadPosts();
      renderBlog();
      renderImages();
    } catch (err) {
      toast("Could not save: " + (err.message || err), true);
    } finally {
      save.disabled = false;
      save.textContent = "Save post";
    }
  });

  /* ---------- insights ---------- */
  async function loadInsights() {
    var days = parseInt($("#insDays").value, 10) || 30;
    var notice = $("#insNotice");
    hide(notice);
    $("#insTable").innerHTML = "";
    $("#insSummary").innerHTML = "";
    hide($("#insClear"));

    var r = await sb.rpc("click_summary", { days: days });
    if (r.error) {
      notice.innerHTML = "<strong>Insights need a one-time upgrade.</strong> In Supabase, open <em>SQL Editor</em>, paste the contents of <code>supabase-upgrade.sql</code>, and click <em>Run</em>. Then press Refresh here.";
      show(notice);
      return;
    }
    show($("#insClear"));

    var byId = {};
    (r.data || []).forEach(function (row) { byId[row.product_id] = row; });
    var rows = products.map(function (p) {
      var e = byId[String(p.id)] || {};
      return { name: p.name, clicks: Number(e.clicks) || 0, shares: Number(e.shares) || 0, last: e.last_click, hearts: heartsText(p.id).shown };
    });
    rows.sort(function (a, b) { return (b.clicks - a.clicks) || (b.shares - a.shares) || (b.hearts - a.hearts); });

    var totalClicks = rows.reduce(function (n, x) { return n + x.clicks; }, 0);
    var totalShares = rows.reduce(function (n, x) { return n + x.shares; }, 0);
    var top = rows[0] && rows[0].clicks > 0 ? rows[0].name : "-";
    function card(label, value) {
      return '<div class="rounded-2xl bg-white p-4 shadow-sm"><p class="text-xs font-semibold text-soft">' + esc(label) + '</p><p class="mt-1 truncate text-xl font-extrabold">' + esc(value) + "</p></div>";
    }
    $("#insSummary").innerHTML = card("Clicks to Jumia", totalClicks) + card("WhatsApp shares", totalShares) + card("Products", products.length) + card("Top product", top);

    if (!rows.length) { $("#insTable").innerHTML = '<p class="p-6 text-center text-soft">Add some products first.</p>'; return; }
    var body = rows.map(function (x) {
      var last = x.last ? new Date(x.last).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "-";
      return '<tr class="border-t border-line"><td class="px-4 py-3 font-semibold">' + esc(x.name) + '</td><td class="px-4 py-3 text-right">' + x.clicks +
        '</td><td class="px-4 py-3 text-right">' + x.shares + '</td><td class="px-4 py-3 text-right">' + x.hearts + '</td><td class="px-4 py-3 text-right text-soft">' + esc(last) + "</td></tr>";
    }).join("");
    $("#insTable").innerHTML = '<table class="w-full text-sm"><thead class="text-left text-xs text-soft"><tr><th class="px-4 py-3">Product</th><th class="px-4 py-3 text-right">Clicks</th><th class="px-4 py-3 text-right">Shares</th><th class="px-4 py-3 text-right">Hearts</th><th class="px-4 py-3 text-right">Last click</th></tr></thead><tbody>' + body + "</tbody></table>";
  }

  $("#insRefresh").addEventListener("click", loadInsights);
  $("#insDays").addEventListener("change", loadInsights);
  $("#insClear").addEventListener("click", async function () {
    if (!confirm("Delete ALL recorded click and share data? This cannot be undone.")) return;
    var r = await sb.from("click_events").delete().neq("product_id", "");
    if (r.error) { toast("Could not clear: " + r.error.message, true); return; }
    toast("Click data cleared");
    loadInsights();
  });

  /* ---------- start ---------- */
  (async function init() {
    var r = await sb.auth.getSession();
    if (r.data && r.data.session) await enter(r.data.session);
    else showLogin();
  })();
})();
