/* Blog content cleaner.
   Used by the dashboard when saving a post AND by the public post page when showing it,
   so only a short list of safe formatting can ever appear on the site. */
(function () {
  "use strict";

  var ALLOWED = { P: 1, H2: 1, H3: 1, H4: 1, STRONG: 1, EM: 1, UL: 1, OL: 1, LI: 1, A: 1, IMG: 1,
                  BLOCKQUOTE: 1, BR: 1, HR: 1, FIGURE: 1, FIGCAPTION: 1 };
  var RENAME = { B: "STRONG", I: "EM", H1: "H2", H5: "H4", H6: "H4" };
  var DROP = { SCRIPT: 1, STYLE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, LINK: 1, META: 1, TEMPLATE: 1, NOSCRIPT: 1,
               SVG: 1, MATH: 1, FORM: 1, INPUT: 1, BUTTON: 1, TEXTAREA: 1, SELECT: 1, VIDEO: 1, AUDIO: 1,
               CANVAS: 1, BASE: 1, TITLE: 1, HEAD: 1, FRAME: 1, FRAMESET: 1, APPLET: 1 };
  var BLOCKS = { P: 1, H2: 1, H3: 1, H4: 1, UL: 1, OL: 1, BLOCKQUOTE: 1, HR: 1, FIGURE: 1 };

  function safeUrl(u, allowMail) {
    u = String(u || "").trim();
    if (!u) return "";
    try {
      var parsed = new URL(u, "https://example.com/");
      var ok = parsed.protocol === "http:" || parsed.protocol === "https:" ||
               (allowMail && (parsed.protocol === "mailto:" || parsed.protocol === "tel:"));
      return ok ? u : "";
    } catch (e) { return ""; }
  }

  function copyChildren(src, dest, doc) {
    Array.prototype.forEach.call(src.childNodes, function (node) {
      if (node.nodeType === 3) { dest.appendChild(doc.createTextNode(node.nodeValue)); return; }
      if (node.nodeType !== 1) return;
      var tag = node.tagName.toUpperCase();
      if (DROP[tag]) return;
      tag = RENAME[tag] || tag;

      if (!ALLOWED[tag]) { copyChildren(node, dest, doc); return; }   // unknown tag: keep its text only

      if (tag === "A") {
        var href = safeUrl(node.getAttribute("href"), true);
        if (!href) { copyChildren(node, dest, doc); return; }
        var a = doc.createElement("a");
        a.setAttribute("href", href);
        if (/^https?:/i.test(href)) {
          var host = "";
          try { host = new URL(href).hostname; } catch (e) {}
          a.setAttribute("target", "_blank");
          a.setAttribute("rel", (/jumia/i.test(host) ? "sponsored " : "") + "noopener noreferrer");
        }
        copyChildren(node, a, doc);
        if (a.textContent.trim() || a.querySelector("img")) dest.appendChild(a);
        return;
      }

      if (tag === "IMG") {
        var src = safeUrl(node.getAttribute("src"), false);
        if (!src) return;
        var img = doc.createElement("img");
        img.setAttribute("src", src);
        img.setAttribute("alt", (node.getAttribute("alt") || "").slice(0, 200));
        img.setAttribute("loading", "lazy");
        dest.appendChild(img);
        return;
      }

      var el = doc.createElement(tag.toLowerCase());
      if (tag !== "BR" && tag !== "HR") copyChildren(node, el, doc);
      dest.appendChild(el);
    });
  }

  function clean(html) {
    var parsed = new DOMParser().parseFromString("<body>" + String(html || "") + "</body>", "text/html");
    var doc = document;
    var box = doc.createElement("div");
    copyChildren(parsed.body, box, doc);

    // Put loose text and inline pieces at the top level into paragraphs.
    var out = doc.createElement("div");
    var para = null;
    Array.prototype.slice.call(box.childNodes).forEach(function (n) {
      var isBlock = n.nodeType === 1 && BLOCKS[n.tagName.toUpperCase()];
      if (isBlock) { para = null; out.appendChild(n); return; }
      if (n.nodeType === 3 && !n.nodeValue.trim() && !para) return;
      if (!para) { para = doc.createElement("p"); out.appendChild(para); }
      para.appendChild(n);
    });

    // Remove empty paragraphs and list items.
    Array.prototype.slice.call(out.querySelectorAll("p, li, blockquote, h2, h3, h4")).forEach(function (el) {
      if (!el.textContent.trim() && !el.querySelector("img, hr")) el.remove();
    });
    return out.innerHTML;
  }

  window.MPSanitize = { clean: clean };
})();
