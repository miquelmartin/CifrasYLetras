"use strict";

(() => {
  let restoring = false;
  const numbers = document.getElementById("numbers");
  const target = document.getElementById("target");
  const calculator = document.getElementById("calculator-panel");
  const warning = "Se han omitido datos no v\u00e1lidos de la URL. Revisa el reto.";
  const lettersWarning = "Se admiten exactamente 10 letras; la URL tra\u00eda m\u00e1s y se han recortado.";

  function currentPuzzle() {
    const params = new URLSearchParams();
    params.set("modo", document.getElementById("letters-tab").getAttribute("aria-selected") === "true" ? "letras" : "cifras");
    params.set("n", numbers.value);
    params.set("obj", target.value);
    params.set("l", getLetterChips());
    const puzzle = PuzzleUrl.decode(params.toString());
    puzzle.manual = !calculator.hidden;
    return puzzle;
  }

  function write(push = false) {
    if (restoring) return;
    const puzzle = currentPuzzle();
    const previous = history.state && typeof history.state === "object" ? history.state : {};
    const state = { ...previous, puzzleView: puzzle.manual ? "manual" : "entrada" };
    if (!puzzle.manual) delete state.entryBelow;
    const url = new URL(location.href);
    url.search = PuzzleUrl.encode(puzzle, url.search);
    try {
      if (push) {
        // Leave an empty Cifras entry underneath Resolver yo, so Back (browser, Android or Volver) starts afresh.
        const empty = new URL(location.href);
        empty.search = PuzzleUrl.encode({ mode: "cifras", numbers: [], target: "", letters: "", manual: false }, empty.search);
        history.replaceState({ puzzleView: "entrada" }, "", empty);
        history.pushState({ ...state, entryBelow: true }, "", url);
      } else if (url.href !== location.href || previous.puzzleView !== state.puzzleView) history.replaceState(state, "", url);
    } catch (error) {
      console.error("No se pudo guardar el reto en la direcci\u00f3n:", error);
      const status = document.getElementById(puzzle.manual ? "calculator-status" : puzzle.mode === "letras" ? "letters-status" : "status");
      status.textContent = "No se pudo actualizar la direcci\u00f3n. El reto sigue disponible en esta p\u00e1gina, pero no se guardar\u00e1 al recargar.";
      status.classList.add("error");
    }
  }

  function restore(initial = false) {
    const puzzle = PuzzleUrl.decode(location.search);
    restoring = true;
    stopLettersWorker();
    if (!calculator.hidden) closeCalculator();
    target.value = puzzle.target;
    setNumberChips(puzzle.numbers);
    setLetterChips(puzzle.letters);
    selectTab(document.getElementById(puzzle.mode === "letras" ? "letters-tab" : "numbers-tab"));
    document.getElementById("letters-result").hidden = true;
    for (const id of ["status", "letters-status"]) {
      const status = document.getElementById(id);
      status.textContent = "";
      status.classList.remove("error");
    }
    const complete = puzzle.mode === "cifras" && puzzle.numbers.length === 6 && puzzle.target !== "";
    if (puzzle.manual || (initial === true && complete)) document.getElementById("solve-myself").click();
    if (puzzle.invalid) {
      const status = document.getElementById(puzzle.manual ? "calculator-status" : puzzle.mode === "letras" ? "letters-status" : "status");
      status.textContent = puzzle.mode === "letras" && [...(new URLSearchParams(location.search).get("l") || "").replace(/[\s,]/gu, "")].length > 10 ? lettersWarning : warning;
      status.classList.add("error");
    }
    restoring = false;
    const pushedEntry = history.state && typeof history.state === "object" && history.state.entryBelow;
    write(initial === true && !calculator.hidden && !pushedEntry);
  }

  let closedPushed = false;
  let ignoreNextPop = false;
  document.addEventListener("puzzlechange", () => write());
  target.addEventListener("input", () => write());
  document.addEventListener("calculatorviewchange", ({ detail }) => {
    if (restoring) return;
    if (!detail.open) closedPushed = Boolean(history.state && history.state.entryBelow);
    write(detail.open);
  });
  // Volver has already reset the page; step back onto the empty entry so history does not keep a duplicate.
  document.addEventListener("calculatorback", () => {
    if (!closedPushed) return;
    closedPushed = false;
    ignoreNextPop = true;
    history.back();
  });
  window.addEventListener("popstate", () => {
    if (ignoreNextPop) {
      ignoreNextPop = false;
      write();
    } else restore();
  });
  restore(true);
})();
