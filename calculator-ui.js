"use strict";

const calculatorPanel = document.getElementById("calculator-panel");
const calculatorStatus = document.getElementById("calculator-status");
const calculatorKeys = document.getElementById("calculator-keys");
const operatorButtons = [...document.querySelectorAll("[data-operator]")];
const autoButton = document.getElementById("calculator-auto");
const targetCelebration = new TargetCelebration(calculatorPanel);
const numeralContext = document.createElement("canvas").getContext("2d");
let manualGame;
let autoBusy = false;
let autoGeneration = 0;
let autoWorker = null;
let autoUrl = null;
let rejectSearch = null;
let cancelDelay = null;
let animationBusy = false;
let tileAnimations = [];
let tileGhosts = [];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

function stopTileAnimations() {
  for (const animation of tileAnimations) animation.cancel();
  for (const ghost of tileGhosts) ghost.remove();
  tileAnimations = [];
  tileGhosts = [];
  animationBusy = false;
  calculatorPanel.dataset.animating = "false";
}

function applyTileAction(action, message) {
  const before = new Map([...calculatorKeys.children].map(button => {
    const computed = getComputedStyle(button);
    const styles = Object.fromEntries(["font", "lineHeight", "padding", "backgroundColor", "color", "border", "boxShadow"]
      .map(property => [property, computed[property]]));
    return [button.dataset.tile, { button, bounds: button.getBoundingClientRect(), styles }];
  }));
  action();
  const ids = new Set(manualGame.state.tiles.map(tile => tile.id));
  const removed = [...before].filter(([id]) => !ids.has(id)).map(([, entry]) => entry);
  animationBusy = removed.length > 0 && !reducedMotion.matches && typeof Element.prototype.animate === "function";
  calculatorPanel.dataset.animating = String(animationBusy);
  renderCalculator(message);
  if (!animationBusy) return;
  const after = new Map([...calculatorKeys.children].map(button => [button.dataset.tile, button.getBoundingClientRect()]));
  const added = [...after].filter(([id]) => !before.has(id)).map(([, bounds]) => bounds);
  const center = bounds => ({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 });
  const average = bounds => bounds.map(center).reduce((sum, point) => ({
    x: sum.x + point.x / bounds.length, y: sum.y + point.y / bounds.length
  }), { x: 0, y: 0 });
  const origin = average(removed.map(entry => entry.bounds));
  const destination = average(added);
  const options = { duration: 340, easing: "cubic-bezier(.2,.75,.25,1)" };
  for (const button of calculatorKeys.children) {
    const bounds = after.get(button.dataset.tile);
    const previous = before.get(button.dataset.tile)?.bounds;
    const from = previous ? { x: previous.left - bounds.left, y: previous.top - bounds.top } :
      { x: origin.x - center(bounds).x, y: origin.y - center(bounds).y };
    tileAnimations.push(button.animate([
      { transform: `translate(${from.x}px, ${from.y}px) scale(${previous ? 1 : .25})`, opacity: previous ? 1 : 0 },
      { transform: "translate(0, 0) scale(1)", opacity: 1 }
    ], options));
  }
  for (const { button, bounds, styles } of removed) {
    const ghost = button.cloneNode(true);
    ghost.removeAttribute("id");
    ghost.setAttribute("aria-hidden", "true");
    ghost.tabIndex = -1;
    ghost.disabled = true;
    ghost.style.cssText = `position:fixed;pointer-events:none;z-index:5;margin:0;left:${bounds.left}px;top:${bounds.top}px;width:${bounds.width}px;height:${bounds.height}px;min-height:0;font:${styles.font};line-height:${styles.lineHeight};padding:${styles.padding};background:${styles.backgroundColor};color:${styles.color};border:${styles.border};box-shadow:${styles.boxShadow};overflow-wrap:anywhere;`;
    calculatorPanel.append(ghost);
    tileGhosts.push(ghost);
    const point = center(bounds);
    tileAnimations.push(ghost.animate([
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      { transform: `translate(${destination.x - point.x}px, ${destination.y - point.y}px) scale(.15)`, opacity: 0 }
    ], options));
  }
  const active = tileAnimations;
  Promise.all(active.map(animation => animation.finished)).then(() => {
    if (active !== tileAnimations) return;
    stopTileAnimations();
    renderCalculator(calculatorStatus.textContent, calculatorStatus.classList.contains("error"));
  }, error => {
    if (error.name !== "AbortError") console.error("Error de animaci\u00f3n:", error);
  });
}

