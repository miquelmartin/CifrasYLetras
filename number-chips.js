"use strict";

(() => {
  const raw = document.getElementById("numbers");
  const entry = document.getElementById("number-entry");
  const container = document.getElementById("number-chips");
  const status = document.getElementById("status");
  const chips = raw.value.trim().split(/[\s,]+/).filter(Boolean);
  const integer = /^[+-]?\d+$/;
  let hadError = false;

  function sync() {
    raw.value = [...chips, entry.value].filter(Boolean).join(", ");
    document.dispatchEvent(new CustomEvent("puzzlechange"));
  }
  function render() {
    container.replaceChildren();
    chips.forEach((value, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "number-chip";
      button.textContent = `${value} \u00d7`;
      button.setAttribute("aria-label", `Quitar cifra ${index + 1}: ${value}`);
      button.addEventListener("click", () => {
        chips.splice(index, 1);
        render();
        entry.focus();
      });
      container.append(button);
    });
    sync();
  }
  entry.addEventListener("input", () => {
    const draft = entry.value;
    if (/[\s,]/.test(draft)) {
      const tokens = draft.trim().split(/[\s,]+/).filter(Boolean);
      if (tokens.some(token => !integer.test(token))) {
        status.textContent = "Cada ficha debe ser un entero. Corrige la entrada; no se ha descartado ninguna cifra.";
        status.classList.add("error");
        hadError = true;
        sync();
        return;
      }
      const endsWithDelimiter = /[\s,]$/.test(draft);
      const pending = endsWithDelimiter ? "" : tokens.pop() || "";
      chips.push(...tokens);
      entry.value = pending;
      render();
    }
    if (hadError) {
      status.textContent = "Entrada actualizada. Puedes continuar.";
      status.classList.remove("error");
      hadError = false;
    }
    sync();
  });
  entry.addEventListener("keydown", event => {
    if (event.key === "Backspace" && !entry.value && chips.length) {
      event.preventDefault();
      entry.value = chips.pop();
      render();
    }
  });
  window.setNumberChips = values => {
    chips.splice(0, chips.length, ...values);
    entry.value = "";
    hadError = false;
    render();
  };
  render();
})();
