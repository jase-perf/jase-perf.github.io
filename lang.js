/*
 * Language switching for jase.town.
 *
 * A page opts in by including this script in <head> and declaring its
 * translations with standard hreflang links, e.g. on /:
 *   <link rel="alternate" hreflang="en" href="/" />
 *   <link rel="alternate" hreflang="ja" href="/ja/" />
 * The page's own language comes from <html lang="...">.
 *
 * Behaviour:
 * - A saved choice (from clicking the switcher) always wins.
 * - With no saved choice, a visitor whose browser prefers Japanese is
 *   sent to the Japanese version (on every visit, until they pick a
 *   language); everyone else stays put. Nothing is saved automatically.
 * - The switcher is a small "EN / 日本語" control pinned to the top right.
 * - ?lang=en or ?lang=ja in the URL saves that choice, so a link can
 *   force a language.
 */
(function () {
  var KEY = "jase.town.lang";
  var LANGS = { en: "EN", ja: "日本語" };

  function store(v) {
    try {
      if (v === undefined) return localStorage.getItem(KEY);
      localStorage.setItem(KEY, v);
    } catch (e) {
      return null;
    }
  }

  function base(tag) {
    return String(tag || "").toLowerCase().split("-")[0];
  }

  var current = base(document.documentElement.lang) || "en";

  // Collect this page's translations from its hreflang links.
  var alternates = {};
  var links = document.querySelectorAll('link[rel="alternate"][hreflang]');
  for (var i = 0; i < links.length; i++) {
    var l = base(links[i].getAttribute("hreflang"));
    if (LANGS[l]) alternates[l] = links[i].getAttribute("href");
  }
  if (!alternates.en && !alternates.ja) return;

  // The query string without our own ?lang= parameter, so other parameters
  // (UTM tags etc.) survive a redirect.
  var params = new URLSearchParams(location.search);
  var forced = base(params.get("lang"));
  params.delete("lang");
  var rest = params.toString();

  function target(lang, choose) {
    var href = alternates[lang];
    if (!href) return null;
    var q = rest;
    // The switcher links carry ?lang= so the choice holds even when
    // localStorage is unavailable or the link is opened in a new tab.
    if (choose) q = (q ? q + "&" : "") + "lang=" + lang;
    return href + (q ? "?" + q : "") + location.hash;
  }

  // An explicit ?lang= in the URL is a choice: save it, then tidy the URL.
  if (LANGS[forced]) {
    store(forced);
    if (history.replaceState) {
      history.replaceState(null, "", location.pathname + (rest ? "?" + rest : "") + location.hash);
    }
  }

  // Decide whether this visitor belongs on the other language's page.
  // ?lang= wins outright (it works without storage); then a saved choice;
  // then the browser's language.
  var wanted = LANGS[forced] ? forced : base(store());
  if (!LANGS[wanted]) {
    var prefs = navigator.languages || [navigator.language];
    wanted = "en";
    for (var j = 0; j < prefs.length; j++) {
      var p = base(prefs[j]);
      if (p === "ja" || p === "en") {
        wanted = p;
        break;
      }
    }
    // Only auto-redirect toward Japanese; never push someone off a
    // Japanese page they opened on purpose.
    if (wanted !== "ja") wanted = current;
  }
  if (wanted !== current && alternates[wanted]) {
    location.replace(target(wanted));
    return;
  }

  // Render the switcher.
  var css =
    ".lang-switch{position:absolute;top:14px;right:16px;z-index:50;" +
    "display:flex;gap:2px;font:12px/1 'Space Mono','M PLUS 1 Code',monospace;" +
    "letter-spacing:1px;background:rgba(251,250,255,.85);" +
    "border:1px solid rgba(60,40,120,.18);padding:3px}" +
    ".lang-switch a,.lang-switch span{padding:6px 9px;text-decoration:none;color:#4a4660}" +
    ".lang-switch a:hover{color:#1a1a24;background:rgba(70,200,162,.15)}" +
    ".lang-switch span{color:#fff;background:linear-gradient(90deg,#46c8a2,#a394f0)}";

  function render() {
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    var nav = document.createElement("nav");
    nav.className = "lang-switch";
    nav.setAttribute("aria-label", current === "ja" ? "言語" : "Language");
    ["en", "ja"].forEach(function (lang) {
      if (!alternates[lang] && lang !== current) return;
      var el;
      if (lang === current) {
        el = document.createElement("span");
        el.setAttribute("aria-current", "true");
      } else {
        el = document.createElement("a");
        el.href = target(lang, true);
        el.hreflang = lang;
        el.lang = lang;
        el.addEventListener("click", function () {
          store(lang);
        });
      }
      el.textContent = LANGS[lang];
      nav.appendChild(el);
    });
    document.body.appendChild(nav);
  }

  if (document.body) render();
  else document.addEventListener("DOMContentLoaded", render);
})();
