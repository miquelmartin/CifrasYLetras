"use strict";

const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(selected) {
  for (const tab of tabs) {
    const active = tab === selected;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute("aria-controls")).hidden = !active;
  }
  document.dispatchEvent(new CustomEvent("puzzlechange"));
}
for (const tab of tabs) {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", event => {
    let index = tabs.indexOf(tab);
    if (event.key === "ArrowRight") index = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") index = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") index = 0;
    else if (event.key === "End") index = tabs.length - 1;
    else return;
    event.preventDefault();
    selectTab(tabs[index]);
    tabs[index].focus();
  });
}

const lettersForm = document.getElementById("letters-solver");
const lettersInput = document.getElementById("letters");
const lettersSolve = document.getElementById("letters-solve");
const lettersCancel = document.getElementById("letters-cancel");
const lettersStatus = document.getElementById("letters-status");
const lettersResult = document.getElementById("letters-result");
let lettersWorker = null;

function setLettersStatus(message, error = false) {
  lettersStatus.textContent = message;
  lettersStatus.classList.toggle("error", error);
}

function lettersIdle() {
  lettersInput.disabled = false;
  document.getElementById("letters-fieldset").disabled = false;
  lettersSolve.disabled = false;
  lettersCancel.hidden = true;
  lettersForm.classList.remove("letters-busy");
}

function stopLettersWorker() {
  if (lettersWorker) lettersWorker.terminate();
  lettersWorker = null;
  lettersIdle();
}

lettersForm.addEventListener("submit", event => {
  event.preventDefault();
  lettersResult.hidden = true;
  lettersForm.classList.remove("letter-results");
  document.getElementById("letters-edit").hidden = true;
  let letters;
  try {
    letters = LettersSolver.parseLetters(lettersInput.value);
  } catch (error) {
    setLettersStatus(error.message, true);
    return;
  }
  lettersInput.disabled = true;
  document.getElementById("letters-fieldset").disabled = true;
  lettersSolve.disabled = true;
  lettersCancel.hidden = false;
  lettersForm.classList.add("letters-busy");
  setLettersStatus("Buscando en el diccionario ortogr\u00e1fico...");
  try {
    if (!lettersWorker) {
      lettersWorker = new Worker("letters-worker.js");
      lettersWorker.onmessage = ({ data }) => {
        if (data.type === "loading") {
          setLettersStatus("Cargando el diccionario ortogr\u00e1fico RLA-ES...");
        } else if (data.type === "progress") {
          setLettersStatus(`Buscando... ${Math.round(data.examined / data.total * 100)} % de las entradas revisadas.`);
        } else if (data.type === "error") {
          stopLettersWorker();
          setLettersStatus(`Error en la b\u00fasqueda: ${data.message} Comprueba la conexi\u00f3n e int\u00e9ntalo de nuevo.`, true);
        } else if (data.type === "done") {
          lettersIdle();
          const { matches, length, supplied } = data.result;
          const list = document.getElementById("letters-words");
          list.replaceChildren();
          if (!matches.length) {
            setLettersStatus("No se han encontrado candidatas en este diccionario ortogr\u00e1fico. Esto no demuestra que no exista ninguna palabra real en espa\u00f1ol.");
            return;
          }
          document.getElementById("letters-summary").textContent =
            `Letras utilizadas: ${length.toLocaleString("es-ES")} de ${supplied.toLocaleString("es-ES")}. Candidatas de longitud m\u00e1xima: ${matches.length.toLocaleString("es-ES")}.`;
          for (const { word, lemma } of matches) {
            const item = document.createElement("li");
            const text = document.createElement("strong");
            text.textContent = word;
            const link = document.createElement("a");
            link.href = `https://dle.rae.es/${encodeURIComponent(lemma)}`;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.setAttribute("aria-label", `Consultar \u00ab${word}\u00bb en el DLE (lema: ${lemma})`);
            link.title = `Consultar \u00ab${word}\u00bb en el DLE (lema: ${lemma})`;
            const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            icon.setAttribute("viewBox", "0 0 24 24");
            icon.setAttribute("aria-hidden", "true");
            icon.setAttribute("fill", "none");
            icon.setAttribute("stroke", "currentColor");
            icon.setAttribute("stroke-width", "1.8");
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", "M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Zm0 0v15");
            icon.append(path);
            link.append(icon);
            link.lang = "es";
            item.append(text, link);
            list.append(item);
          }
          lettersResult.hidden = false;
          lettersForm.classList.add("letter-results");
          document.getElementById("letters-edit").hidden = false;
          setLettersStatus("B\u00fasqueda completada. Estas son las candidatas m\u00e1s largas del diccionario incluido y sus reglas de afijos.");
        }
      };
      lettersWorker.onerror = event => {
        event.preventDefault();
        console.error("Error en el proceso de letras:", event.message);
        stopLettersWorker();
        setLettersStatus("No se pudo cargar o ejecutar el proceso de letras. Abre el sitio web en lugar del archivo local e int\u00e9ntalo de nuevo.", true);
      };
    }
    lettersWorker.postMessage({ letters });
  } catch (error) {
    console.error("Error al iniciar el proceso de letras:", error);
    stopLettersWorker();
    setLettersStatus("No se pudo iniciar la b\u00fasqueda. Comprueba que tu navegador permite los procesos en segundo plano.", true);
  }
});

lettersCancel.addEventListener("click", () => {
  stopLettersWorker();
  setLettersStatus("B\u00fasqueda cancelada. No se ha revisado todo el diccionario; puede haber candidatas m\u00e1s largas.");
});
window.addEventListener("pagehide", stopLettersWorker);
