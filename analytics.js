"use strict";

// GoatCounter: only the mode is ever sent; numbers, target and letters stay private.
(() => {
  const urlMode = () => new URLSearchParams(location.search).get("modo") === "letras" ? "letras" : "cifras";
  const pathFor = mode => location.pathname + "?modo=" + mode;
  window.goatcounter = Object.assign(window.goatcounter || {}, { path: () => pathFor(urlMode()) });

  const lettersTab = document.getElementById("letters-tab");
  if (!lettersTab) return;
  let counted = urlMode();
  const count = mode => {
    if (mode === counted) return;
    counted = mode;
    const counter = window.goatcounter;
    if (counter && typeof counter.count === "function") counter.count({ path: pathFor(mode) });
  };
  // Records can be batched; each record's oldValue is the state before it, so replay every transition.
  new MutationObserver(records => {
    const values = records.map(record => record.oldValue).slice(1).concat(lettersTab.getAttribute("aria-selected"));
    for (const value of values) count(value === "true" ? "letras" : "cifras");
  }).observe(lettersTab, { attributes: true, attributeFilter: ["aria-selected"], attributeOldValue: true });
})();
