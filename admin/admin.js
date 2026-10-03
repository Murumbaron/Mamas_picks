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

  var sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);

  /* ---------- state ---------- */
  var products = [];
  var images = [];          // {name, url, created}
  var counts = {};          // product id -> {clicks, adjust}
  var pickerCallback = null;

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
    if (e.key === "Escape") { closeModal("pickerModal"); if ($("#pickerModal").classList.contains("hidden")) closeModal("productModal"); }
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
    var isProducts = which === "products";
    $("#tabProducts").setAttribute("aria-selected", String(isProducts));
    $("#tabImages").setAttribute("aria-selected", String(!isProducts));
    if (isProducts) { show($("#panelProducts")); hide($("#panelImages")); }
    else { hide($("#panelProducts")); show($("#panelImages")); }
  }
  $("#tabProducts").addEventListener("click", function () { selectTab("products"); });
  $("#tabImages").addEventListener("click", function () { selectTab("images"); });

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

  async function loadImages() {
    var r = await sb.storage.from(BUCKET).list("", {
      limit: 500,
      sortBy: { column: "created_at", order: "desc" }
    });
    if (r.error) { toast("Could not load photos: " + r.error.message, true); return; }
    images = (r.data || [])
      .filter(function (o) { return o.name && o.name.charAt(0) !== "."; })
      .map(function (o) {
        return {
          name: o.name,
          url: sb.storage.from(BUCKET).getPublicUrl(o.name).data.publicUrl,
          created: o.created_at
        };
      });
  }

  async function refreshAll() {
    await Promise.all([loadProducts(), loadImages(), loadCounts()]);
    renderProducts();
    renderImages();
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
        '<div class="flex flex-none flex-col gap-2 sm:flex-row">' +
          '<button type="button" class="btn-ghost" data-action="edit" data-id="' + esc(p.id) + '">Edit</button>' +
          '<button type="button" class="btn-danger" data-action="delete" data-id="' + esc(p.id) + '">Delete</button>' +
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
    if (b.getAttribute("data-action") === "edit") openProductForm(p);
    else deleteProduct(p);
  });

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

  function openProductForm(p) {
    fillCategoryList();
    var isNew = !p;
    $("#productModalTitle").textContent = isNew ? "Add product" : "Edit product";
    $("#pfId").value = isNew ? "" : p.id;
    $("#pfName").value = isNew ? "" : p.name;
    $("#pfDesc").value = isNew ? "" : (p.description || "");
    $("#pfCategory").value = isNew ? "" : (p.category || "");
    $("#pfPrice").value = isNew ? "" : (p.price || "");
    $("#pfLink").value = isNew ? (C.DEFAULT_LINK || "") : (p.link || "");
    $("#pfSort").value = isNew ? 0 : (p.sort_order || 0);
    $("#pfTrending").checked = isNew ? false : !!p.trending;
    $("#pfPublished").checked = isNew ? true : !!p.published;
    $("#pfCrop").checked = false;
    $("#pfUploadStatus").textContent = "";

    var h = isNew ? { clicks: 0, adjust: 0, shown: 0 } : heartsText(p.id);
    $("#pfAdjust").value = h.adjust;
    $("#pfHearts").textContent = "Real taps so far: " + h.clicks + ". Shown on the site = real taps + this number.";

    setFormImage(isNew ? "" : p.image_url);
    openModal("productModal");
    $("#pfName").focus();
  }

  $("#addProduct").addEventListener("click", function () { openProductForm(null); });
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

  async function uploadPhoto(file, mode) {
    if (!/^image\//.test(file.type)) throw new Error('"' + file.name + '" is not a picture.');
    var blob = await makeSquareBlob(file, mode);
    var base = slug(file.name.replace(/\.[^.]+$/, "")) || "photo";
    var name = Date.now() + "-" + base + ".jpg";
    var up = await sb.storage.from(BUCKET).upload(name, blob, {
      contentType: "image/jpeg",
      cacheControl: "31536000",
      upsert: false
    });
    if (up.error) throw new Error("Upload failed: " + up.error.message);
    return sb.storage.from(BUCKET).getPublicUrl(name).data.publicUrl;
  }

  /* ---------- images tab ---------- */
  $("#uploadInput").addEventListener("change", async function (e) {
    var files = Array.prototype.slice.call(e.target.files);
    e.target.value = "";
    if (files.length === 0) return;
    var status = $("#uploadStatus");
    var mode = $("#fitMode").value;
    var done = 0, failed = [];
    for (var i = 0; i < files.length; i++) {
      status.textContent = "Uploading " + (i + 1) + " of " + files.length + "...";
      try { await uploadPhoto(files[i], mode); done++; }
      catch (err) { failed.push(err.message); }
    }
    status.textContent = done + " photo" + (done === 1 ? "" : "s") + " uploaded." +
      (failed.length ? " " + failed.length + " failed." : "");
    if (failed.length) toast(failed[0], true);
    await loadImages();
    renderImages();
  });

  function usageCount(url) {
    return products.filter(function (p) { return p.image_url === url; }).length;
  }

  function renderImages() {
    $("#imagesTitle").textContent = "Photo library (" + images.length + ")";
    var grid = $("#imageGrid");
    grid.innerHTML = "";
    if (images.length === 0) { show($("#imagesEmpty")); return; }
    hide($("#imagesEmpty"));

    images.forEach(function (img) {
      var used = usageCount(img.url);
      var card = document.createElement("div");
      card.className = "overflow-hidden rounded-2xl bg-white shadow-sm";
      card.innerHTML =
        '<div class="aspect-square bg-white"><img src="' + esc(img.url) + '" alt="" loading="lazy" class="h-full w-full object-contain"></div>' +
        '<div class="p-2">' +
          '<p class="truncate text-xs text-soft" title="' + esc(img.name) + '">' + esc(img.name) + "</p>" +
          '<p class="text-xs ' + (used ? "font-semibold text-ink" : "text-soft") + '">' + (used ? "Used by " + used + " product" + (used === 1 ? "" : "s") : "Not used") + "</p>" +
          '<div class="mt-2 flex gap-2">' +
            '<button type="button" class="btn-ghost flex-1 !px-2 !py-1 !text-xs" data-action="copy" data-name="' + esc(img.name) + '">Copy link</button>' +
            '<button type="button" class="btn-danger flex-1 !px-2 !py-1 !text-xs" data-action="delete" data-name="' + esc(img.name) + '">Delete</button>' +
          "</div>" +
        "</div>";
      grid.appendChild(card);
    });
  }

  $("#imageGrid").addEventListener("click", async function (e) {
    var b = e.target.closest("[data-action]");
    if (!b) return;
    var name = b.getAttribute("data-name");
    var img = images.filter(function (x) { return x.name === name; })[0];
    if (!img) return;

    if (b.getAttribute("data-action") === "copy") {
      try { await navigator.clipboard.writeText(img.url); toast("Link copied"); }
      catch (err) { prompt("Copy this link:", img.url); }
      return;
    }

    var used = usageCount(img.url);
    var msg = used
      ? "This photo is used by " + used + " product" + (used === 1 ? "" : "s") + ". If you delete it, " +
        (used === 1 ? "that product" : "those products") + " will show an emoji instead until you choose a new photo.\n\nDelete anyway?"
      : "Delete this photo? This cannot be undone.";
    if (!confirm(msg)) return;

    var r = await sb.storage.from(BUCKET).remove([name]);
    if (r.error) { toast("Could not delete: " + r.error.message, true); return; }
    toast("Photo deleted");
    await loadImages();
    renderImages();
  });

  /* ---------- picker ---------- */
  function openPicker(cb) {
    pickerCallback = cb;
    var grid = $("#pickerGrid");
    grid.innerHTML = "";
    if (images.length === 0) { show($("#pickerEmpty")); }
    else {
      hide($("#pickerEmpty"));
      images.forEach(function (img) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "aspect-square overflow-hidden rounded-xl border-2 border-line bg-white hover:border-cta focus:border-cta focus:outline-none";
        b.innerHTML = '<img src="' + esc(img.url) + '" alt="' + esc(img.name) + '" loading="lazy" class="h-full w-full object-contain">';
        b.addEventListener("click", function () {
          if (pickerCallback) pickerCallback(img.url);
          closeModal("pickerModal");
        });
        grid.appendChild(b);
      });
    }
    openModal("pickerModal");
  }

  /* ---------- start ---------- */
  (async function init() {
    var r = await sb.auth.getSession();
    if (r.data && r.data.session) await enter(r.data.session);
    else showLogin();
  })();
})();
