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
    frame.src = new URL("../index.html", import.meta.url).href;
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
      snapshot("Cifras inicial");
      assert(byId("number-chips").children.length === 6, "Faltan fichas iniciales");
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
        byId("calculator-equals").click();
      }
      snapshot("Calculadora ocho operaciones");
      assert(byId("calculator-steps").children.length === 8, "Calculadora pierde pasos");
      assert(parseFloat(win.getComputedStyle(nineKeys[0]).fontSize) >= 28, "Numeros demasiado pequenos");
      reachEnd("calculator-steps");
      byId("calculator-back").click();
      byId("solver").querySelector("details").open = true;
      snapshot("Cifras ayuda abierta");
      byId("solver").querySelector("details").open = false;
      byId("letters-tab").click();
      snapshot("Letras inicial");
      clear("letter-chips");
      input("letter-entry", "n");
      assert(byId("letter-chips").children.length === 1, "La letra no crea ficha inmediatamente");
      input("letter-entry", "\u0303");
      assert(byId("letters").value === "ñ", "La tilde combinante no se une a n");
      clear("letter-chips");
      const letterEntry = byId("letter-entry");
      letterEntry.dispatchEvent(new win.CompositionEvent("compositionstart"));
      input("letter-entry", "n");
      assert(byId("letter-chips").children.length === 0, "Se confirma durante composicion");
      letterEntry.value = "n\u0303";
      letterEntry.dispatchEvent(new win.CompositionEvent("compositionend"));
      assert(byId("letters").value === "ñ", "Composicion de ñ incorrecta");
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
      assert(keys[0].disabled && keys[1].disabled, "Tras elegir cifra se espera operacion");
      op("+");
      assert(!keys[1].disabled && keys[0].disabled, "No se distingue la cifra duplicada");
      keys[1].click();
      byId("calculator-equals").click();
      assert(byId("calculator-status").textContent.includes("Objetivo alcanzado"), "No reconoce objetivo");
      byId("calculator-undo").click();
      byId("calculator-undo").click();
      assert(!keys[1].disabled && keys[0].disabled, "Deshacer no restaura cifra duplicada");
      byId("calculator-undo").click();
      byId("calculator-undo").click();
      assert(keys.every(key => !key.disabled), "Deshacer repetido no restaura inicio");
      keys[3].click(); op("/"); keys[0].click(); byId("calculator-equals").click();
      assert(byId("calculator-status").textContent.includes("sin fracciones"), "Division fraccionaria aceptada");
      byId("calculator-undo").click();
      keys[2].click(); byId("calculator-equals").click();
      assert(byId("calculator-status").textContent.includes("entre cero"), "Division entre cero aceptada");
      byId("calculator-reset").click();
      assert(keys.every(key => !key.disabled), "Reiniciar no restaura cifras");
      snapshot("Calculadora");
      byId("calculator-back").click();
      assert(byId("target").value === "4" && byId("numbers").value === "2, 2, 0, 5, 3, 6", "Volver pierde el reto");
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
      byId("calculator-equals").click();
      snapshot("Calculadora resultado largo");
      reachEnd("calculator-display");
      reachEnd("calculator-steps");
    } finally {
      frame.remove();
    }
  }
  return results;
}