reducedMotion.addEventListener("change", () => {
  stopTileAnimations();
  if (manualGame && !calculatorPanel.hidden) renderCalculator(calculatorStatus.textContent);
});

// Steps box must always hold a status line, five history rows and the large current row.
const HISTORY_ROW = 30, CURRENT_ROW = 56, STEP_GAP = 4, STATUS_RESERVE = 34, HISTORY_CHROME = 16;
const MIN_HISTORY_HEIGHT = HISTORY_CHROME + STATUS_RESERVE + 5 * (HISTORY_ROW + STEP_GAP) + CURRENT_ROW;
const STEP_RESERVE = 12 + STATUS_RESERVE + 5 * STEP_GAP, STEP_UNITS = 5 * HISTORY_ROW + CURRENT_ROW, MAX_STEP_SCALE = 1.55;

function layoutCalculator() {
  if (calculatorPanel.hidden || !manualGame) return;
  const gap = 8;
  const toolbar = calculatorPanel.querySelector(".calculator-toolbar").offsetHeight;
  const controlsWidth = calculatorPanel.clientWidth - 2;
  const rows = Math.max(1, Math.ceil(manualGame.numbers.length / 3));
  const budget = calculatorPanel.clientHeight - toolbar - 2 * gap - MIN_HISTORY_HEIGHT - 2 - rows * gap;
  const tileWidth = (controlsWidth - 2 * gap) / 3;
  const operatorWidth = (controlsWidth - 4 * gap) / 5;
  // Keys fill the spare height but never grow taller than they are wide.
  const operatorHeight = Math.floor(Math.max(44, Math.min(operatorWidth, budget / (rows + 1))));
  const tileHeight = Math.floor(Math.max(44, Math.min(tileWidth, (budget - operatorHeight) / rows)));
  calculatorPanel.style.setProperty("--tile-height", `${tileHeight}px`);
  calculatorPanel.style.setProperty("--keys-height", `${rows * tileHeight + (rows - 1) * gap}px`);
  calculatorPanel.style.setProperty("--operator-height", `${operatorHeight}px`);
  calculatorPanel.style.setProperty("--operator-font", `${Math.round(Math.min(44, Math.max(24, operatorHeight * .55)))}px`);
}

function fitCalculatorNumerals() {
  if (calculatorPanel.hidden || !numeralContext) return;
  layoutCalculator();
  const target = document.getElementById("calculator-target");
  const tileHeight = parseFloat(calculatorPanel.style.getPropertyValue("--tile-height")) || 64;
  const keyMaximum = Math.min(56, Math.max(24, tileHeight * .5));
  const history = document.getElementById("calculator-history");
  // Step rows grow with the box while six steps still fit, from today's 360x640 sizes up to 1.55x.
  const scale = Math.min(MAX_STEP_SCALE, Math.max(1, (history.clientHeight - STEP_RESERVE) / STEP_UNITS));
  history.style.setProperty("--step-scale", scale.toFixed(3));
  const slots = [...document.querySelectorAll("#calculator-current .step-slot")];
  for (const slot of slots) slot.style.fontSize = `${30 * scale}px`;
  for (const slot of slots) {
    const padding = 12 * scale;
    if (slot.scrollWidth > slot.clientWidth + .5) {
      slot.style.fontSize = `${Math.max(12, 30 * scale * (slot.clientWidth - padding) / (slot.scrollWidth - padding) * .95)}px`;
    }
  }
  for (const element of [target, ...calculatorKeys.children]) {
    const styles = getComputedStyle(element);
    const maximum = element === target ? 46 : keyMaximum;
    numeralContext.font = `${styles.fontWeight} ${maximum}px ${styles.fontFamily}`;
    const available = element === target ?
      target.parentElement.clientWidth - document.getElementById("calculator-distance").offsetWidth - 10 :
      element.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
    const width = numeralContext.measureText(element.textContent).width;
    const size = Math.max(14, Math.min(maximum, maximum * available * .94 / Math.max(1, width)));
    element.style.fontSize = `${size}px`;
    if (element === target) element.style.color = size >= 24 ? "var(--target)" : "var(--ink)";
  }
  for (const item of document.getElementById("calculator-steps").children) {
    item.style.fontSize = "";
    const operation = item.lastElementChild;
    if (operation && operation.scrollWidth > operation.clientWidth) {
      const size = parseFloat(getComputedStyle(item).fontSize) * operation.clientWidth / operation.scrollWidth * .97;
      item.style.fontSize = `${Math.max(10, size)}px`;
    }
  }
  history.scrollTop = history.scrollHeight;
}
new ResizeObserver(fitCalculatorNumerals).observe(calculatorPanel);

