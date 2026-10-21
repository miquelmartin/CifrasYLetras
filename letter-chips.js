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
  let compositionStart = 0;
  const normalizeDraft = value => value.replace(/[\s,]/gu, "")
    .replace(/^\u00b4([aeiou])/iu, "$1\u0301")
    .replace(/^\u00a8(u)/iu, "$1\u0308")
    .replace(/^~(n)/iu, "$1\u0303").normalize("NFC");

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
    document.dispatchEvent(new CustomEvent("puzzlechange"));
  }
  function commit() {
    let draft = normalizeDraft(entry.value);
    if (/^[\u00b4~\u00a8]$/u.test(draft)) {
      raw.value = chips.join("") + entry.value;
      return;
    }
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
  function updateComposition(value) {
    const draft = normalizeDraft(value);
    if (/^[\u00b4`~\u00a8\u0300-\u036f]*$/u.test(draft) && draft) {
      entry.value = value;
      raw.value = chips.join("") + value;
      return;
    }
    if (draft && !/^[a-záéíóúüñ]+$/iu.test(draft)) {
      entry.value = value;
      commit();
      return;
    }
    chips.splice(compositionStart, chips.length - compositionStart, ...draft);
    lastCommitted = draft;
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
  entry.addEventListener("compositionstart", () => {
    composing = true;
    compositionStart = chips.length;
    compositionTail = null;
  });
  entry.addEventListener("compositionend", event => {
    composing = false;
    const value = [event.data, entry.value, chips.slice(compositionStart).join("")]
      .find(text => typeof text === "string" && normalizeDraft(text)) || "";
    compositionTail = value.replace(/[\s,]/gu, "").normalize("NFC");
    updateComposition(value);
  });
  entry.addEventListener("input", event => {
    if (event.isComposing || composing) {
      if (typeof event.data === "string" && /^[\s,]+$/u.test(event.data)) {
        entry.value = "";
        raw.value = chips.join("");
        return;
      }
      updateComposition(typeof event.data === "string" ? event.data : entry.value);
      return;
    }
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
  window.getLetterChips = () => chips.join("");
  window.setLetterChips = value => {
    chips.splice(0, chips.length, ...value.normalize("NFC"));
    entry.value = "";
    composing = false;
    hadError = false;
    lastCommitted = "";
    compositionTail = null;
    compositionStart = 0;
    render();
  };
  render();
})();
