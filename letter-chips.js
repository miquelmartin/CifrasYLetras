"use strict";

(() => {
  const raw = document.getElementById("letters");
  const entry = document.getElementById("letter-entry");
  const container = document.getElementById("letter-chips");
  const status = document.getElementById("letters-status");
  const chips = [...raw.value.replace(/[\s,]/g, "").normalize("NFC")];
  let composing = false;
  let hadError = false;
  let lastCommitted = "";
  let compositionTail = null;

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
    if (draft) lastCommitted = draft;
    entry.value = "";
    render();
    if (hadError) {
      status.textContent = "Entrada actualizada. Puedes continuar.";
      status.classList.remove("error");
      hadError = false;
    }
  }
  entry.addEventListener("beforeinput", event => {
    if (composing || event.isComposing || hadError) return;
    const separator = typeof event.data === "string" && /^[\s,]+$/u.test(event.data);
    const replay = event.inputType === "insertReplacementText" && typeof event.data === "string" &&
      /[\s,]$/u.test(event.data) && event.data.replace(/[\s,]/gu, "").normalize("NFC") === lastCommitted;
    if (separator || replay) {
      event.preventDefault();
      entry.value = "";
      raw.value = chips.join("");
    }
  });
  entry.addEventListener("compositionstart", () => { composing = true; compositionTail = null; });
  entry.addEventListener("compositionend", () => {
    composing = false;
    compositionTail = entry.value.normalize("NFC");
    commit();
  });
  entry.addEventListener("input", event => {
    if (event.isComposing || composing) return;
    // Some IMEs replay their committed buffer in the final input or space event.
    const finalComposition = compositionTail !== null &&
      ["insertCompositionText", "insertFromComposition"].includes(event.inputType) &&
      entry.value.normalize("NFC") === compositionTail;
    const separator = typeof event.data === "string" && /^[\s,]+$/u.test(event.data);
    const replay = event.inputType === "insertReplacementText" && typeof event.data === "string" &&
      /[\s,]$/u.test(event.data) && event.data.replace(/[\s,]/gu, "").normalize("NFC") === lastCommitted;
    compositionTail = null;
    if (!hadError && (finalComposition || separator || replay)) {
      entry.value = "";
      raw.value = chips.join("");
      return;
    }
    commit();
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
