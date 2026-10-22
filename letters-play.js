"use strict";

// Letras "resolver yo": build words from the ten tiles while the longest words are found in the background.
const lettersPlayPanel = document.getElementById("letters-play");
const lpBox = document.getElementById("lp-box");
const lpWords = document.getElementById("lp-words");
const lpCurrent = document.getElementById("lp-current");
const lpStatus = document.getElementById("lp-status");
const lpAuto = document.getElementById("lp-auto");
const lpTiles = document.getElementById("lp-tiles");
const lettersCelebration = new TargetCelebration(lettersPlayPanel);
let lettersWorker = null;
let lettersRequest = 0;
let lp = null;

// Same budget as the Cifras steps: a status line, five rows and the large current row always fit.
const LP_ROW = 30, LP_CURRENT = 56, LP_GAP = 4, LP_STATUS = 34, LP_CHROME = 16;
// Room for six submitted words above the large word in progress before the box scrolls.
const LP_MIN_BOX = LP_CHROME + LP_STATUS + 6 * (LP_ROW + LP_GAP) + LP_CURRENT;
const LP_RESERVE = 12 + LP_STATUS + 6 * LP_GAP, LP_UNITS = 6 * LP_ROW + LP_CURRENT, LP_MAX_SCALE = 1.55;

const letterWord = count => count === 1 ? "letra" : "letras";
const upper = word => word.toLocaleUpperCase("es");

function stopLettersWorker() {
  // Results of an abandoned puzzle are ignored; the worker keeps the parsed dictionary for the next one.
  lettersRequest++;
}

function failLetters(message) {
  if (!lp) return;
  lp.error = message;
  renderLettersPlay();
}

function handleLettersMessage(data) {
  if (!lp || data.id !== lp.request) return;
  if (data.type === "loading") lp.progress = "Cargando el diccionario ortogr\u00e1fico RLA-ES...";
  else if (data.type === "progress") {
    lp.progress = `Buscando... ${Math.round(data.examined / data.total * 100)} % de las entradas revisadas.`;
    lp.known = Math.max(lp.known, data.longest || 0);
  }
  else if (data.type === "error") {
    failLetters(`Error en la b\u00fasqueda: ${data.message} Vuelve atr\u00e1s e int\u00e9ntalo de nuevo.`);
    return;
  } else if (data.type === "done") {
    const { length, matches, valid } = data.result;
    lp.result = { length, matches, valid: new Map(valid.map(([key, word, lemma]) => [key, { word, lemma }])) };
    lp.known = length;
    for (const row of lp.rows) classifyRow(row);
    if (lp.auto) lp.scroll = "top";
  } else return;
  renderLettersPlay();
}

function startLettersSearch() {
  const id = lp.request = ++lettersRequest;
  try {
    if (!lettersWorker) {
      lettersWorker = new Worker("letters-worker.js?v=3");
      lettersWorker.onmessage = ({ data }) => handleLettersMessage(data);
      lettersWorker.onerror = event => {
        event.preventDefault();
        console.error("Error en el proceso de letras:", event.message);
        lettersWorker.terminate();
        lettersWorker = null;
        failLetters("No se pudo cargar o ejecutar el proceso de letras. Abre el sitio web en lugar del archivo local e int\u00e9ntalo de nuevo.");
      };
    }
    lettersWorker.postMessage({ letters: lp.key, id, all: true });
  } catch (error) {
    console.error("Error al iniciar el proceso de letras:", error);
    failLetters("No se pudo iniciar la b\u00fasqueda. Comprueba que tu navegador permite los procesos en segundo plano.");
  }
}

function classifyRow(row) {
  if (!lp.result) return;
  const hit = lp.result.valid.get(row.key);
  row.status = hit ? "ok" : "bad";
  if (hit) row.word = hit.word;
}

const isMaximum = row => Boolean(lp.result) && lp.result.length > 0 && row.status === "ok" && [...row.key].length === lp.result.length;

