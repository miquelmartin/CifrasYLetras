"use strict";

(() => {
  let restoring = false;
  const numbers = document.getElementById("numbers");
  const target = document.getElementById("target");
  const calculator = document.getElementById("calculator-panel");
  const warning = "Se han omitido datos no v\u00e1lidos de la URL. Revisa el reto.";

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
    const url = new URL(location.href);
    url.search = PuzzleUrl.encode(puzzle, url.search);
    try {
      if (push) history.pushState(state, "", url);
      else if (url.href !== location.href || previous.puzzleView !== state.puzzleView) history.replaceState(state, "", url);
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
    if (!calculator.hidden) document.getElementById("calculator-back").click();
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
      status.textContent = warning;
      status.classList.add("error");
    }
    restoring = false;
    write();
  }

  document.addEventListener("puzzlechange", () => write());
  target.addEventListener("input", () => write());
  document.addEventListener("calculatorviewchange", ({ detail }) => {
    if (restoring) return;
    write(detail.open);
  });
  window.addEventListener("popstate", () => restore());
  restore(true);
})();
