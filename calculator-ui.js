"use strict";

const calculatorPanel = document.getElementById("calculator-panel");
const calculatorStatus = document.getElementById("calculator-status");
const calculatorKeys = document.getElementById("calculator-keys");
const operatorButtons = [...document.querySelectorAll("[data-operator]")];
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
  const pending = state.pending === null ? "" : state.pending.toString();
  const current = state.current === null ? "" : state.current.toString();
  const symbol = { "+": "+", "-": "\u2212", "*": "\u00d7", "/": "\u00f7" }[state.operator] || "";
  document.getElementById("calculator-display").textContent = state.reversed ?
    `${pending} ${symbol} ${current}` : `${current || "Elige una cifra"} ${symbol} ${pending}`;
  for (const [index, button] of [...calculatorKeys.children].entries()) {
    button.disabled = state.used.includes(index) || state.pending !== null ||
      (state.current !== null && !state.operator);
    button.setAttribute("aria-label", `Cifra ${index + 1}: ${manualGame.numbers[index]}${state.used.includes(index) ? ", utilizada" : ""}`);
  }
  for (const button of operatorButtons) {
    button.disabled = state.current === null || state.pending !== null;
    button.setAttribute("aria-pressed", String(state.operator === button.dataset.operator));
  }
  document.getElementById("calculator-equals").disabled = state.pending === null;
  document.getElementById("calculator-reverse").disabled = state.pending === null;
  document.getElementById("calculator-undo").disabled = !manualGame.history.length;
  const steps = document.getElementById("calculator-steps");
  steps.replaceChildren();
  for (const step of state.steps) {
    const item = document.createElement("li");
    item.textContent = step;
    steps.append(item);
  }
  const reached = state.current === manualGame.target && state.pending === null;
  calculatorStatus.textContent = message || (reached ? "\u00a1Objetivo alcanzado!" :
    `Cifras usadas: ${state.used.length} de ${manualGame.numbers.length}. ${state.current === null ? "Elige una cifra para empezar." : state.pending !== null ? "Pulsa = para calcular." : state.operator ? "Elige otra cifra." : "Elige una operaci\u00f3n."}`);
  calculatorStatus.classList.toggle("error", error);
  calculatorStatus.classList.toggle("success", reached && !error);
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
document.getElementById("calculator-equals").addEventListener("click", () => calculatorAction(() => manualGame.execute()));
document.getElementById("calculator-reverse").addEventListener("click", () => calculatorAction(() => manualGame.reverse()));
document.getElementById("calculator-undo").addEventListener("click", () => calculatorAction(() => manualGame.undo()));
document.getElementById("calculator-reset").addEventListener("click", () => calculatorAction(() => manualGame.reset()));
document.getElementById("calculator-back").addEventListener("click", () => {
  calculatorPanel.hidden = true;
  document.querySelector("main").classList.remove("manual");
  document.getElementById("solve-myself").focus();
});
