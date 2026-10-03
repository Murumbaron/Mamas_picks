/* Due date calculator: Naegele's rule (last period + 280 days), adjusted for cycle length. */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var DAY = 24 * 60 * 60 * 1000;

  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function diffDays(a, b) { return Math.round((startOfDay(a) - startOfDay(b)) / DAY); }
  function fmt(d) {
    return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  function parseDate(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || "");
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }

  /* Returns everything the page needs. Pure function so it is easy to check. */
  function calculate(lmp, cycle, today) {
    var due = addDays(lmp, 280 + (cycle - 28));
    var daysToDue = diffDays(due, today);
    var ga = 280 - daysToDue;                       // gestational age in days
    var weeks = Math.floor(ga / 7), days = ((ga % 7) + 7) % 7;
    var tri = ga < 98 ? "1st" : (ga < 196 ? "2nd" : "3rd");
    var start = addDays(due, -280);                 // day 0 of the pregnancy count
    var marks = [
      ["End of the first trimester (13 weeks)", 13],
      ["Halfway (20 weeks)", 20],
      ["Third trimester begins (28 weeks)", 28],
      ["Full term begins (37 weeks)", 37],
      ["Estimated due date (40 weeks)", 40]
    ].map(function (m) { return { label: m[0], date: addDays(start, m[1] * 7) }; });
    return { due: due, daysToDue: daysToDue, ga: ga, weeks: weeks, days: days, tri: tri, marks: marks };
  }
  window.dueDateCalc = calculate;

  $("dueForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var err = $("dueError");
    err.hidden = true;
    var lmp = parseDate($("lmp").value);
    var cycle = parseInt($("cycle").value, 10);
    var today = startOfDay(new Date());

    function fail(msg) { err.textContent = msg; err.hidden = false; $("dueResult").hidden = true; }

    if (!lmp) return fail("Please choose the first day of your last period.");
    if (isNaN(cycle) || cycle < 21 || cycle > 45) return fail("Please enter a cycle length between 21 and 45 days.");
    if (lmp > today) return fail("That date is in the future. Please choose the first day of your last period.");

    var r = calculate(lmp, cycle, today);
    if (r.ga > 301) return fail("That date was more than 43 weeks ago. Please check it, or speak to your clinic.");

    $("dueDate").textContent = fmt(r.due);
    $("dueNote").textContent = r.daysToDue >= 0
      ? "That is " + r.daysToDue + " day" + (r.daysToDue === 1 ? "" : "s") + " from today."
      : "That date was " + Math.abs(r.daysToDue) + " day" + (r.daysToDue === -1 ? "" : "s") + " ago. Please speak to your clinic about your care.";
    $("statWeeks").textContent = r.weeks + "w " + r.days + "d";
    $("statTri").textContent = r.tri;
    $("statLeft").textContent = Math.max(0, r.daysToDue);
    $("statPct").textContent = Math.min(100, Math.max(0, Math.round(r.ga / 280 * 100))) + "%";

    $("dueTimeline").innerHTML = r.marks.map(function (m) {
      var past = m.date < today;
      return '<li class="' + (past ? "done" : "") + '"><span>' + window.MP.esc(m.label) + "</span><strong>" + fmt(m.date) + "</strong></li>";
    }).join("");

    $("dueResult").hidden = false;
    if (window.MP) window.MP.track("due_date_calc", {});
    $("dueResult").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
})();
