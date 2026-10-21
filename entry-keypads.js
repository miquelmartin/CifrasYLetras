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
  const MAX_LETTERS = 12;
  const changed = () => document.dispatchEvent(new CustomEvent("puzzlechange"));
  const shortValue = value => value.length > 6 ? `${value.slice(0, 2)}\u2026${value.slice(-2)}` : value;

  function renderNumbers() {
    numberSlots.replaceChildren();
    const slots = numberEntry.slots;
    for (let index = 0; index < 6; index++) {
      const value = slots[index];
      const current = !numberEntry.ready && numberEntry.cursor === index;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `entry-slot ${current ? "current" : value ? "done" : "empty"}`;
      button.textContent = shortValue(value);
      button.style.fontSize = button.textContent.length > 3 ? ".7rem" : "1.1rem";
      button.title = value;
      button.disabled = index > numberEntry.numbers.length + (numberEntry.inserting ? 1 : 0);
      button.setAttribute("aria-label", `N\u00famero ${index + 1}: ${value || "vac\u00edo"}${current ? ", actual" : ""}`);
      button.addEventListener("click", () => { numberEntry.edit(index); renderNumbers(); });
      numberSlots.append(button);
    }
    const label = numberEntry.cursor === 6 ? "Objetivo" : `N\u00famero ${numberEntry.cursor + 1} de 6`;
    document.getElementById("number-entry-label").textContent = label;
    const display = document.getElementById("number-draft");
    const value = numberEntry.draft;
    display.textContent = value.length > 24 ? `${value.slice(0, 8)}\u2026${value.slice(-8)}` : value;
    display.style.fontSize = value.length > 8 ? "1.1rem" : "";
    display.title = value;
    display.setAttribute("aria-label", `${label}: ${value || "vac\u00edo"}`);
    rawNumbers.value = numberEntry.numbers.join(", ");
    target.value = numberEntry.target;
    numberForm.classList.toggle("number-ready", numberEntry.ready);
    document.getElementById("number-pad").hidden = numberEntry.ready;
    document.getElementById("number-actions").hidden = !numberEntry.ready;
    changed();
  }

  function clearLetterResults() {
    letterForm.classList.remove("letter-results");
    document.getElementById("letters-edit").hidden = true;
    document.getElementById("letters-result").hidden = true;
  }

  function renderLetters() {
    letterSlots.replaceChildren();
    letters.forEach((letter, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "entry-slot letter-slot";
      button.textContent = letter.toUpperCase();
      button.setAttribute("aria-label", `Quitar letra ${index + 1}: ${letter}`);
      button.addEventListener("click", () => { letters.splice(index, 1); clearLetterResults(); renderLetters(); });
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
    while (letterSlots.children.length < 6) {
      const empty = document.createElement("span");
      empty.className = "entry-slot empty";
      empty.setAttribute("aria-hidden", "true");
      letterSlots.append(empty);
    }
    rawLetters.value = letters.join("");
    letterSlots.setAttribute("aria-label", `${letters.length} letras: ${rawLetters.value}`);
    changed();
  }

  function numberKey(key) {
    if (document.getElementById("numbers-fieldset").disabled) return;
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
    clearLetterResults();
    if (letter === "Backspace") letters.pop();
    else letters.push(letter.normalize("NFC"));
    document.getElementById("letters-status").textContent = "";
    document.getElementById("letters-status").classList.remove("error");
    renderLetters();
  }
  for (const key of ["7", "8", "9", "4", "5", "6", "1", "2", "3", "Backspace", "0", "Enter"]) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.numberKey = key;
    button.textContent = key === "Backspace" ? "\u232b" : key;
    button.className = key === "Enter" ? "enter-key" : key === "Backspace" ? "delete-key" : "";
    button.setAttribute("aria-label", key === "Backspace" ? "Borrar d\u00edgito" : key === "Enter" ? "Confirmar n\u00famero" : key);
    button.addEventListener("click", () => numberKey(key));
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
  document.addEventListener("editnumberpuzzle", () => {
    numberEntry.edit(Math.min(6, numberEntry.numbers.length));
    renderNumbers();
  });
  document.getElementById("letters-edit").addEventListener("click", () => {
    clearLetterResults();
    document.getElementById("letters-status").textContent = "";
  });
  document.addEventListener("keydown", event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest('[role="tab"], summary, #letters-cancel, #letters-edit, #letters-solve, #edit-numbers, #solve-myself') ||
        !document.getElementById("calculator-panel").hidden) return;
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
        letterForm.requestSubmit();
      } else if (/^[\s,]$/.test(event.key)) event.preventDefault();
    }
  });
  document.addEventListener("resetpuzzle", ({ detail }) => {
    const status = document.getElementById(detail === "letras" ? "letters-status" : "status");
    status.textContent = "";
    status.classList.remove("error");
    if (detail === "letras") {
      letters = [];
      clearLetterResults();
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
    clearLetterResults();
    renderLetters();
  };
  window.getLetterChips = () => letters.join("");
  renderNumbers();
  renderLetters();
})();