function dleLink(word, lemma) {
  const link = document.createElement("a");
  link.className = "lp-dle";
  link.href = `https://dle.rae.es/${encodeURIComponent(lemma)}`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.lang = "es";
  link.title = `Consultar \u00ab${word}\u00bb en el DLE (lema: ${lemma})`;
  link.setAttribute("aria-label", link.title);
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("fill", "none");
  icon.setAttribute("stroke", "currentColor");
  icon.setAttribute("stroke-width", "2");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Zm0 0v15");
  icon.append(path);
  link.append(icon);
  return link;
}

function wordRow(text, length, mark, className) {
  const item = document.createElement("li");
  item.className = className;
  const word = document.createElement("span");
  word.className = "lp-word";
  word.textContent = text;
  item.append(word);
  if (length) {
    const size = document.createElement("span");
    size.className = "lp-len";
    size.textContent = String(length);
    item.append(size);
  }
  const symbol = document.createElement("span");
  symbol.className = "lp-mark";
  symbol.textContent = mark;
  item.append(symbol);
  return item;
}

function sectionRow(text, className = "lp-section") {
  const item = document.createElement("li");
  item.className = className;
  item.textContent = text;
  return item;
}

function renderLettersPlay() {
  if (!lp) return;
  lp.letters.forEach((letter, index) => {
    const tile = lpTiles.children[index];
    tile.disabled = lp.used[index];
    tile.classList.toggle("used", lp.used[index]);
  });

  const items = [];
  const found = new Set(lp.rows.filter(row => row.status === "ok").map(row => row.key));
  if (lp.auto && lp.result) {
    items.push(sectionRow(lp.result.matches.length ?
      `Las m\u00e1s largas \u00b7 ${lp.result.length} ${letterWord(lp.result.length)}` : "Sin candidatas"));
    const caveat = sectionRow("", "lp-caveat");
    caveat.id = "letters-source";
    caveat.innerHTML = 'Candidatas del diccionario abierto <a href="https://github.com/sbosio/rla-es">RLA-ES</a> (Santiago Bosio y colaboradores), <strong>no verificadas por la RAE</strong> &middot; <a href="data/MPL-1.1.txt">MPL 1.1</a> &middot; <a href="data/README.md">Fuente y alcance</a>';
    items.push(caveat);
    for (const { word, lemma } of lp.result.matches) {
      const mine = found.has(LettersSolver.normalize(word));
      const item = wordRow(upper(word), [...word].length, mine ? "\u2605 tuya" : "", `solution${mine ? " best" : ""}`);
      item.append(dleLink(word, lemma));
      items.push(item);
    }
    items.push(sectionRow("Tus palabras"));
  }
  for (const row of lp.rows) {
    const maximum = isMaximum(row);
    const mark = row.status === "pending" ? "\u2026" : row.status === "bad" ? "\u2718" : maximum ? "\u2605" : "\u2714";
    const item = wordRow(upper(row.word), row.status === "ok" ? [...row.key].length : 0, mark, `mine ${row.status}${maximum ? " best" : ""}`);
    item.dataset.key = row.key;
    item.setAttribute("aria-label", `${row.word}: ${row.status === "pending" ? "comprobando" : row.status === "bad" ? "no v\u00e1lida" :
      `v\u00e1lida, ${[...row.key].length} ${letterWord([...row.key].length)}${maximum ? ", de las m\u00e1s largas" : ""}`}`);
    items.push(item);
  }
  lpWords.replaceChildren(...items);

  const text = lp.current.map(index => lp.letters[index]).join("");
  const word = document.createElement("span");
  word.className = "lp-current-word";
  word.textContent = upper(text);
  const caret = document.createElement("span");
  caret.className = "lp-caret";
  lpCurrent.replaceChildren(word, caret);
  lpCurrent.setAttribute("aria-label", text ? `Palabra en curso: ${text}` : "Palabra en curso: vac\u00eda");
  document.getElementById("lp-delete").disabled = !lp.current.length;
  document.getElementById("lp-submit").disabled = !lp.current.length;
  lpAuto.disabled = lp.auto;

  const best = lp.rows.filter(row => row.status === "ok").sort((a, b) => [...b.key].length - [...a.key].length)[0];
  const reached = Boolean(best) && isMaximum(best);
  const shown = lp.auto && lp.result;
  const bestLength = best ? [...best.key].length : 0;
  const setText = (id, text) => { const element = document.getElementById(id); if (element.textContent !== text) element.textContent = text; };
  setText("lp-best", best ? String(bestLength) : "\u2013");
  setText("lp-best-word", best ? `${letterWord(bestLength)} \u00b7 ${upper(best.word)}` : "sin palabras a\u00fan");
  // The background search reveals the longest length known so far, like the Cifras objective.
  setText("lp-best-max", reached ? "\u00a1m\u00e1xima!" : lp.result ? `m\u00e1x. ${lp.result.length}` :
    lp.error ? "" : `m\u00e1x. ${lp.known || ""}\u2026`);

  let message = "";
  if (lp.error) message = lp.error;
  else if (lp.auto && !lp.result) message = lp.progress || "Buscando las palabras m\u00e1s largas...";
  else if (shown && !lp.result.matches.length) message = "No se han encontrado candidatas en este diccionario ortogr\u00e1fico. Esto no demuestra que no exista ninguna palabra real en espa\u00f1ol.";
  lpStatus.textContent = message;
  lpStatus.classList.toggle("error", Boolean(lp.error));
  lettersCelebration.update(reached);
  fitLettersPlay();
  if (lp.flash) {
    const item = lpWords.querySelector(`li.mine[data-key="${CSS.escape(lp.flash)}"]`);
    lp.flash = null;
    if (item) {
      item.classList.add("flash");
      item.scrollIntoView({ block: "nearest" });
    }
  }
}

