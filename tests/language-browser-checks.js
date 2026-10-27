export async function run(viewports = [[360, 640], [390, 844], [1280, 720]]) {
  const results = [];
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const wait = async predicate => {
    const deadline = Date.now() + 30000;
    while (!predicate()) {
      if (Date.now() > deadline) throw new Error("Language check timed out");
      await new Promise(resolve => setTimeout(resolve, 25));
    }
  };
  const previous = localStorage.getItem("puzzle-language");
  try {
    for (const [width, height] of viewports) {
      const frame = document.createElement("iframe");
      frame.style.cssText = `position:fixed;left:0;top:0;border:0;width:${width}px;height:${height}px;z-index:1000;background:#eef5fb`;
      let doc, win;
      const load = search => new Promise((resolve, reject) => {
        frame.onload = () => { doc = frame.contentDocument; win = frame.contentWindow; resolve(); };
        frame.onerror = reject;
        frame.src = new URL("../index.html" + search, import.meta.url).href;
        if (!frame.isConnected) document.body.append(frame);
      });
      const byId = id => doc.getElementById(id);
      const choose = language => {
        byId("language-button").click();
        doc.querySelector(`[data-language="${language}"]`).click();
      };
      const fits = () => {
        assert(doc.documentElement.scrollWidth <= width && doc.documentElement.scrollHeight <= height, "Page must not scroll");
        const style = doc.createElement("style");
        style.textContent = "button::before { display:none !important; }";
        doc.head.append(style);
        try {
          for (const key of doc.querySelectorAll("#letter-pad button, #number-pad button, #lp-tiles button, #lp-actions button")) {
            if (!key.getClientRects().length) continue;
            const rect = key.getBoundingClientRect();
            assert(rect.width >= 44 && rect.height >= 44 && rect.bottom <= height && rect.left >= 0 && rect.right <= width, `Key outside viewport: ${key.textContent}`);
            assert(key.scrollWidth <= key.clientWidth + 1 && key.scrollHeight <= key.clientHeight + 1, `Key clipped: ${key.textContent}`);
          }
        } finally { style.remove(); }
      };
      try {
        for (const [language, title, sample, word] of [
          ["fr", "Lettres", "RELATIONSA", "RELATIONS"],
          ["en", "Letters", "COUNTDOWNA", "COUNTDOWN"],
          ["es", "Letras", "CAMIONESTA", "CAMIONES"]
        ]) {
          await load("?modo=letras&lang=" + language);
          assert(doc.documentElement.lang === language, "Document language not restored");
          assert(byId("letters-tab").textContent === title, "Tab not translated");
          assert(byId("language-button").textContent === language.toUpperCase(), "Wrong language indicator");
          assert(byId("language-button").title === ({es: "Interfaz y diccionario", fr: "Interface et dictionnaire", en: "Interface and dictionary"})[language], "Selector title not translated");
          const alphabet = [...doc.querySelectorAll("[data-letter-key]")].map(key => key.dataset.letterKey).join("");
          assert(alphabet.includes("\u00d1") === (language === "es"), "Wrong entry alphabet");
          const tabs = doc.querySelector(".tabs").getBoundingClientRect();
          const logo = doc.querySelector(".tabs img").getBoundingClientRect();
          const left = byId("numbers-tab").getBoundingClientRect(), right = byId("letters-tab").getBoundingClientRect();
          const selector = byId("language-button").getBoundingClientRect();
          assert(Math.abs(left.width - right.width) < 1, "Tabs are not equal-width");
          assert(Math.abs(logo.left + logo.width / 2 - tabs.left - tabs.width / 2) < 1, "Logo is not centered");
          assert(selector.left >= right.left && selector.right <= right.right, "Selector is outside Letters tab");
          const range = doc.createRange();
          range.selectNodeContents(byId("letters-tab"));
          const label = range.getBoundingClientRect();
          assert(label.right + 3 <= selector.left && label.left >= logo.right - 1, "Letters label overlaps selector or logo");
          fits();
          byId("language-button").click();
          assert(!byId("language-menu").hidden && byId("language-button").getAttribute("aria-expanded") === "true", "Menu did not open");
          assert(doc.activeElement.dataset.language === language, "Current language should receive focus");
          doc.activeElement.dispatchEvent(new win.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
          assert(doc.activeElement.dataset.language !== language, "Arrow key did not move focus");
          doc.activeElement.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
          assert(byId("language-menu").hidden && doc.activeElement === byId("language-button"), "Escape must close menu and restore focus");
          for (const letter of sample) doc.querySelector(`[data-letter-key="${letter}"]`).click();
          assert(!byId("letters-play").hidden, "Tenth letter must open word play");
          byId("lp-auto").click();
          await wait(() => byId("lp-words").querySelector("li.solution") || byId("lp-status").classList.contains("error"));
          assert(!byId("lp-status").classList.contains("error"), byId("lp-status").textContent);
          const solutions = [...byId("lp-words").querySelectorAll(".solution .lp-word")].map(node => node.textContent);
          assert(solutions.length > 0, "No dictionary results");
          assert(byId("letters-source").textContent.includes(language === "es" ? "RLA-ES" : "an-array-of-"), "Wrong dictionary source");
          const link = byId("lp-words").querySelector(".lp-dle");
          assert(link.href.startsWith(language === "es" ? "https://dle.rae.es/" : `https://${language}.wiktionary.org/`), "Wrong dictionary lookup");
          for (const letter of word) {
            const key = [...byId("lp-tiles").children].find(tile => !tile.disabled && tile.textContent === letter);
            assert(key, `Missing tile ${letter}`);
            key.click();
          }
          byId("lp-submit").click();
          assert(byId("lp-words").querySelector(".mine.ok"), "Real word should be validated");
          assert(byId("lp-best").textContent === String(word.length), "Best length not updated");
          fits();
          assert(new URL(win.location.href).searchParams.get("lang") === (language === "es" ? null : language), "Puzzle link lost language");
          const puzzleUrl = win.location.search;
          await load(puzzleUrl);
          assert(doc.documentElement.lang === language && !byId("letters-play").hidden, "Reload lost language or puzzle");
          byId("lp-back").click();
          await wait(() => byId("letters-play").hidden && byId("letters").value === "");
          choose(language === "fr" ? "en" : "fr");
          assert(byId("letters").value === "", "Switching language must clear letters");
          assert(localStorage.getItem("puzzle-language") === (language === "fr" ? "en" : "fr"), "Language preference not saved");
          byId("numbers-tab").click();
          assert(byId("number-target-slot").firstElementChild.textContent !== "Objetivo", "Numbers interface not translated");
          fits();
          if (width === 360 && language !== "es") {
            await load(`?modo=cifras&lang=${language}&n=25,50,3,6,7,8&obj=952`);
            assert(!byId("calculator-panel").hidden, "Numbers puzzle did not restore");
            assert(byId("calculator-title").textContent === (language === "fr" ? "Objectif" : "Target"), "Numbers target not translated");
            assert(byId("calculator-auto").textContent === (language === "fr" ? "Solution auto" : "Auto-solve"), "Auto-solve not translated");
            const number = value => [...byId("calculator-keys").children].find(key => key.textContent === value);
            number("50").click();
            doc.querySelector('[data-operator="/"]').click();
            number("3").click();
            assert(byId("calculator-status").classList.contains("error"), "Invalid division should show an error");
            assert(!byId("calculator-status").textContent.includes("La divisi\u00f3n"), "Numbers error remained Spanish");
            byId("calculator-auto").click();
            await wait(() => byId("calculator-distance").textContent === (language === "fr" ? "Objectif atteint" : "Target reached"));
            await wait(() => byId("calculator-auto").textContent === (language === "fr" ? "Solution auto" : "Auto-solve"));
            assert(!byId("calculator-status").textContent.includes("Soluci\u00f3n"), "Solution status remained Spanish");
          }
          results.push({ language, viewport: [width, height], dictionary: true, menu: true, layout: true, reload: true });
        }
        localStorage.setItem("puzzle-language", "en");
        await load("?modo=letras");
        assert(doc.documentElement.lang === "en", "Empty entry should use saved preference");
        await load("?modo=letras&l=ni\u00f1os");
        assert(doc.documentElement.lang === "es" && byId("letters").value === "ni\u00f1os", "Legacy puzzles must remain Spanish");
        await load("?modo=letras&lang=fr&l=%C3%A9l%C3%A8ves");
        assert(byId("letters").value === "\u00e9l\u00e8ves" && !byId("letters-status").classList.contains("error"), "French accented URL rejected");
      } finally { frame.remove(); }
    }
  } finally {
    if (previous === null) localStorage.removeItem("puzzle-language");
    else localStorage.setItem("puzzle-language", previous);
  }
  return results;
}
