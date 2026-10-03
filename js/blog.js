/* Blog list page: loads published posts, filters by category, "load more". */
(function () {
  "use strict";

  var MP = window.MP, t = MP.t, esc = MP.esc;
  var PAGE = 9;
  var $grid = document.getElementById("blogGrid");
  var $cats = document.getElementById("blogCats");
  var $status = document.getElementById("blogStatus");
  var $more = document.getElementById("blogMore");

  var category = new URLSearchParams(location.search).get("cat") || "";
  var offset = 0;
  var categories = [];

  $more.textContent = t("Load more");

  function setStatus(msg) { $status.textContent = msg || ""; $status.hidden = !msg; }

  function buildCats() {
    var items = [{ v: "", label: t("All") }].concat(categories.map(function (c) { return { v: c, label: c }; }));
    $cats.innerHTML = "";
    items.forEach(function (it) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = it.label;
      b.setAttribute("aria-pressed", String(it.v === category));
      b.addEventListener("click", function () {
        category = it.v;
        try {
          var u = new URL(location.href);
          if (category) u.searchParams.set("cat", category); else u.searchParams.delete("cat");
          history.replaceState(null, "", u.toString());
        } catch (e) {}
        buildCats();
        load(true);
      });
      $cats.appendChild(b);
    });
    $cats.hidden = categories.length === 0;
  }

  function load(reset) {
    if (reset) { offset = 0; $grid.innerHTML = ""; }
    setStatus(t("Loading posts..."));
    $more.hidden = true;
    return MP.fetchPosts({ category: category, limit: PAGE, offset: offset }).then(function (rows) {
      if (rows === null) { setStatus(t("No posts yet. Please check back soon.")); return; }
      $grid.insertAdjacentHTML("beforeend", rows.map(MP.postCard).join(""));
      offset += rows.length;
      $more.hidden = rows.length < PAGE;
      setStatus($grid.children.length === 0 ? t("No posts yet. Please check back soon.") : "");
    });
  }

  // First, learn which categories exist (titles only, so it stays light).
  MP.fetchPosts({}).then(function (rows) {
    var seen = {};
    (rows || []).forEach(function (p) { if (p.category) seen[p.category] = 1; });
    categories = Object.keys(seen).sort();
    if (category && categories.indexOf(category) === -1) category = "";
    buildCats();
    return load(true);
  });

  $more.addEventListener("click", function () { load(false); });
})();