function renderCalculator(message, error = false) {
  const state = manualGame.state;
  const symbol = { "+": "+", "-": "\u2212", "*": "\u00d7", "/": "\u00f7" }[state.operator] || "";
  const selected = state.tiles.find(tile => tile.id === state.selected);
  const buttons = new Map([...calculatorKeys.children].map(button => [button.dataset.tile, button]));
  const visibleButtons = state.tiles.map(tile => {
    let button = buttons.get(tile.id);
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.dataset.tile = tile.id;
      button.addEventListener("click", () => calculatorAction(() => manualGame.chooseNumber(tile.id)));
    }
    button.textContent = formatNumberValue(tile.value);
    button.title = String(tile.value);
    button.classList.toggle("result-key", tile.step !== null);
    button.dataset.marker = tile.step === null ? "" : "=";
    button.setAttribute("aria-pressed", String(state.selected === tile.id));
    button.setAttribute("aria-label", tile.step === null ?
      tr("Cifra original {number}: {value}", { number: tile.originals[0] + 1, value: tile.value }) : tr("Resultado: {value}", { value: tile.value }));
    button.disabled = autoBusy || animationBusy;
    return button;
  });
  calculatorKeys.replaceChildren(...visibleButtons);
  for (const button of operatorButtons) {
    button.disabled = autoBusy || animationBusy || state.selected === null || state.operator !== null;
    button.setAttribute("aria-pressed", String(state.operator === button.dataset.operator));
  }
  document.getElementById("calculator-undo").disabled = autoBusy || animationBusy || (!manualGame.history.length && state.selected === null);
  autoButton.disabled = animationBusy && !autoBusy;
  autoButton.textContent = tr(autoBusy ? "Cancelar" : "Auto-resolver");
  const steps = document.getElementById("calculator-steps");
  steps.replaceChildren();
  for (const step of state.steps) {
    const item = document.createElement("li");
    item.append(createNumberStep(step));
    steps.append(item);
  }
  const reached = manualGame.distance === 0n;
  const current = document.getElementById("calculator-current");
  current.hidden = state.tiles.length < 2 || (reached && state.selected === null);
  const number = document.createElement("span");
  number.className = "step-number";
  number.textContent = String(state.steps.length + 1);
  const slot = tile => {
    const span = document.createElement("span");
    span.className = tile ? `step-slot filled${tile.step === null ? "" : " derived"}` : "step-slot";
    span.textContent = tile ? formatNumberValue(tile.value) : "?";
    span.title = tile ? String(tile.value) : "";
    return span;
  };
  const operator = document.createElement("span");
  operator.className = `step-operator${symbol ? "" : " empty"}`;
  operator.textContent = symbol || "\u25cb";
  current.replaceChildren(number, slot(selected), operator, slot(null));
  current.setAttribute("aria-label", tr("Paso {number}: {left} {operator} ?", { number: state.steps.length + 1, left: selected ? selected.value : "?", operator: symbol || "?" }));
  const direction = tr(manualGame.offset < 0n ? "faltan" : "sobran");
  const gap = reached ? "" : `${direction} ${formatNumberValue(manualGame.distance)}`;
  document.getElementById("calculator-distance").textContent = reached ? tr("Objetivo alcanzado") : gap;
  document.getElementById("calculator-distance").setAttribute("aria-label", reached ?
    tr("Objetivo alcanzado") : tr("{gap} {distance} respecto al bot\u00f3n m\u00e1s cercano", { gap: direction, distance: manualGame.distance }));
  document.getElementById("calculator-distance").title = reached ? tr("Objetivo alcanzado") : `${direction} ${manualGame.distance}`;
  calculatorStatus.textContent = tr(message || (reached ? "\u00a1Objetivo alcanzado!" : ""));
  calculatorStatus.classList.toggle("error", error);
  calculatorStatus.classList.toggle("success", reached && !error);
  targetCelebration.update(reached);
  fitCalculatorNumerals();
}

