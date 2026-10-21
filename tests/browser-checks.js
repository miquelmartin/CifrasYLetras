// Run in a browser: import("./tests/browser-checks.js").then(module => module.run()).
export async function run() {
  const results = [];
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const wait = async predicate => {
    const deadline = Date.now() + 20000;
    while (!predicate()) {
      if (Date.now() > deadline) throw new Error("Tiempo agotado");
      await new Promise(resolve => setTimeout(resolve, 30));
    }
  };
  for (const [width, height] of [[360, 640], [390, 844], [1280, 720]]) {
    const frame = document.createElement("iframe");
    frame.style.cssText = `position:fixed;left:0;top:0;border:0;width:${width}px;height:${height}px;z-index:1000;background:#10141e`;
    frame.src = new URL(`../index.html?browser-check=${Date.now()}`, import.meta.url).href;
    document.body.append(frame);
    try {
      await new Promise((resolve, reject) => { frame.onload = resolve; frame.onerror = reject; });
      const win = frame.contentWindow;
      const doc = frame.contentDocument;
      const byId = id => doc.getElementById(id);
      const input = (id, value) => {
        byId(id).value = value;
        byId(id).dispatchEvent(new win.InputEvent("input", { bubbles: true }));
      };
      const clear = id => { while (byId(id).firstElementChild) byId(id).firstElementChild.click(); };
      const snapshot = name => {
        const data = {
          viewport: [win.innerWidth, win.innerHeight],
          document: [doc.documentElement.scrollWidth, doc.documentElement.scrollHeight],
          name
        };
        assert(data.viewport[0] === width && data.viewport[1] === height, "Viewport incorrecto");
        assert(data.document[0] <= width && data.document[1] <= height, `${name}: desbordamiento ${JSON.stringify(data)}`);
        results.push(data);
      };
      const reachEnd = id => {
        const element = byId(id);
        element.scrollTop = element.scrollHeight;
        assert(element.scrollTop + element.clientHeight >= element.scrollHeight - 1, `${id}: final inaccesible`);
      };
      const usableResults = id => {
        const bounds = byId(id).getBoundingClientRect();
        assert(bounds.height >= 80 && bounds.bottom <= height, `${id}: resultados sin espacio visible`);
      };
      const contrast = element => {
        const styles = win.getComputedStyle(element);
        const luminance = color => {
          const channels = color.match(/[\d.]+/g).slice(0, 3).map(value => {
            const channel = Number(value) / 255;
            return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
          });
          return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
        };
        const foreground = luminance(styles.color);
        const background = luminance(styles.backgroundColor);
        assert((Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05) >= 4.5,
          `Contraste insuficiente: ${element.id || element.textContent}`);
      };
      snapshot("Cifras inicial");
      assert(win.getComputedStyle(doc.documentElement).colorScheme === "light", "Debe usarse el tema claro");
      contrast(byId("solve"));
      contrast(byId("numbers-tab"));
      assert(byId("number-chips").children.length === 0 && byId("numbers").value === "" && byId("target").value === "", "Cifras debe empezar vacio");
      input("number-entry", " , , ");
      assert(byId("number-chips").children.length === 0 && byId("numbers").value === "", "Los separadores crean una ficha fantasma");
      input("number-entry", "0 ");
      assert(byId("number-chips").children.length === 1 && byId("numbers").value === "0", "El cero debe ser una ficha real");
      clear("number-chips");
      assert(byId("number-chips").children.length === 0 && byId("numbers").value === "", "Quitar ultima cifra crea ficha fantasma");
      input("number-entry", "0 ");
      byId("number-entry").dispatchEvent(new win.KeyboardEvent("keydown", { key: "Backspace", bubbles: true }));
      input("number-entry", "");
      assert(byId("number-chips").children.length === 0 && byId("numbers").value === "", "Borrar ultima cifra crea ficha fantasma");
      byId("solver").requestSubmit();
      assert(byId("status").classList.contains("error"), "Falta validacion de cifras vacias");
      byId("solve-myself").click();
      assert(byId("calculator-panel").hidden, "No debe abrir calculadora vacia");
      byId("letters-tab").click();
      assert(byId("letter-chips").children.length === 0 && byId("letters").value === "", "Letras debe empezar vacio");
      input("letter-entry", " , , ");
      assert(byId("letter-chips").children.length === 0 && byId("letters").value === "", "Separadores crean letra fantasma");
      byId("letters-solver").requestSubmit();
      assert(byId("letters-status").classList.contains("error"), "Falta validacion de letras vacias");
      byId("numbers-tab").click();
      input("number-entry", "25 50 3 6 7 8 ");
      byId("number-entry").dispatchEvent(new win.KeyboardEvent("keydown", { key: "Backspace", bubbles: true }));
      assert(byId("number-entry").value === "8" && byId("number-chips").children.length === 5, "Retroceso no permite corregir la ficha");
      input("number-entry", "8 ");
      clear("number-chips");
      input("number-entry", "-5 ");
      input("number-entry", "2,");
      input("number-entry", "2 0,6,900719925474099312345");
      assert(byId("number-chips").children.length === 5, "Separadores o pegado incorrectos");
      assert(byId("numbers").value.endsWith("900719925474099312345"), "Se pierde la cifra pendiente");
      byId("target").value = "900719925474099312345";
      byId("solver").requestSubmit();
      await wait(() => !byId("solve").disabled);
      assert(!byId("result").hidden, "El solver no incluye la ultima cifra sin separador");
      assert(byId("solution-inputs").children.length === 6 &&
        byId("solution-inputs").querySelectorAll(".used").length === 1, "Falta conjunto original con uso de solucion");
      byId("solve-myself").click();
      assert(byId("calculator-keys").children[5].textContent === "900719925474099312345", "Resolver yo pierde la cifra pendiente");
      byId("calculator-back").click();
      input("number-entry", "x,");
      assert(byId("status").classList.contains("error"), "No se notifica entrada invalida");
      input("number-entry", "");
      clear("number-chips");
      input("number-entry", "1 1 1 1 1 1 1 1 1 ");
      byId("target").value = "9";
      byId("solver").requestSubmit();
      await wait(() => !byId("solve").disabled);
      assert(byId("steps").children.length === 8, "Se esperaban ocho operaciones");
      snapshot("Cifras ocho operaciones");
      usableResults("result");
      reachEnd("steps");
      byId("solve-myself").click();
      const nineKeys = [...byId("calculator-keys").children];
      nineKeys[0].click();
      for (let index = 1; index < nineKeys.length; index++) {
        doc.querySelector('[data-operator="+"]').click();
        nineKeys[index].click();
      }
      snapshot("Calculadora ocho operaciones");
      assert(byId("calculator-steps").children.length === 8, "Calculadora pierde pasos");
      assert(parseFloat(win.getComputedStyle(nineKeys[0]).fontSize) >= 28, "Numeros demasiado pequenos");
      for (const button of doc.querySelectorAll("[data-operator]")) {
        const bounds = button.getBoundingClientRect();
        assert(Math.abs(bounds.width - bounds.height) < 1 && bounds.width >= 64, "Operaciones deben ser cuadrados grandes");
        assert(win.getComputedStyle(button).backgroundColor === "rgb(40, 116, 200)", "Operaciones deben ser azules");
      }
      assert(byId("calculator-undo").textContent.trim() === "←" && byId("calculator-undo").getAttribute("aria-label") === "Deshacer", "Deshacer debe ser una flecha accesible");
      assert(!byId("calculator-reset") && !byId("calculator-reverse"), "Sobran controles eliminados");
      assert(!byId("calculator-equals"), "No debe requerir igual");
      reachEnd("calculator-steps");
      byId("calculator-back").click();
      byId("solver").querySelector("details").open = true;
      snapshot("Cifras ayuda abierta");
      byId("solver").querySelector("details").open = false;
      byId("letters-tab").click();
      snapshot("Letras inicial");
      clear("letter-chips");
      byId("letter-entry").value = "n";
      byId("letter-entry").dispatchEvent(new win.InputEvent("input", { inputType: "insertText", data: "n", bubbles: true }));
      assert(byId("letter-chips").children.length === 1, "La letra no crea ficha inmediatamente");
      for (const separator of [" ", " ", ","]) {
        byId("letter-entry").value = "n" + separator;
        byId("letter-entry").dispatchEvent(new win.InputEvent("input", { inputType: "insertText", data: separator, bubbles: true }));
        assert(byId("letters").value === "n", "Espacios tras una letra la duplican");
      }
      input("letter-entry", "\u0303");
      assert(byId("letters").value === "ñ", "La tilde combinante no se une a n");
      clear("letter-chips");
      const letterEntry = byId("letter-entry");
      letterEntry.dispatchEvent(new win.CompositionEvent("compositionstart"));
      input("letter-entry", "n");
      assert(byId("letters").value === "n", "La composicion debe crear ficha de inmediato");
      letterEntry.value = "n\u0303";
      letterEntry.dispatchEvent(new win.CompositionEvent("compositionend"));
      assert(byId("letters").value === "ñ", "Composicion de ñ incorrecta");
      letterEntry.value = "n\u0303";
      letterEntry.dispatchEvent(new win.InputEvent("input", { inputType: "insertCompositionText", data: "ñ", bubbles: true }));
      assert(byId("letters").value === "ñ", "Se repite el cierre de composicion");
      for (const separator of [" ", "  ", ","]) {
        const before = new win.InputEvent("beforeinput", { inputType: "insertText", data: separator, cancelable: true, bubbles: true });
        letterEntry.dispatchEvent(before);
        assert(before.defaultPrevented && byId("letters").value === "ñ", "Separador no es una operacion nula");
      }
      letterEntry.value = "ñ ";
      letterEntry.dispatchEvent(new win.InputEvent("input", { inputType: "insertText", data: " ", bubbles: true }));
      assert(byId("letters").value === "ñ", "Espacio movil repite letra anterior");
      letterEntry.value = "ñ ";
      letterEntry.dispatchEvent(new win.InputEvent("input", { inputType: "insertReplacementText", data: "ñ ", bubbles: true }));
      assert(byId("letters").value === "ñ", "Reemplazo movil repite letra anterior");
      const replacement = new win.InputEvent("beforeinput", { inputType: "insertReplacementText", data: "ñ ", cancelable: true, bubbles: true });
      letterEntry.dispatchEvent(replacement);
      assert(replacement.defaultPrevented, "No se bloquea reemplazo repetido");
      input("letter-entry", "ñ");
      assert(byId("letters").value === "ññ", "Se pierde repeticion deliberada");
      byId("letter-entry").dispatchEvent(new win.KeyboardEvent("keydown", { key: "Backspace", bubbles: true }));
      clear("letter-chips");
      letterEntry.dispatchEvent(new win.CompositionEvent("compositionstart"));
      for (const value of ["c", "ca", "cas", "casa", "casaa", "casa"]) {
        letterEntry.value = value;
        letterEntry.dispatchEvent(new win.InputEvent("input", { inputType: "insertCompositionText", data: value, isComposing: true, bubbles: true }));
        assert(byId("letters").value === value && byId("letter-chips").children.length === value.length, "Gboard no crea fichas letra a letra");
      }
      letterEntry.value = "casa ";
      letterEntry.dispatchEvent(new win.InputEvent("input", { inputType: "insertCompositionText", data: " ", isComposing: true, bubbles: true }));
      assert(byId("letters").value === "casa", "Separador dentro de composicion pierde letras");
      letterEntry.dispatchEvent(new win.CompositionEvent("compositionend", { data: "casa" }));
      letterEntry.value = "casa ";
      letterEntry.dispatchEvent(new win.InputEvent("input", { inputType: "insertText", data: " ", bubbles: true }));
      assert(byId("letters").value === "casa", "Espacio pierde o repite composicion Android");
      clear("letter-chips");
      letterEntry.dispatchEvent(new win.CompositionEvent("compositionstart"));
      letterEntry.value = "\u00b4";
      letterEntry.dispatchEvent(new win.InputEvent("input", { inputType: "insertCompositionText", data: "\u00b4", isComposing: true, bubbles: true }));
      assert(byId("letter-chips").children.length === 0, "Se confirma una tecla muerta");
      letterEntry.value = "á";
      letterEntry.dispatchEvent(new win.InputEvent("input", { inputType: "insertCompositionText", data: "á", isComposing: true, bubbles: true }));
      assert(byId("letters").value === "á", "Acento completo no crea ficha inmediatamente");
      letterEntry.dispatchEvent(new win.CompositionEvent("compositionend", { data: "á" }));
      clear("letter-chips");
      input("letter-entry", "\u00b4");
      assert(byId("letter-chips").children.length === 0, "Tecla muerta de escritorio confirmada");
      input("letter-entry", "\u00b4a");
      assert(byId("letters").value === "á", "No se combina tecla muerta de escritorio");
      clear("letter-chips");
      input("letter-entry", "ñ");
      input("letter-entry", " A\u0301, ü A ");
      assert(byId("letters").value === "ñÁüA", "Acentos, repeticiones o separadores incorrectos");
      byId("letter-entry").dispatchEvent(new win.KeyboardEvent("keydown", { key: "Backspace", bubbles: true }));
      assert(byId("letters").value === "ñÁü", "Retroceso no elimina la ultima letra");
      input("letter-entry", "1");
      assert(byId("letters-status").classList.contains("error"), "No se rechaza cifra en letras");
      byId("letters-solver").requestSubmit();
      assert(byId("letters-status").classList.contains("error"), "Entrada invalida aceptada");
      input("letter-entry", "");
      clear("letter-chips");
      input("letter-entry", "c a m i o n e s");
      byId("letters-solver").requestSubmit();
      await wait(() => !byId("letters-solve").disabled);
      assert(byId("letters-words").children.length >= 8, "Faltan empates");
      snapshot("Letras muchos empates");
      usableResults("letters-result");
      reachEnd("letters-words");
      byId("letters-solver").querySelector("details").open = true;
      snapshot("Letras ayuda abierta");
      byId("letters-solver").querySelector("details").open = false;
      byId("numbers-tab").click();
      clear("number-chips");
      input("number-entry", "2 2 0 5 3 6 ");
      byId("target").value = "4";
      byId("solve-myself").click();
      const keys = [...byId("calculator-keys").children];
      const op = symbol => doc.querySelector(`[data-operator="${symbol}"]`).click();
      keys[0].click();
      contrast(keys[0]);
      contrast(keys[1]);
      assert(keys[0].disabled && keys[1].disabled, "Tras elegir cifra se espera operacion");
      assert(keys[0].classList.contains("used") && !keys[1].classList.contains("used"), "Se confunde usada con espera de operador");
      assert(keys.every(key => key.getBoundingClientRect().height > 0 && win.getComputedStyle(key).visibility === "visible"), "Se ocultan cifras al elegir operador");
      op("+");
      assert(!keys[1].disabled && keys[0].disabled, "No se distingue la cifra duplicada");
      keys[1].click();
      assert(keys[0].classList.contains("used") && keys[1].classList.contains("used"), "Duplicados usados sin marcas");
      assert(byId("calculator-status").textContent.includes("Objetivo alcanzado"), "No reconoce objetivo");
      assert(byId("calculator-distance").textContent === "Objetivo alcanzado", "Distancia cero incorrecta");
      byId("calculator-undo").click();
      assert(!keys[1].disabled && keys[0].disabled, "Deshacer no restaura cifra duplicada");
      assert(!keys[1].classList.contains("used") && keys[0].classList.contains("used"), "Deshacer no restaura marcas de uso");
      assert(byId("calculator-distance").textContent === "A 2 del objetivo", "Distancia tras deshacer incorrecta");
      byId("calculator-undo").click();
      byId("calculator-undo").click();
      assert(keys.every(key => !key.disabled), "Deshacer repetido no restaura inicio");
      assert(byId("calculator-distance").textContent.endsWith("—"), "Falta distancia neutra");
      keys[3].click(); op("/"); keys[0].click();
      assert(byId("calculator-status").textContent.includes("sin fracciones"), "Division fraccionaria aceptada");
      assert(!keys[0].disabled && byId("calculator-display").textContent.trim() === "5 ÷", "Division invalida consume cifra o altera resultado");
      keys[2].click();
      assert(byId("calculator-status").textContent.includes("entre cero"), "Division entre cero aceptada");
      assert(!keys[2].disabled, "Division entre cero consume cifra");
      while (!byId("calculator-undo").disabled) byId("calculator-undo").click();
      assert(keys.every(key => !key.disabled), "Deshacer no restaura cifras");
      snapshot("Calculadora");
      byId("calculator-back").click();
      assert(byId("target").value === "4" && byId("numbers").value === "2, 2, 0, 5, 3, 6", "Volver pierde el reto");
      clear("number-chips");
      input("number-entry", "5 3 0 2 2 6");
      byId("target").value = "21";
      byId("solve-myself").click();
      const immediateKeys = [...byId("calculator-keys").children];
      assert(immediateKeys.length === 6 && immediateKeys[5].textContent === "6", "Falta ultima cifra sin espacio");
      immediateKeys[0].click(); op("*"); immediateKeys[1].click();
      assert(byId("calculator-display").textContent.trim() === "15", "5 por 3 no calcula inmediatamente");
      assert(byId("calculator-distance").textContent === "A 6 del objetivo", "Distancia bajo objetivo incorrecta");
      op("+"); immediateKeys[5].click();
      assert(byId("calculator-display").textContent.trim() === "21", "15 mas 6 no calcula inmediatamente");
      const fireworks = doc.querySelector(".celebration");
      if (!win.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        assert(fireworks && win.getComputedStyle(fireworks).pointerEvents === "none", "Falta celebracion no bloqueante");
        op("+");
        assert(doc.querySelector(".celebration") === fireworks, "Se repite celebracion por render");
        byId("calculator-undo").click();
        assert(doc.querySelector(".celebration") === fireworks, "Se repite celebracion por deshacer operador");
        byId("calculator-undo").click();
        assert(!doc.querySelector(".celebration"), "Deshacer no limpia fuegos");
        immediateKeys[5].click();
        assert(doc.querySelector(".celebration") && doc.querySelector(".celebration") !== fireworks, "No celebra al alcanzar de nuevo");
        await wait(() => !doc.querySelector(".celebration"));
      }
      snapshot("Calculadora resultado inmediato");
      byId("calculator-back").click();
      assert(!doc.querySelector(".celebration"), "Volver no limpia celebracion");
      clear("number-chips");
      input("number-entry", `${"9".repeat(180)} 2 0 0 0 0 `);
      byId("target").value = (BigInt("9".repeat(180)) * 2n).toString();
      byId("solver").requestSubmit();
      await wait(() => !byId("solve").disabled);
      snapshot("Cifras enteros largos");
      byId("result").querySelector("details").open = true;
      snapshot("Cifras expresion larga");
      byId("solve-myself").click();
      snapshot("Calculadora enteros largos");
      const longKeys = [...byId("calculator-keys").children];
      longKeys[0].click();
      doc.querySelector('[data-operator="*"]').click();
      longKeys[1].click();
      snapshot("Calculadora resultado largo");
      reachEnd("calculator-display");
      reachEnd("calculator-steps");
    } finally {
      frame.remove();
    }
  }
  return results;
}
