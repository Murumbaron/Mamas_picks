/* Hospital bag checklist: renders the list, saves ticks on this device, prints. */
(function () {
  "use strict";

  var SECTIONS = [
    { id: "docs", title: "Documents and money", link: null, items: [
      "ID card or passport",
      "Mother and Child Health booklet (your antenatal card) and clinic notes",
      "Health insurance or SHA details",
      "Hospital booking or registration papers",
      "Your birth plan, if you have one",
      "Some cash, and M-Pesa on your phone"
    ]},
    { id: "mum", title: "For mum", link: ["Shop picks for mum", "index.html?cat=mum"], items: [
      "Loose, comfortable clothes or a front-opening nightdress",
      "Two or three kangas (or lesos)",
      "Maternity pads (the heavy kind)",
      "Comfortable cotton underwear",
      "Nursing bras (one or two) and breast pads",
      "Slippers or sandals, and warm socks",
      "Toiletries: toothbrush, toothpaste, soap, lip balm",
      "A towel",
      "An outfit to wear home",
      "Water bottle and snacks",
      "Phone, long charger or power bank",
      "Hair ties or a headscarf"
    ]},
    { id: "baby", title: "For baby", link: ["Shop picks for newborns", "index.html?cat=newborn"], items: [
      "Going-home outfit (and a spare)",
      "2 or 3 bodysuits (vests) and sleepsuits",
      "Hat, socks and mittens",
      "2 or 3 soft receiving blankets or swaddles",
      "A warm shawl or blanket for going home",
      "A small pack of newborn nappies",
      "Baby wipes or cotton wool",
      "A safe plan for travelling home (a car seat if you have a car)"
    ]},
    { id: "partner", title: "For your birth partner", link: null, items: [
      "Snacks and water",
      "Phone charger",
      "A change of clothes",
      "A written list of important phone numbers"
    ]}
  ];

  var KEY = "mp_bag_v1";
  var done = {};
  try { done = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}

  var $lists = document.getElementById("bagLists");
  var $fill = document.getElementById("bagFill");
  var $bar = document.getElementById("bagBar");
  var $text = document.getElementById("bagText");
  var total = 0;
  SECTIONS.forEach(function (s) { total += s.items.length; });

  function esc(s) { return window.MP.esc(s); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) {} }

  function update() {
    var n = 0;
    Object.keys(done).forEach(function (k) { if (done[k]) n++; });
    var pct = total ? Math.round(n / total * 100) : 0;
    $fill.style.width = pct + "%";
    $bar.setAttribute("aria-valuenow", String(pct));
    $text.textContent = n + " of " + total + " packed" + (n === total ? ". You are ready!" : "");
  }

  function render() {
    $lists.innerHTML = SECTIONS.map(function (s) {
      var items = s.items.map(function (label, i) {
        var id = s.id + "-" + i;
        return '<li><label><input type="checkbox" data-id="' + id + '"' + (done[id] ? " checked" : "") + "><span>" + esc(label) + "</span></label></li>";
      }).join("");
      var link = s.link ? ' <a class="no-print" href="' + s.link[1] + '">' + esc(s.link[0]) + "</a>" : "";
      return '<section class="check-section"><h2>' + esc(s.title) + link + '</h2><ul class="check-list">' + items + "</ul></section>";
    }).join("");
    update();
  }
  $lists.addEventListener("change", function (e) {
    var id = e.target.getAttribute("data-id");
    if (!id) return;
    done[id] = e.target.checked;
    save();
    update();
    if (window.MP) window.MP.track("bag_item", { checked: e.target.checked });
  });

  document.getElementById("bagPrint").addEventListener("click", function () { window.print(); });
  document.getElementById("bagReset").addEventListener("click", function () {
    if (!confirm("Clear all ticks and start again?")) return;
    done = {};
    save();
    render();
  });

  render();
})();