function calculatorAction(action) {
  if (autoBusy || animationBusy) return;
  try {
    applyTileAction(action);
  } catch (error) {
    renderCalculator(error.message, true);
  }
}

function clearSearchWorker() {
  if (autoWorker) autoWorker.terminate();
  if (autoUrl) URL.revokeObjectURL(autoUrl);
  autoWorker = null;
  autoUrl = null;
}

function cancelAutomatic() {
  autoGeneration++;
  clearSearchWorker();
  if (rejectSearch) rejectSearch(Object.assign(new Error("Cancelado"), { name: "AbortError" }));
  rejectSearch = null;
  if (cancelDelay) cancelDelay();
  cancelDelay = null;
  autoBusy = false;
  stopTileAnimations();
}

function searchTiles(tiles) {
  return new Promise((resolve, reject) => {
    rejectSearch = reject;
    try {
      const created = createNumbersWorker();
      autoWorker = created.worker;
      autoUrl = created.url;
      autoWorker.onmessage = ({ data }) => {
        if (data.type === "progress") {
          calculatorStatus.textContent = tr("Buscando con hasta {depth} operaciones ({states} estados)...", { depth: data.depth, states: data.visited.toLocaleString(I18n.locale) });
          return;
        }
        clearSearchWorker();
        rejectSearch = null;
        if (data.type === "error") reject(new Error(data.message));
        else resolve(data.solution ? { solution: data.solution, exact: true } : { solution: data.closest, exact: false });
      };
      autoWorker.onerror = event => {
        event.preventDefault();
        clearSearchWorker();
        rejectSearch = null;
        reject(new Error(tr("El navegador no pudo ejecutar la b\u00fasqueda autom\u00e1tica.")));
      };
      autoWorker.postMessage({
        numbers: tiles.map(tile => String(tile.value)), ids: tiles.map(tile => tile.id), target: String(manualGame.target)
      });
    } catch (error) {
      clearSearchWorker();
      rejectSearch = null;
      reject(error);
    }
  });
}

function playbackDelay(milliseconds) {
  return new Promise(resolve => {
    const timer = setTimeout(() => { cancelDelay = null; resolve(true); }, milliseconds);
    cancelDelay = () => { clearTimeout(timer); resolve(false); };
  });
}

