"use strict";

(() => {
  const raw = document.getElementById("letters");
  const entry = document.getElementById("letter-entry");
  const container = document.getElementById("letter-chips");
  const status = document.getElementById("letters-status");
  const chips = [...raw.value.replace(/[\s,]/g, "").normalize("NFC")];
  let composing = false;
  let hadError = false;

  function render() {
    container.replaceChildren();
    chips.forEach((letter, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "number-chip";
      button.textContent = `${letter.toUpperCase()} \u00d7`;
      button.setAttribute("aria-label", `Quitar letra ${index + 1}: ${letter}`);
      button.addEventListener("click", () => {
        chips.splice(index, 1);
        render();
        entry.focus();
      });
      container.append(button);
    });
    raw.value = chips.join("") + entry.value;
  }
  function commit() {
    if (composing) {
      raw.value = chips.join("") + entry.value;
      return;
    }
    let draft = entry.value.replace(/[\s,]/g, "");
    // A separately delivered combining accent belongs to the previous letter.
    const mergePrevious = /^\p{M}/u.test(draft) && chips.length > 0;
    if (mergePrevious) draft = chips.at(-1) + draft;
    draft = draft.normalize("NFC");
    if (draft && !/^[a-záéíóúüñ]+$/iu.test(draft)) {
      status.textContent = "Solo se admiten letras del espa\u00f1ol. Corrige la entrada; no se ha descartado ning\u00fan car\u00e1cter.";
      status.classList.add("error");
      hadError = true;
      raw.value = chips.join("") + entry.value;
      return;
    }
    if (mergePrevious) chips.pop();
    chips.push(...draft);
    entry.value = "";
    render();
    if (hadError) {
      status.textContent = "Entrada actualizada. Puedes continuar.";
      status.classList.remove("error");
      hadError = false;
    }
  }
  entry.addEventListener("compositionstart", () => { composing = true; });
  entry.addEventListener("compositionend", () => { composing = false; commit(); });
  entry.addEventListener("input", event => {
    if (!event.isComposing) commit();
  });
  entry.addEventListener("keydown", event => {
    if (!composing && event.key === "Backspace" && !entry.value && chips.length) {
      event.preventDefault();
      chips.pop();
      render();
    }
  });
  render();
})();