function fitLettersPlay() {
  if (lettersPlayPanel.hidden || !lp) return;
  const gap = 8;
  const toolbar = lettersPlayPanel.querySelector(".calculator-toolbar").offsetHeight;
  const width = lettersPlayPanel.clientWidth - 2;
  const budget = lettersPlayPanel.clientHeight - toolbar - 2 * gap - LP_MIN_BOX - 2 - 2 * gap;
  const tileWidth = (width - 4 * gap) / 5;
  // Tiles fill the spare height but never grow taller than they are wide.
  const actionHeight = Math.floor(Math.max(44, Math.min(72, budget / 3)));
  const tileHeight = Math.floor(Math.max(44, Math.min(tileWidth, (budget - actionHeight) / 2)));
  lettersPlayPanel.style.setProperty("--lp-tile-height", `${tileHeight}px`);
  lettersPlayPanel.style.setProperty("--lp-tile-font", `${Math.round(Math.min(56, Math.max(22, Math.min(tileHeight, tileWidth) * .55)))}px`);
  lettersPlayPanel.style.setProperty("--lp-action-height", `${actionHeight}px`);
  lettersPlayPanel.style.setProperty("--lp-action-font", `${Math.round(Math.min(40, Math.max(22, actionHeight * .5)))}px`);
  const scale = Math.min(LP_MAX_SCALE, Math.max(1, (lpBox.clientHeight - LP_RESERVE) / LP_UNITS));
  lpBox.style.setProperty("--step-scale", scale.toFixed(3));
  for (const element of [document.getElementById("lp-best-word"), lpCurrent, ...lpWords.querySelectorAll("li:not(.lp-section):not(.lp-caveat)")]) {
    element.style.fontSize = "";
    if (element.scrollWidth > element.clientWidth + .5) {
      const size = parseFloat(getComputedStyle(element).fontSize) * element.clientWidth / element.scrollWidth * .95;
      element.style.fontSize = `${Math.max(10, size)}px`;
    }
  }
  lpBox.scrollTop = lp.scroll === "top" ? 0 : lpBox.scrollHeight;
}
new ResizeObserver(fitLettersPlay).observe(lettersPlayPanel);

