"use strict";

const calculatorPanel = document.getElementById("calculator-panel");
const calculatorStatus = document.getElementById("calculator-status");
const calculatorKeys = document.getElementById("calculator-keys");
const operatorButtons = [...document.querySelectorAll("[data-operator]")];
const targetCelebration = new TargetCelebration(calculatorPanel);
let manualGame;
const numeralContext = document.createElement("canvas").getContext("2d");

function fitCalculatorNumerals() {
  if (calculatorPanel.hidden || !numeralContext) return;
  const display = document.getElementById("calculator-display");
  for (const element of [display, ...calculatorKeys.children]) {
    const styles = getComputedStyle(element);
    const maximum = element === display ? Math.min(64, Math.max(32, innerWidth * .095)) :
      Math.min(56, Math.max(32, innerWidth * .1));
    numeralContext.font = `${styles.fontWeight} ${maximum}px ${styles.fontFamily}`;
    const textWidth = numeralContext.measureText(element.textContent).width;
    const available = element.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
    element.style.fontSize = `${Math.max(16, Math.min(maximum, maximum * available / Math.max(1, textWidth)))}px`;
  }
}

new ResizeObserver(fitCalculatorNumerals).observe(calculatorPanel);

function renderCalculator(message, error = false) {
  const state = manualGame.state;
  const current = state.current === null ? "" : state.current.toString();
  const symbol = { "+": "+", "-": "\u2212", "*": "\u00d7", "/": "\u00f7" }[state.operator] || "";
  document.getElementById("calculator-display").textContent = `${current || "Elige una cifra"} ${symbol}`;
  for (const [index, button] of [...calculatorKeys.children].entries()) {
    const used = state.used.includes(index);
    button.disabled = used || (state.current !== null && !state.operator);
    button.classList.toggle("used", used);
    button.setAttribute("aria-label", `Cifra ${index + 1}: ${manualGame.numbers[index]}, ${used ? "utilizada" : "sin usar"}`);
    button.title = used ? "Cifra utilizada" : "Cifra sin usar";
  }
  for (const button of operatorButtons) {
    button.disabled = state.current === null;
    button.setAttribute("aria-pressed", String(state.operator === button.dataset.operator));
  }
  document.getElementById("calculator-undo").disabled = !manualGame.history.length;
  const steps = document.getElementById("calculator-steps");
  steps.replaceChildren();
  for (const step of state.steps) {
    const item = document.createElement("li");
    item.textContent = step;
    steps.append(item);
  }
  const reached = manualGame.distance === 0n;
  document.getElementById("calculator-distance").textContent = manualGame.distance === null ?
    "Distancia al objetivo: \u2014" : reached ? "Objetivo alcanzado" : `A ${manualGame.distance} del objetivo`;
  calculatorStatus.textContent = message || (reached ? "\u00a1Objetivo alcanzado!" :
    `Cifras usadas: ${state.used.length} de ${manualGame.numbers.length}. ${state.current === null ? "Elige una cifra para empezar." : state.operator ? "Elige otra cifra." : "Elige una operaci\u00f3n."}`);
  calculatorStatus.classList.toggle("error", error);
  calculatorStatus.classList.toggle("success", reached && !error);
  targetCelebration.update(reached);
  fitCalculatorNumerals();
}

function calculatorAction(action) {
  try {
    action();
    renderCalculator();
  } catch (error) {
    renderCalculator(error.message, true);
  }
}

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
  targetCelebration.stop();
  manualGame = new NumbersGame.Game(puzzle.numbers, puzzle.target);
  document.getElementById("calculator-target").textContent = puzzle.target.toString();
  calculatorKeys.replaceChildren();
  puzzle.numbers.forEach((number, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = number.toString();
    button.addEventListener("click", () => calculatorAction(() => manualGame.chooseNumber(index)));
    calculatorKeys.append(button);
  });
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
  targetCelebration.stop();
  calculatorPanel.hidden = true;
  document.querySelector("main").classList.remove("manual");
  document.getElementById("solve-myself").focus();
});
window.addEventListener("pagehide", () => targetCelebration.stop());
