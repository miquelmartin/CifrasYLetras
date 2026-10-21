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

function fitCalculatorNumerals() {
  if (calculatorPanel.hidden || !numeralContext) return;
  const display = document.getElementById("calculator-display");
  for (const element of [display, ...calculatorKeys.children]) {
    const styles = getComputedStyle(element);
    const maximum = Math.min(40, Math.max(32, innerHeight * .045));
    numeralContext.font = `${styles.fontWeight} ${maximum}px ${styles.fontFamily}`;
    const available = element.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
    const width = numeralContext.measureText(element.textContent).width;
    element.style.fontSize = `${Math.max(16, Math.min(maximum, maximum * available * .94 / Math.max(1, width)))}px`;
  }
}
new ResizeObserver(fitCalculatorNumerals).observe(calculatorPanel);

function renderCalculator(message, error = false) {
  const state = manualGame.state;
  const symbol = { "+": "+", "-": "\u2212", "*": "\u00d7", "/": "\u00f7" }[state.operator] || "";
  const selected = state.tiles.find(tile => tile.id === state.selected);
  document.getElementById("calculator-display").textContent = selected ?
    `${selected.value} ${symbol}` : state.current === null ? "\u2014" : String(state.current);
  const buttons = new Map([...calculatorKeys.children].map(button => [button.dataset.tile, button]));
  const visibleButtons = state.tiles.map(tile => {
    let button = buttons.get(tile.id);
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.dataset.tile = tile.id;
      button.addEventListener("click", () => calculatorAction(() => manualGame.chooseNumber(tile.id)));
    }
    button.textContent = String(tile.value);
    button.classList.toggle("result-key", tile.step !== null);
    button.dataset.marker = tile.step === null ? "" : `R${tile.step}`;
    button.setAttribute("aria-pressed", String(state.selected === tile.id));
    button.setAttribute("aria-label", tile.step === null ?
      `Cifra original ${tile.originals[0] + 1}: ${tile.value}` : `Resultado del paso ${tile.step}: ${tile.value}`);
    button.disabled = autoBusy || animationBusy;
    return button;
  });
  calculatorKeys.replaceChildren(...visibleButtons);
  const originals = document.getElementById("calculator-originals");
  originals.replaceChildren();
  const used = new Set(manualGame.used);
  manualGame.numbers.forEach((number, index) => {
    const item = document.createElement("li");
    item.textContent = `${number}${used.has(index) ? " \u2713" : ""}`;
    item.classList.toggle("used", used.has(index));
    item.setAttribute("aria-label", `Cifra ${index + 1}: ${number}, ${used.has(index) ? "utilizada" : "sin usar"}`);
    originals.append(item);
  });
  for (const button of operatorButtons) {
    button.disabled = autoBusy || animationBusy || state.selected === null || state.operator !== null;
    button.setAttribute("aria-pressed", String(state.operator === button.dataset.operator));
  }
  document.getElementById("calculator-undo").disabled = autoBusy || animationBusy || (!manualGame.history.length && state.selected === null);
  autoButton.disabled = animationBusy && !autoBusy;
  autoButton.textContent = autoBusy ? "Cancelar autom\u00e1tico" : "Resolver autom\u00e1ticamente";
  const steps = document.getElementById("calculator-steps");
  steps.replaceChildren();
  for (const step of state.steps) {
    const item = document.createElement("li");
    item.textContent = formatNumberStep(step);
    steps.append(item);
  }
  const reached = manualGame.distance === 0n;
  document.getElementById("calculator-distance").textContent = reached ?
    "Objetivo alcanzado" : `M\u00e1s cercano: a ${manualGame.distance} del objetivo`;
  calculatorStatus.textContent = message || (reached ? "\u00a1Objetivo alcanzado!" :
    state.operator ? "Elige el segundo bot\u00f3n." : state.selected ? "Elige una operaci\u00f3n." : "Elige un bot\u00f3n original o un resultado.");
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
          calculatorStatus.textContent = `Buscando con hasta ${data.depth} operaciones (${data.visited.toLocaleString("es-ES")} estados)...`;
          return;
        }
        clearSearchWorker();
        rejectSearch = null;
        if (data.type === "error") reject(new Error(data.message));
        else resolve(data.solution);
      };
      autoWorker.onerror = event => {
        event.preventDefault();
        clearSearchWorker();
        rejectSearch = null;
        reject(new Error("El navegador no pudo ejecutar la b\u00fasqueda autom\u00e1tica."));
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
    let solution = await searchTiles(manualGame.state.tiles);
    if (generation !== autoGeneration) return;
    if (!solution && manualGame.history.length) {
      renderCalculator("No hay continuaci\u00f3n. Buscando desde las cifras originales...");
      const fresh = new NumbersGame.Game(manualGame.numbers, manualGame.target);
      solution = await searchTiles(fresh.state.tiles);
      if (generation !== autoGeneration) return;
      if (solution) {
        manualGame = fresh;
        targetCelebration.stop();
        renderCalculator("Sin continuaci\u00f3n: empezamos desde las cifras originales.");
        if (!await playbackDelay(800)) return;
      }
    }
    if (!solution) {
      renderCalculator("No existe una soluci\u00f3n exacta con estas cifras.", true);
      return;
    }
    manualGame.state.selected = null;
    manualGame.state.operator = null;
    const mapping = new Map(manualGame.state.tiles.map(tile => [tile.id, tile.id]));
    for (const step of solution.steps) {
      if (generation !== autoGeneration) return;
      manualGame.chooseNumber(mapping.get(step.leftId));
      manualGame.chooseOperator(step.operator);
      renderCalculator("Reproduciendo la soluci\u00f3n...");
      if (!await playbackDelay(350)) return;
      let resultId;
      applyTileAction(() => { resultId = manualGame.chooseNumber(mapping.get(step.rightId)); }, "Reproduciendo la soluci\u00f3n...");
      mapping.set(step.id, resultId);
      if (!await playbackDelay(450)) return;
    }
    renderCalculator("Soluci\u00f3n introducida. Puedes deshacer cada operaci\u00f3n.");
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
    status.textContent = error.message;
    status.classList.add("error");
    return;
  }
  cancelAutomatic();
  targetCelebration.stop();
  manualGame = new NumbersGame.Game(puzzle.numbers, puzzle.target);
  document.getElementById("calculator-target").textContent = String(puzzle.target);
  document.querySelector("main").classList.add("manual");
  calculatorPanel.hidden = false;
  renderCalculator();
  document.getElementById("calculator-back").focus();
});

for (const button of operatorButtons) {
  button.addEventListener("click", () => calculatorAction(() => manualGame.chooseOperator(button.dataset.operator)));
}
document.getElementById("calculator-undo").addEventListener("click", () => calculatorAction(() => manualGame.undo()));
document.getElementById("calculator-back").addEventListener("click", () => {
  cancelAutomatic();
  targetCelebration.stop();
  calculatorPanel.hidden = true;
  document.querySelector("main").classList.remove("manual");
  document.getElementById("solve-myself").focus();
});
window.addEventListener("pagehide", () => { cancelAutomatic(); targetCelebration.stop(); });