autoButton.addEventListener("click", async () => {
  if (autoBusy) {
    cancelAutomatic();
    renderCalculator("Autom\u00e1tico cancelado. Se conservan las operaciones ya realizadas.");
    return;
  }
  const generation = ++autoGeneration;
  autoBusy = true;
  renderCalculator("Buscando una continuaci\u00f3n desde los botones actuales...");
  try {
    let found = await searchTiles(manualGame.state.tiles);
    if (generation !== autoGeneration) return;
    if (!found.exact && manualGame.history.length) {
      renderCalculator("No hay continuaci\u00f3n exacta. Buscando desde las cifras originales...");
      const fresh = new NumbersGame.Game(manualGame.numbers, manualGame.target);
      const restart = await searchTiles(fresh.state.tiles);
      if (generation !== autoGeneration) return;
      if (restart.exact || BigInt(restart.solution.distance) < BigInt(found.solution.distance)) {
        found = restart;
        manualGame = fresh;
        targetCelebration.stop();
        renderCalculator(restart.exact ? "Sin continuaci\u00f3n: empezamos desde las cifras originales." :
          "Desde las cifras originales se llega m\u00e1s cerca.");
        if (!await playbackDelay(800)) return;
      }
    }
    const solution = found.solution;
    const closestMessage = found.exact ? "" :
      `No hay soluci\u00f3n exacta \u00b7 la m\u00e1s cercana: ${formatNumberValue(solution.value)} (a ${formatNumberValue(solution.distance)})`;
    manualGame.state.selected = null;
    manualGame.state.operator = null;
    const mapping = new Map(manualGame.state.tiles.map(tile => [tile.id, tile.id]));
    for (const step of solution.steps) {
      if (generation !== autoGeneration) return;
      manualGame.chooseNumber(mapping.get(step.leftId));
      manualGame.chooseOperator(step.operator);
      renderCalculator(closestMessage || "Reproduciendo la soluci\u00f3n...");
      if (!await playbackDelay(350)) return;
      let resultId;
      applyTileAction(() => { resultId = manualGame.chooseNumber(mapping.get(step.rightId)); }, closestMessage || "Reproduciendo la soluci\u00f3n...");
      mapping.set(step.id, resultId);
      if (!await playbackDelay(450)) return;
    }
    renderCalculator(closestMessage || "Soluci\u00f3n introducida. Puedes deshacer cada operaci\u00f3n.", Boolean(closestMessage));
  } catch (error) {
    if (generation === autoGeneration && error.name !== "AbortError") renderCalculator(`Error: ${error.message}`, true);
  } finally {
    if (generation === autoGeneration) {
      autoBusy = false;
      const message = calculatorStatus.textContent;
      const error = calculatorStatus.classList.contains("error");
      renderCalculator(message, error);
    }
  }
});

document.getElementById("solve-myself").addEventListener("click", () => {
  let puzzle;
  try {
    puzzle = NumbersGame.parsePuzzle(document.getElementById("numbers").value, document.getElementById("target").value);
  } catch (error) {
    const status = document.getElementById("status");
    status.textContent = tr(error.message);
    status.classList.add("error");
    return;
  }
  cancelAutomatic();
  targetCelebration.stop();
  manualGame = new NumbersGame.Game(puzzle.numbers, puzzle.target);
  const target = document.getElementById("calculator-target");
  target.textContent = formatNumberValue(puzzle.target);
  target.title = String(puzzle.target);
  target.setAttribute("aria-label", String(puzzle.target));
  document.querySelector("main").classList.add("manual");
  calculatorPanel.hidden = false;
  renderCalculator();
  document.getElementById("calculator-back").focus();
  document.dispatchEvent(new CustomEvent("calculatorviewchange", { detail: { open: true } }));
});

for (const button of operatorButtons) {
  button.addEventListener("click", () => calculatorAction(() => manualGame.chooseOperator(button.dataset.operator)));
}
document.getElementById("calculator-undo").addEventListener("click", () => calculatorAction(() => manualGame.undo()));
function closeCalculator() {
  cancelAutomatic();
  targetCelebration.stop();
  calculatorPanel.hidden = true;
  document.querySelector("main").classList.remove("manual");
  document.dispatchEvent(new CustomEvent("calculatorviewchange", { detail: { open: false } }));
}
window.closeCalculator = closeCalculator;
// Volver always starts a fresh Cifras puzzle; puzzle-state also rewinds history onto the empty entry.
document.getElementById("calculator-back").addEventListener("click", () => {
  closeCalculator();
  document.dispatchEvent(new CustomEvent("resetpuzzle", { detail: "cifras" }));
  document.dispatchEvent(new CustomEvent("calculatorback"));
  document.querySelector('#number-pad button')?.focus();
});
window.addEventListener("pagehide", () => { cancelAutomatic(); targetCelebration.stop(); });
