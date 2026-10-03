/* Single post page: post.html?slug=my-post-title */
(function () {
  "use strict";

  var MP = window.MP, t = MP.t, esc = MP.esc;
  var slug = new URLSearchParams(location.search).get("slug") || "";
  var $ = function (id) { return document.getElementById(id); };
  var h1 = document.querySelector(".page-hero h1");

  function notFound() {
    document.title = "Post not found | " + (window.SITE || {}).SITE_NAME;
    h1.textContent = "We could not find that post";
    $("postMeta").textContent = "";
    $("crumbTitle").textContent = "Not found";
    $("postBody").innerHTML = '<p>The post may have moved or may not be published yet. <a href="blog.html">See all posts</a>.</p>';
  }

  function setMeta(name, content, isProp) {
    var sel = isProp ? 'meta[property="' + name + '"]' : 'meta[name="' + name + '"]';
    var m = document.querySelector(sel);
    if (!m) { m = document.createElement("meta"); m.setAttribute(isProp ? "property" : "name", name); document.head.appendChild(m); }
    m.setAttribute("content", content);
  }

  if (!slug) { notFound(); return; }

  MP.fetchPosts({ slug: slug, full: true, limit: 1 }).then(function (rows) {
    var p = rows && rows[0];
    if (!p) { notFound(); return; }

    var siteName = (window.SITE || {}).SITE_NAME || "";
    document.title = p.title + " | " + siteName;
    var desc = p.excerpt || "";
    setMeta("description", desc);
    setMeta("og:title", p.title, true);
    setMeta("og:description", desc, true);
    if (p.cover_url) setMeta("og:image", p.cover_url, true);

    h1.textContent = p.title;
    $("crumbTitle").textContent = p.title;
    $("postMeta").innerHTML = (p.category ? '<span class="tag" style="display:inline-block;margin-right:8px;font-size:12px;font-weight:700;background:var(--highlight);color:var(--ink);padding:3px 10px;border-radius:6px">' + esc(p.category) + "</span>" : "") +
      esc(MP.fmtDate(p.published_at)) + (p.reading_minutes ? " &middot; " + p.reading_minutes + " " + esc(t("min read")) : "");

    if (p.cover_url) { var c = $("postCover"); c.src = p.cover_url; c.alt = p.title; c.hidden = false; }

    $("postBody").innerHTML = window.MPSanitize.clean(p.content);

    var url = location.origin + location.pathname + "?slug=" + encodeURIComponent(p.slug);
    $("shareWa").href = "https://wa.me/?text=" + encodeURIComponent(p.title + " - " + url);
    $("shareWa").addEventListener("click", function () { MP.track("share_post", { post: p.title }); });
    var copy = $("shareCopy");
    copy.textContent = t("Copy link");
    copy.addEventListener("click", function () {
      var done = function () { copy.textContent = t("Link copied"); setTimeout(function () { copy.textContent = t("Copy link"); }, 2000); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt("Copy this link:", url); });
      else prompt("Copy this link:", url);
    });
    document.querySelector("#postShare strong").textContent = t("Share this post");
    ["postShare", "postNote", "postCta"].forEach(function (id) { $(id).hidden = false; });
    document.querySelector("#morePosts h2").textContent = t("More to read");

    // Structured data so search engines understand the post.
    var ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, description: desc,
      image: p.cover_url || undefined, datePublished: p.published_at, dateModified: p.updated_at || p.published_at,
      author: { "@type": "Organization", name: siteName }, publisher: { "@type": "Organization", name: siteName }
    });
    document.head.appendChild(ld);
    MP.track("view_post", { post: p.title });

    // More to read: same category first, then the latest.
    MP.fetchPosts({ limit: 8 }).then(function (all) {
      var others = (all || []).filter(function (x) { return x.slug !== p.slug; });
      others.sort(function (a, b) { return (b.category === p.category) - (a.category === p.category); });
      others = others.slice(0, 3);
      if (!others.length) return;
      $("moreGrid").innerHTML = others.map(MP.postCard).join("");
      $("morePosts").hidden = false;
    });
  });
})();
