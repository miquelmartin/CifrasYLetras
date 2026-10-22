"use strict";

(() => {
  const numberForm = document.getElementById("solver");
  const letterForm = document.getElementById("letters-solver");
  const rawNumbers = document.getElementById("numbers");
  const rawLetters = document.getElementById("letters");
  const target = document.getElementById("target");
  const numberSlots = document.getElementById("number-slots");
  const letterSlots = document.getElementById("letter-slots");
  let numberEntry = new NumberEntry();
  let letters = [];
  const MAX_LETTERS = 10;
  const changed = () => document.dispatchEvent(new CustomEvent("puzzlechange"));
  const shortValue = value => value.length > 6 ? `${value.slice(0, 2)}\u2026${value.slice(-2)}` : value;

  function renderNumbers() {
    numberSlots.replaceChildren();
    const slots = numberEntry.slots;
    for (let index = 0; index < 6; index++) {
      const value = slots[index];
      const current = !numberEntry.ready && numberEntry.cursor === index;
      const text = shortValue(value);
      const button = document.createElement("button");
      button.type = "button";
      const size = text.length >= 5 ? " len-long" : text.length === 4 ? " len-4" : text.length === 3 ? " len-3" : "";
      button.className = `entry-slot ${current ? "current" : value ? "done" : "empty"}${size}`;
      button.textContent = text;
      button.title = value;
      button.disabled = index > numberEntry.numbers.length + (numberEntry.inserting ? 1 : 0);
      button.setAttribute("aria-label", `N\u00famero ${index + 1}: ${value || "vac\u00edo"}${current ? ", actual" : ""}`);
      button.addEventListener("click", () => { numberEntry.edit(index); renderNumbers(); });
      numberSlots.append(button);
    }
    const targetSlot = document.getElementById("number-target-slot");
    const targetValue = document.getElementById("number-target-value");
    const targetCurrent = !numberEntry.ready && numberEntry.cursor === 6;
    const targetText = numberEntry.target;
    targetValue.textContent = targetText.length > 12 ? `${targetText.slice(0, 5)}\u2026${targetText.slice(-5)}` : targetText || (targetCurrent ? "" : "\u00b7\u00b7\u00b7");
    targetSlot.className = `entry-target ${targetCurrent ? "current" : targetText ? "done" : "empty"}${targetText.length > 6 ? " long" : ""}`;
    targetSlot.title = targetText;
    targetSlot.disabled = numberEntry.numbers.length < 6 || targetCurrent;
    targetSlot.setAttribute("aria-label", `Objetivo: ${targetText || "vac\u00edo"}${targetCurrent ? ", actual" : ""}`);
    rawNumbers.value = numberEntry.numbers.join(", ");
    target.value = numberEntry.target;
    numberForm.classList.toggle("number-ready", numberEntry.ready);
    document.getElementById("number-pad").hidden = numberEntry.ready;
    document.getElementById("number-actions").hidden = !numberEntry.ready;
    const enterKey = document.querySelector('[data-number-key="Enter"]');
    if (enterKey) {
      const random = numberEntry.isEmpty;
      enterKey.classList.toggle("random-key", random);
      if (random) enterKey.innerHTML = '<span class="dice" aria-hidden="true">\ud83c\udfb2</span>Al azar'; else enterKey.textContent = "Enter";
      enterKey.setAttribute("aria-label", random ? "Cifras y objetivo al azar" : "Confirmar n\u00famero");
    }
    changed();
  }

  function renderLetters() {
    letterSlots.replaceChildren();
    letters.forEach((letter, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "entry-slot letter-slot";
      button.textContent = letter.toUpperCase();
      button.setAttribute("aria-label", `Quitar letra ${index + 1}: ${letter}`);
      button.addEventListener("click", () => { letters.splice(index, 1); renderLetters(); });
      letterSlots.append(button);
    });
    const full = letters.length >= MAX_LETTERS;
    if (!full) {
      const next = document.createElement("span");
      next.className = "entry-slot current";
      next.setAttribute("aria-label", `Siguiente letra; ${letters.length} de ${MAX_LETTERS} letras introducidas`);
      letterSlots.append(next);
    }
    for (const button of document.querySelectorAll("[data-letter-key]")) {
      if (button.dataset.letterKey !== "Backspace") button.disabled = full;
    }
    while (letterSlots.children.length < MAX_LETTERS) {
      const empty = document.createElement("span");
      empty.className = "entry-slot empty";
      empty.setAttribute("aria-hidden", "true");
      letterSlots.append(empty);
    }
    const solveKey = document.getElementById("letters-solve");
    const random = letters.length === 0;
    // The tenth letter opens the solver; Enter only works with exactly ten letters, as in the TV show.
    solveKey.disabled = !random && letters.length !== MAX_LETTERS;
    solveKey.classList.toggle("random-key", random);
    if (random) solveKey.innerHTML = '<span class="dice" aria-hidden="true">\ud83c\udfb2</span> Al azar'; else solveKey.textContent = "Enter";
    solveKey.setAttribute("aria-label", random ? "Letras al azar" : "Resolver con estas diez letras");
    rawLetters.value = letters.join("");
    letterSlots.setAttribute("aria-label", `${letters.length} letras: ${rawLetters.value}`);
    changed();
  }

  function numberKey(key, fromPad = false) {
    if (document.getElementById("numbers-fieldset").disabled) return;
    if (fromPad && key === "Enter" && numberEntry.isEmpty) {
      const { numbers, target: objective } = NumberEntry.drawRandom();
      numberEntry = new NumberEntry(numbers.map(String), String(objective));
      document.getElementById("status").textContent = "";
      document.getElementById("status").classList.remove("error");
      renderNumbers();
      document.getElementById("solve-myself").click();
      return;
    }
    try {
      if (key === "Enter") numberEntry.enter();
      else if (key === "Backspace") numberEntry.backspace();
      else numberEntry.digit(key);
    } catch (error) {
      document.getElementById("status").textContent = error.message;
      document.getElementById("status").classList.add("error");
      return;
    }
    document.getElementById("status").textContent = "";
    document.getElementById("status").classList.remove("error");
    renderNumbers();
    if (key === "Enter" && numberEntry.ready) document.getElementById("solve-myself").click();
  }
  function letterKey(letter) {
    if (document.getElementById("letters-fieldset").disabled) return;
    if (letter !== "Backspace" && letters.length >= MAX_LETTERS) return;
    if (letter === "Backspace") letters.pop();
    else letters.push(letter.normalize("NFC"));
    document.getElementById("letters-status").textContent = "";
    document.getElementById("letters-status").classList.remove("error");
    renderLetters();
    if (letter !== "Backspace" && letters.length === MAX_LETTERS) openLettersPlay();
  }
  for (const key of ["7", "8", "9", "4", "5", "6", "1", "2", "3", "Backspace", "0", "Enter"]) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.numberKey = key;
    button.textContent = key === "Backspace" ? "\u232b" : key;
    button.className = key === "Enter" ? "enter-key" : key === "Backspace" ? "delete-key" : "";
    button.setAttribute("aria-label", key === "Backspace" ? "Borrar d\u00edgito" : key === "Enter" ? "Confirmar n\u00famero" : key);
    button.addEventListener("click", () => numberKey(key, true));
    document.getElementById("number-pad").append(button);
  }
  for (const letter of [..."ABCDEFGHIJKLMN\u00d1OPQRSTUVWXYZ", "Backspace"]) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.letterKey = letter;
    button.textContent = letter === "Backspace" ? "\u232b" : letter;
    if (letter === "Backspace") button.className = "delete-key";
    button.setAttribute("aria-label", letter === "Backspace" ? "Borrar letra" : letter);
    button.addEventListener("click", () => letterKey(letter));
    document.getElementById("letter-pad").insertBefore(button, document.getElementById("letters-solve"));
  }
  document.getElementById("letters-solve").addEventListener("click", event => {
    if (letters.length || document.getElementById("letters-fieldset").disabled) return;
    event.preventDefault();
    letters = drawRandomLetters();
    document.getElementById("letters-status").textContent = "";
    document.getElementById("letters-status").classList.remove("error");
    renderLetters();
    openLettersPlay();
  });
  letterForm.addEventListener("submit", event => {
    event.preventDefault();
    if (letters.length === MAX_LETTERS) openLettersPlay();
  });
  document.getElementById("number-target-slot").addEventListener("click", () => {
    if (numberEntry.numbers.length < 6) return;
    numberEntry.edit(6);
    renderNumbers();
  });
  document.addEventListener("editnumberpuzzle", () => {
    numberEntry.edit(Math.min(6, numberEntry.numbers.length));
    renderNumbers();
  });
  document.addEventListener("keydown", event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest('[role="tab"], summary, #letters-solve, #edit-numbers, #solve-myself') ||
        !document.getElementById("calculator-panel").hidden || !document.getElementById("letters-play").hidden) return;
    const numbersActive = document.getElementById("numbers-tab").getAttribute("aria-selected") === "true";
    if (numbersActive) {
      if (/^\d$/.test(event.key) || ["Backspace", "Enter"].includes(event.key)) {
        if (numberEntry.ready && event.key !== "Backspace") return;
        event.preventDefault();
        numberKey(event.key);
      }
    } else if (!document.getElementById("letters-fieldset").disabled) {
      if (/^[a-z\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc\u00f1]$/iu.test(event.key) || event.key === "Backspace") {
        event.preventDefault();
        letterKey(event.key);
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (letters.length === MAX_LETTERS) openLettersPlay();
      } else if (/^[\s,]$/.test(event.key)) event.preventDefault();
    }
  });
  document.addEventListener("resetpuzzle", ({ detail }) => {
    const status = document.getElementById(detail === "letras" ? "letters-status" : "status");
    status.textContent = "";
    status.classList.remove("error");
    if (detail === "letras") {
      letters = [];
      renderLetters();
    } else {
      target.value = "";
      numberEntry = new NumberEntry();
      renderNumbers();
    }
  });
  window.setNumberChips = values => {
    numberEntry = new NumberEntry(values, target.value);
    renderNumbers();
  };
  window.setLetterChips = value => {
    letters = [...value.normalize("NFC")].slice(0, MAX_LETTERS);
    renderLetters();
  };
  window.getLetterChips = () => letters.join("");
  renderNumbers();
  renderLetters();
})();