function addLetter(index) {
  if (!lp || lp.used[index]) return;
  lp.used[index] = true;
  lp.current.push(index);
  lp.scroll = "bottom";
  renderLettersPlay();
}

function removeLetter() {
  if (!lp || !lp.current.length) return;
  lp.used[lp.current.pop()] = false;
  renderLettersPlay();
}

function submitWord() {
  if (!lp || !lp.current.length) return;
  const key = lp.current.map(index => lp.letters[index]).join("");
  lp.current = [];
  lp.used.fill(false);
  lp.scroll = "bottom";
  if (lp.rows.some(row => row.key === key)) lp.flash = key;
  else {
    const row = { key, word: key, status: "pending" };
    classifyRow(row);
    lp.rows.push(row);
  }
  renderLettersPlay();
}

function openLettersPlay() {
  let key;
  try {
    key = LettersSolver.parseLetters(getLetterChips());
  } catch {
    return false;
  }
  if ([...key].length !== 10) return false;
  lettersCelebration.stop();
  lp = { key, letters: [...key], used: Array(10).fill(false), current: [], rows: [], result: null, error: "", progress: "", auto: false, flash: null, scroll: "bottom", known: 0 };
  lpTiles.replaceChildren(...lp.letters.map((letter, index) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.dataset.tile = String(index);
    tile.textContent = upper(letter);
    tile.setAttribute("aria-label", `Letra ${upper(letter)}`);
    tile.addEventListener("click", () => addLetter(index));
    return tile;
  }));
  document.querySelector("main").classList.add("manual");
  lettersPlayPanel.hidden = false;
  renderLettersPlay();
  startLettersSearch();
  document.getElementById("lp-back").focus();
  document.dispatchEvent(new CustomEvent("calculatorviewchange", { detail: { open: true } }));
  return true;
}

function closeLettersPlay() {
  stopLettersWorker();
  lettersCelebration.stop();
  lp = null;
  lettersPlayPanel.hidden = true;
  document.querySelector("main").classList.remove("manual");
  document.dispatchEvent(new CustomEvent("calculatorviewchange", { detail: { open: false } }));
}

document.getElementById("lp-delete").addEventListener("click", removeLetter);
document.getElementById("lp-submit").addEventListener("click", submitWord);
lpAuto.addEventListener("click", () => {
  if (!lp || lp.auto) return;
  lp.auto = true;
  lp.scroll = "top";
  renderLettersPlay();
});
// Volver always starts a fresh Letras entry; puzzle-state also rewinds history onto the empty entry.
document.getElementById("lp-back").addEventListener("click", () => {
  closeLettersPlay();
  document.dispatchEvent(new CustomEvent("resetpuzzle", { detail: "letras" }));
  document.dispatchEvent(new CustomEvent("calculatorback"));
  document.querySelector("#letter-pad button")?.focus();
});
document.addEventListener("keydown", event => {
  if (lettersPlayPanel.hidden || !lp || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === "Enter") {
    event.preventDefault();
    submitWord();
  } else if (event.key === "Backspace") {
    event.preventDefault();
    removeLetter();
  } else if (/^[a-z\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc\u00f1]$/iu.test(event.key)) {
    event.preventDefault();
    const letter = LettersSolver.normalize(event.key);
    const index = lp.letters.findIndex((tile, position) => tile === letter && !lp.used[position]);
    if (index >= 0) addLetter(index);
  }
});
window.addEventListener("pagehide", () => {
  stopLettersWorker();
  lettersCelebration.stop();
  if (lettersWorker) lettersWorker.terminate();
  lettersWorker = null;
});
