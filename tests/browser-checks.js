export async function run(viewports = [[360, 640], [375, 667], [390, 844], [1280, 720]]) {
  const results = [];
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const wait = async predicate => {
    const deadline = Date.now() + 20000;
    while (!predicate()) {
      if (Date.now() > deadline) throw new Error("Tiempo agotado");
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  };
  for (const [width, height] of viewports) {
    const frame = document.createElement("iframe");
    frame.style.cssText = `position:fixed;left:0;top:0;border:0;width:${width}px;height:${height}px;z-index:1000;background:#dff1ff`;
    let doc, win;
    const load = search => new Promise((resolve, reject) => {
      frame.onload = () => { doc = frame.contentDocument; win = frame.contentWindow; resolve(); };
      frame.onerror = reject;
      frame.src = new URL(`../index.html${search || "?check=" + Date.now()}`, import.meta.url).href;
      if (!frame.isConnected) document.body.append(frame);
    });
    const byId = id => doc.getElementById(id);
    const scrollers = new Set(["calculator-steps", "letters-words"]);
    // Invisible tap extensions (button::before) are excluded from clipping measurements.
    const withoutHitAreas = measure => {
      const style = doc.createElement("style");
      style.textContent = "button::before { display: none !important; }";
      doc.head.append(style);
      try { return measure(); } finally { style.remove(); }
    };
    const snapshot = name => withoutHitAreas(() => {
      const root = doc.documentElement;
      assert(root.scrollHeight <= height && root.scrollWidth <= width, `${name}: documento desbordado`);
      for (const element of [root, doc.body]) {
        assert(win.getComputedStyle(element).overflowY === "hidden" && element.scrollTop === 0, `${name}: la pagina puede desplazarse`);
      }
      for (const element of doc.querySelectorAll("body *")) {
        if (!element.getClientRects().length || element.closest(".celebration")) continue;
        const style = win.getComputedStyle(element);
        const inner = element.parentElement.closest("#calculator-steps, #letters-words");
        if (/auto|scroll/.test(style.overflowX + style.overflowY)) assert(scrollers.has(element.id), `${name}: ${element.id || element.className} se desplaza por dentro`);
        else if (element.matches("form, section, fieldset, .card, .supplied-numbers, #calculator-display, .calculator-target, .entry-pad, .entry-slots, .calculator-operators, #calculator-keys")) {
          assert(element.scrollHeight <= element.clientHeight + 1 && element.scrollWidth <= element.clientWidth + 1, `${name}: ${element.id || element.className} recortado`);
        }
        if (!inner && element.matches("button, a, .entry-slot, #calculator-target, #calculator-distance, h2")) {
          const rect = element.getBoundingClientRect();
          assert(rect.top >= 0 && rect.left >= 0 && rect.bottom <= height + .5 && rect.right <= width + .5, `${name}: ${element.id || element.textContent} fuera de pantalla`);
        }
      }
      results.push({ name, viewport: [width, height], document: [doc.documentElement.scrollWidth, doc.documentElement.scrollHeight] });
    });
    const visible = element => withoutHitAreas(() => {
      const rect = element.getBoundingClientRect();
      assert(rect.width >= 44 && rect.height >= 44 && rect.left >= 0 && rect.top >= 0 && rect.right <= width && rect.bottom <= height,
        `${element.id || element.textContent}: tecla oculta o pequena`);
      assert(element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1, "Barra o recorte en una tecla");
    });
    const padFits = id => {
      for (const button of byId(id).children) visible(button);
      assert(!doc.querySelector('input:not([type="hidden"]), textarea, [contenteditable="true"]'), "No debe haber campos que abran el teclado del movil");
      assert(doc.activeElement.tagName !== "INPUT", "Foco con cursor de texto");
    };
    const gapHits = (selector, name) => {
      const buttons = [...doc.querySelectorAll(selector)].filter(button => button.getClientRects().length);
      const rects = buttons.map(button => button.getBoundingClientRect());
      // Rectangular hit boxes split gaps by axis distance (Chebyshev), not Euclidean distance.
      const distance = (r, x, y) => Math.max(r.left - x, 0, x - r.right, r.top - y, y - r.bottom);
      const left = Math.min(...rects.map(r => r.left)), right = Math.max(...rects.map(r => r.right));
      const top = Math.min(...rects.map(r => r.top)), bottom = Math.max(...rects.map(r => r.bottom));
      let sampled = 0, gaps = 0;
      for (let y = Math.ceil(top); y < bottom; y += 2) {
        for (let x = Math.ceil(left); x < right; x += 2) {
          const distances = rects.map(r => distance(r, x, y));
          const nearest = Math.min(...distances);
          if (nearest > 4.5) continue;
          sampled++;
          if (nearest > 0) gaps++;
          const hit = doc.elementFromPoint(x, y)?.closest("button");
          const index = buttons.indexOf(hit);
          assert(index >= 0, `${name}: zona muerta en (${Math.round(x)}, ${Math.round(y)})`);
          // Pixel snapping may move a gap boundary by up to 1.5px, changing the distance difference by up to 3px.
          assert(distances[index] <= nearest + 3, `${name}: (${Math.round(x)}, ${Math.round(y)}) activa ${hit.textContent} en vez de la tecla mas cercana`);
        }
      }
      assert(gaps > 50 && sampled > gaps, `${name}: muestreo de huecos insuficiente`);
    };
    const contrast = (element, minimum = 4.5) => {
      const luminance = color => {
        const values = color.match(/[\d.]+/g).slice(0, 3).map(value => {
          const s = Number(value) / 255;
          return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
        });
        return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
      };
      const style = win.getComputedStyle(element);
      let surface = element;
      while (win.getComputedStyle(surface).backgroundColor === "rgba(0, 0, 0, 0)" && surface.parentElement) surface = surface.parentElement;
      const a = luminance(style.color), b = luminance(win.getComputedStyle(surface).backgroundColor);
      assert((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= minimum, `${element.id || element.textContent}: contraste insuficiente`);
    };
    const numberKey = key => doc.querySelector(`[data-number-key="${key}"]`).click();
    const typeNumber = value => { for (const digit of value) numberKey(digit); numberKey("Enter"); };
    const volver = async () => {
      const popped = new Promise(resolve => win.addEventListener("popstate", resolve, { once: true }));
      byId("calculator-back").click();
      await Promise.race([popped, new Promise(resolve => setTimeout(resolve, 1000))]);
      await new Promise(resolve => setTimeout(resolve, 20));
    };
    const letterKey = key => doc.querySelector(`[data-letter-key="${key}"]`).click();
    const key = value => doc.body.dispatchEvent(new win.KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true }));
    const tile = value => [...byId("calculator-keys").children].find(button => button.textContent === String(value));
    const op = value => doc.querySelector(`[data-operator="${value}"]`).click();
    const idle = () => wait(() => byId("calculator-panel").dataset.animating !== "true");
    const combine = async (left, operator, right) => { tile(left).click(); op(operator); tile(right).click(); await idle(); };
    const manualFits = () => {
      const controlPanel = byId("calculator-keys").closest(".calculator-controls");
      const controls = controlPanel.getBoundingClientRect();
      withoutHitAreas(() => assert(controlPanel.scrollHeight <= controlPanel.clientHeight + 1, "Controles con desplazamiento interno"));
      for (const element of doc.querySelectorAll("#calculator-keys button, .calculator-operators button")) {
        visible(element);
        assert(element.getBoundingClientRect().bottom <= controls.bottom, "Control oculto dentro de la calculadora");
      }
      const auto = byId("calculator-auto");
      visible(auto);
      const autoRect = auto.getBoundingClientRect();
      const operatorRect = doc.querySelector("[data-operator]").getBoundingClientRect();
      assert(autoRect.top >= byId("calculator-history").getBoundingClientRect().bottom + 6 && autoRect.top - controls.bottom >= 40, "Auto-resolver debe estar separado de los controles");
      assert(autoRect.width <= controls.width * .6 && parseFloat(win.getComputedStyle(auto).fontSize) < parseFloat(win.getComputedStyle(doc.querySelector("[data-operator]")).fontSize) / 1.5 && autoRect.height <= operatorRect.height, "Auto-resolver debe ser pequeno y secundario");
      const target = byId("calculator-target").getBoundingClientRect();
      const distance = byId("calculator-distance").getBoundingClientRect();
      assert(distance.top < target.bottom && distance.bottom > target.top, "Distancia no esta junto al objetivo");
      assert(!byId("calculator-history").querySelector("details, summary") && byId("calculator-steps").getBoundingClientRect().height >= 44, "Pasos deben estar siempre desplegados");
      const firstStep = byId("calculator-steps").firstElementChild;
      if (firstStep) assert(firstStep.getBoundingClientRect().bottom <= Math.min(height, byId("calculator-history").getBoundingClientRect().bottom - 2), "No cabe un paso completo");
      const originals = byId("calculator-originals");
      assert(originals.scrollHeight <= originals.clientHeight + 1, "Cifras originales ocultas");
    };
    try {
      await load();
      padFits("number-pad");
      const tabIcon = doc.querySelector(".tabs img");
      const [cifrasTab, letrasTab] = [byId("numbers-tab").getBoundingClientRect(), byId("letters-tab").getBoundingClientRect()];
      const iconRect = tabIcon.getBoundingClientRect();
      assert(!doc.querySelector("h1") && !doc.body.textContent.includes("Cifras y Letras"), "El titulo visible debe desaparecer");
      assert(tabIcon.getAttribute("aria-hidden") === "true" && tabIcon.alt === "" && win.getComputedStyle(tabIcon).pointerEvents === "none", "Icono debe ser decorativo");
      assert(Math.abs((iconRect.left + iconRect.right) / 2 - (cifrasTab.left + letrasTab.right) / 2) <= 1 && iconRect.left < cifrasTab.right && iconRect.right > letrasTab.left, "Icono debe centrarse y solaparse con ambas pestanas");
      const bar = tabIcon.parentElement.getBoundingClientRect();
      assert(Math.abs((iconRect.top + iconRect.bottom) / 2 - (bar.top + bar.bottom) / 2) <= 1 && iconRect.height > bar.height && iconRect.height >= 76 && iconRect.top >= 0, "Icono debe centrarse en vertical y ser mas alto que la barra");
      for (const tab of [byId("numbers-tab"), byId("letters-tab")]) {
        const range = doc.createRange(); range.selectNodeContents(tab);
        const text = range.getBoundingClientRect();
        assert(text.right <= iconRect.left + 8 || text.left >= iconRect.right - 8, `El icono tapa ${tab.textContent}`);
        const point = tab === byId("numbers-tab") ? [iconRect.left + 10, (bar.top + bar.bottom) / 2] : [iconRect.right - 10, (bar.top + bar.bottom) / 2];
        assert(doc.elementFromPoint(...point) === tab, "El icono bloquea las pestanas");
      }
      assert(!/(255, 255, 255)/.test(win.getComputedStyle(tabIcon).backgroundColor) && win.getComputedStyle(tabIcon).borderStyle === "none", "Icono sin circulo ni borde blanco");
      const focusKey = byId("number-pad").firstElementChild;
      focusKey.focus();
      assert(win.getComputedStyle(focusKey).outlineStyle === "none", "No debe aparecer anillo de foco");
      assert(win.getComputedStyle(focusKey).borderWidth === "2px", "Pop suave requiere borde de 2 px");
      contrast(focusKey);
      snapshot("Teclado numerico vacio");
      gapHits("#number-pad button", "Teclado numerico");
      assert([...byId("number-pad").children].map(button => button.dataset.numberKey).join() === "7,8,9,4,5,6,1,2,3,Backspace,0,Enter", "Orden numerico incorrecto");
      numberKey("Enter");
      const slots = () => [...byId("number-slots").children];
      const targetSlot = byId("number-target-slot");
      assert(!doc.querySelector(".entry-display, #number-entry-label, #number-draft") && !/de 6/.test(byId("numbers-panel").textContent), "Sobra la franja Numero N de 6");
      assert(slots()[0].classList.contains("current") && slots()[0].textContent === "", "Enter vacio avanza");
      assert(targetSlot.classList.contains("empty") && targetSlot.textContent.includes("Objetivo") && byId("number-target-value").textContent === "\u00b7\u00b7\u00b7" && win.getComputedStyle(targetSlot).borderStyle === "dashed", "Objetivo debe esperar vacio con borde gris discontinuo");
      key("2");
      assert(slots()[0].textContent === "2" && slots()[0].classList.contains("current") && win.getComputedStyle(slots()[0]).borderStyle === "dashed", "Los digitos deben verse en el hueco actual");
      key("Backspace");
      for (const value of ["25", "8", "6", "50", "3", "7"]) typeNumber(value);
      assert(targetSlot.classList.contains("current") && byId("number-target-value").textContent === "" && byId("numbers").value === "25, 8, 6, 50, 3, 7", "No pide seis numeros antes del objetivo");
      assert(win.getComputedStyle(targetSlot).borderTopColor === "rgb(63, 111, 196)" && win.getComputedStyle(targetSlot).borderStyle === "dashed", "Objetivo activo debe tener borde azul discontinuo");
      padFits("number-pad");
      snapshot("Seis numeros y teclado de objetivo");
      key("-");
      assert(byId("number-target-value").textContent === "", "No debe introducirse signo negativo");
      for (const digit of "952") key(digit);
      assert(byId("number-target-value").textContent === "952" && win.getComputedStyle(byId("number-target-value")).color === "rgb(226, 115, 58)", "Objetivo debe verse grande en naranja");
      assert(parseFloat(win.getComputedStyle(byId("number-target-value")).fontSize) >= 36, "Objetivo debe ser grande");
      snapshot("Tecleando el objetivo");
      key("Backspace"); key("Backspace"); key("Backspace"); key("Backspace");
      assert(slots()[5].classList.contains("current") && slots()[5].textContent === "7", "Borrar desde Objetivo debe volver al sexto hueco");
      key("Enter");
      for (const digit of "952") key(digit);
      assert(!doc.querySelector("#solve, #result, #steps, .entry-help, details"), "Sobran solucion automatica, resultados o ayuda en la entrada");
      key("Enter");
      assert(!byId("calculator-panel").hidden && !byId("numbers-panel").getClientRects().length, "El objetivo debe abrir Resolver yo directamente");
      assert(new URL(win.location.href).searchParams.get("obj") === "952" && new URL(win.location.href).searchParams.get("yo") === "1", "Objetivo no persiste");
      manualFits();
      snapshot("Resolver yo vacio");
      gapHits("#calculator-keys button, .calculator-operators button", "Resolver yo");
      assert(byId("calculator-display").textContent === "" && byId("calculator-display").getBoundingClientRect().height >= 60, "Pantalla vacia muestra signo o colapsa");
      assert(parseFloat(win.getComputedStyle(byId("calculator-target")).fontSize) >= 32, "Objetivo demasiado pequeno");
      contrast(byId("calculator-target"), 3);
      contrast(byId("calculator-distance"));
      contrast(byId("calculator-auto"));
      assert(!byId("calculator-display").hasAttribute("tabindex"), "Pantalla no debe recibir foco");
      assert(byId("calculator-distance").textContent === "faltan 902", `Distancia debe decir faltan: ${byId("calculator-distance").textContent}`);
      assert(parseFloat(win.getComputedStyle(byId("calculator-distance")).fontSize) < parseFloat(win.getComputedStyle(byId("calculator-target")).fontSize) / 2, "Distancia debe ser mas pequena que el objetivo");
      const back = byId("calculator-back");
      const backRect = back.getBoundingClientRect(), goalRect = doc.querySelector(".calculator-target").getBoundingClientRect();
      assert(back.textContent.trim() === "" && back.querySelector("svg path") && back.getAttribute("aria-label") === "Volver", "Volver debe ser una flecha solida");
      assert(Math.abs(backRect.height - goalRect.height) < 1 && Math.abs(backRect.top - goalRect.top) < 1, "Volver debe medir lo mismo que la caja Objetivo");
      const keyRadius = win.getComputedStyle(byId("calculator-keys").firstElementChild).borderTopLeftRadius;
      assert(keyRadius !== "0px" && [...doc.querySelector(".calculator-operators").children].every(button => win.getComputedStyle(button).borderTopLeftRadius === keyRadius), "Operaciones deben redondearse como las cifras");
      const row = [...doc.querySelector(".calculator-operators").children].map(button => button.getBoundingClientRect());
      assert(row.length === 5 && row.every(rect => Math.abs(rect.width - row[0].width) < 1 && Math.abs(rect.top - row[0].top) < 1), "Operaciones y deshacer deben compartir fila y tamano");
      tile(25).click();
      contrast(doc.querySelector("[data-operator]"), 3);
      op("/"); tile(8).click();
      assert(byId("calculator-status").textContent.includes("sin fracciones") && byId("calculator-keys").children.length === 6, "Division invalida consume operandos");
      assert([...doc.querySelectorAll("[data-operator]")].every(button => button.disabled) && !byId("calculator-undo").disabled, "Espera de numero no deshabilita solo operaciones");
      byId("calculator-undo").click();
      assert([...doc.querySelectorAll("[data-operator]")].every(button => !button.disabled), "Deshacer operador falla");
      byId("calculator-undo").click();
      await combine(25, "-", 8);
      assert(tile(17).classList.contains("result-key") && win.getComputedStyle(tile(17)).backgroundColor === "rgb(143, 176, 230)", "Resultado debe ser una ficha azul");
      contrast(tile(17));
      await combine(6, "+", 50);
      tile(17).click(); op("*"); tile(56).click();
      assert(byId("calculator-panel").dataset.animating === "true", "Falta animacion de fusion");
      const count = byId("calculator-steps").children.length;
      tile(3).click(); op("+");
      assert(byId("calculator-steps").children.length === count, "Pulsaciones rapidas alteran fusion");
      await idle();
      assert(byId("calculator-display").textContent === "952" && byId("calculator-distance").textContent === "Objetivo alcanzado", "Falla fusion de dos resultados");
      assert(!byId("calculator-steps").textContent.includes("paso"), "Pasos muestran referencias textuales");
      const derived = byId("calculator-steps").querySelector(".step-derived");
      const original = byId("calculator-steps").querySelector(".step-original");
      assert(win.getComputedStyle(derived).color === "rgb(63, 111, 196)" && win.getComputedStyle(original).color === "rgb(29, 42, 68)", "Resultados intermedios deben distinguirse de cifras originales");
      const fireworks = doc.querySelector(".celebration");
      assert(fireworks && win.getComputedStyle(fireworks).pointerEvents === "none", "Faltan fuegos no bloqueantes");
      manualFits();
      snapshot("Dos resultados fusionados");
      gapHits("#calculator-keys button, .calculator-operators button", "Resolver yo con resultados");
      byId("calculator-undo").click();
      await idle();
      assert(tile(17) && tile(56) && !doc.querySelector(".celebration"), "Deshacer no restaura resultados o limpia fuegos");
      byId("calculator-auto").click();
      await wait(() => byId("calculator-auto").textContent === "Auto-resolver");
      assert(byId("calculator-display").textContent === "952", "Automatico no continua desde resultados");
      byId("calculator-undo").click(); await idle();
      byId("calculator-auto").click();
      byId("calculator-auto").click();
      await new Promise(resolve => setTimeout(resolve, 900));
      assert(byId("calculator-steps").children.length === 2 && byId("calculator-status").textContent.includes("cancelado"), "Cancelar reproduccion falla");

      await load("?n=2,2,0,0,0,0&obj=4&yo=1");
      const duplicates = [...byId("calculator-keys").children];
      duplicates[0].click(); op("-"); duplicates[1].click(); await idle();
      byId("calculator-auto").click();
      await wait(() => byId("calculator-status").textContent.includes("empezamos"));
      await wait(() => byId("calculator-auto").textContent === "Auto-resolver");
      assert(byId("calculator-display").textContent === "4" && byId("calculator-steps").children.length === 1, "Falla reinicio automatico");
      snapshot("Automatico reinicia sin continuacion");
      await load("?n=0,0,0,0,0,0&obj=1&yo=1");
      byId("calculator-auto").click();
      await wait(() => byId("calculator-auto").textContent === "Auto-resolver");
      assert(byId("calculator-status").textContent === "No hay soluci\u00f3n exacta \u00b7 la m\u00e1s cercana: 0 (a 1)", "Falta aviso de solucion mas cercana");
      await load("?n=1,1,1,1,1,1&obj=1000");
      byId("calculator-auto").click();
      await wait(() => byId("calculator-auto").textContent === "Auto-resolver" && byId("calculator-panel").dataset.animating !== "true");
      assert(byId("calculator-display").textContent === "9" && byId("calculator-status").textContent.includes("la m\u00e1s cercana: 9 (a 991)"), "No reproduce la solucion mas cercana");
      manualFits();
      snapshot("Solucion mas cercana");
      await load("?n=0,0,0,0,0,0&obj=1&yo=1");
      win.eval("Object.defineProperty(reducedMotion,'matches',{value:true,configurable:true}); reducedMotion.dispatchEvent(new Event('change'));");
      const zeros = [...byId("calculator-keys").children];
      zeros[0].click(); op("+"); zeros[1].click();
      assert(byId("calculator-panel").dataset.animating !== "true", "Movimiento reducido no es instantaneo");
      byId("calculator-undo").click();
      assert(byId("calculator-keys").children.length === 6, "Deshacer reducido pierde duplicados");

      await load("?modo=letras");
      padFits("letter-pad");
      assert(!byId("letters-source").getClientRects().length, "La nota del diccionario debe aparecer solo tras Buscar");
      snapshot("Abecedario completo");
      gapHits("#letter-pad button", "Teclado de letras");
      assert([...doc.querySelectorAll("[data-letter-key]")].map(button => button.dataset.letterKey).join() === [..."ABCDEFGHIJKLMN\u00d1OPQRSTUVWXYZ", "Backspace"].join(), "Abecedario desordenado o sin enye");
      letterKey("A"); letterKey("A");
      key(" "); key(","); key(" ");
      assert(byId("letters").value === "AA", "Separadores repiten letras");
      key("\u00e1"); key("\u00f1");
      assert(byId("letters").value === "AA\u00e1\u00f1", "Teclado fisico pierde tildes o enye");
      for (let index = 0; index < 4; index++) letterKey("Backspace");
      for (const letter of "CAMIONES") letterKey(letter);
      assert(byId("letters").value === "CAMIONES", "Letras no se anaden inmediatamente");
      padFits("letter-pad");
      snapshot("Ocho letras y todas las teclas");
      byId("letters-solve").click();
      await wait(() => !byId("letters-solve").disabled);
      assert(byId("letters-source").getClientRects().length && byId("letters-source").textContent.includes("no verificadas por la RAE"), "Falta la nota del diccionario tras Buscar");
      assert(!byId("letters-result").hidden && byId("letters-words").children.length >= 8, "Faltan candidatas reales");
      for (const link of byId("letters-words").querySelectorAll("a")) {
        assert(link.querySelector("svg") && link.getAttribute("aria-label").includes("DLE") && link.getBoundingClientRect().width >= 44, "Icono DLE inaccesible");
      }
      snapshot("Candidatas compactas");
      byId("letters-edit").click();
      for (const letter of "ABCDEFGHIJKLMN\u00d1OPQRST") letterKey(letter);
      key("z");
      assert(byId("letters").value === "CAMIONESABCD" && byId("letter-slots").children.length === 12, "Maximo de doce letras");
      assert(doc.querySelector('[data-letter-key="A"]').disabled && !doc.querySelector('[data-letter-key="Backspace"]').disabled && !byId("letters-solve").disabled, "Teclas de letra deben bloquearse a las doce");
      const chips = [...byId("letter-slots").children].map(chip => chip.getBoundingClientRect());
      assert(chips.every(rect => Math.abs(rect.top - chips[0].top) < 1 && rect.right <= byId("letter-slots").getBoundingClientRect().right + .5), "Las letras deben caber en una sola fila");
      for (const chip of byId("letter-slots").children) assert(chip.scrollWidth <= chip.clientWidth + 1, "Letra recortada");
      padFits("letter-pad");
      snapshot("Doce letras en una fila");
      letterKey("Backspace");
      assert(!doc.querySelector('[data-letter-key="A"]').disabled && byId("letter-slots").children.length === 12, "Borrar debe reactivar las letras");
      byId("letters-tab").click();
      assert(byId("letters").value === "" && byId("letter-slots").querySelector(".current") && !new URL(win.location.href).searchParams.has("l"), "Pulsar Letras debe vaciar");
      await load("?modo=letras&l=" + "abcdefghijklmnop");
      assert(byId("letters").value === "abcdefghijkl" && byId("letters-status").classList.contains("error"), "URL debe recortar a doce letras con aviso");
      snapshot("URL de letras recortada");

      const huge = "9".repeat(180);
      await load("?n=" + ["-" + huge, "2", "0", "0", "0", "0"].join(",") + "&obj=10&yo=1");
      for (const button of byId("calculator-keys").children) withoutHitAreas(() => {
        assert(button.scrollWidth <= button.clientWidth + 1 && button.scrollHeight <= button.clientHeight + 1, "Numero largo con scroll o recorte");
      });
      manualFits();
      assert(byId("calculator-keys").firstElementChild.title === "-" + huge, "Abreviar no debe perder el valor exacto");
      snapshot("Enteros exactos de 180 digitos");

      await load("?n=2,2,2,2,2,2&obj=512");
      assert(!byId("calculator-panel").hidden, "URL completa debe abrir Resolver yo");
      await volver();
      byId("target").value = "512";
      byId("numbers").value = Array(9).fill("2").join(", ");
      byId("solve-myself").click();
      byId("calculator-auto").click();
      await wait(() => byId("calculator-auto").textContent === "Auto-resolver" && byId("calculator-panel").dataset.animating !== "true");
      const longSteps = byId("calculator-steps");
      assert(longSteps.children.length === 8 && byId("calculator-display").textContent === "512", "El solver generico debe admitir nueve numeros y ocho pasos");
      manualFits();
      longSteps.scrollTop = longSteps.scrollHeight;
      assert(doc.documentElement.scrollTop === 0, "Desplazar los pasos mueve la pagina");
      const lastStep = longSteps.lastElementChild.getBoundingClientRect();
      assert(lastStep.bottom <= longSteps.getBoundingClientRect().bottom + 1, "El ultimo paso no es alcanzable dentro de su caja");
      snapshot("Nueve numeros y ocho pasos automaticos");

      await load("?n=100,75,50,25,3,6&obj=952");
      assert(!byId("calculator-panel").hidden, "Reto completo debe abrir Resolver yo");
      await volver();
      assert(byId("calculator-panel").hidden && byId("numbers").value === "" && byId("target").value === "" && !byId("number-pad").hidden && byId("number-slots").firstElementChild.classList.contains("current") && byId("number-target-slot").classList.contains("empty"), "Volver debe abrir Cifras vacia y lista");
      assert(new URL(win.location.href).search === "?modo=cifras", "Volver debe limpiar la URL");
      snapshot("Cifras vacia tras volver");
      for (const value of ["100", "75", "50", "25", "3", "6"]) typeNumber(value);
      for (const digit of "95") numberKey(digit);
      for (let index = 0; index < 40; index++) numberKey("Backspace");
      assert(byId("numbers").value === "" && byId("target").value === "" && byId("number-slots").firstElementChild.classList.contains("current") && byId("number-target-slot").classList.contains("empty"), "Borrar debe vaciarlo todo");
      assert([...byId("number-slots").children].every(slot => slot.textContent === ""), "Quedan cifras en los huecos");
      snapshot("Todo borrado tras editar");
      for (const value of ["4", "5"]) typeNumber(value);
      byId("numbers-tab").click();
      assert(byId("numbers").value === "" && byId("number-slots").firstElementChild.classList.contains("current") && byId("number-target-value").textContent === "\u00b7\u00b7\u00b7" && !new URL(win.location.href).searchParams.has("n"), "Pulsar Cifras activa debe vaciar");
      await load("?n=100,75,50,25,3,6&obj=952");
      await volver();
      byId("letters-tab").click();
      byId("numbers-tab").click();
      assert(byId("numbers").value === "" && byId("target").value === "" && !byId("number-pad").hidden && !new URL(win.location.href).searchParams.has("obj"), "Cambiar a Cifras debe vaciar");
      for (const values of [
        [100, 75, 50, 25, 10, 9, 8, 7, 6],
        [-123456, 987654, -55555, 4444444, 31415926, -27182818, 99999, -1, 123456789]
      ]) {
        await load("?n=1,2,3,4,5,6&obj=271828");
        await volver();
        byId("target").value = "271828";
        byId("numbers").value = values.join(", ");
        byId("solve-myself").click();
        assert(byId("calculator-keys").children.length === 9, "Calculadora generica limitada a seis");
        manualFits();
        snapshot("Nueve botones originales");
        await combine(values[0], "+", values[1]);
        manualFits();
        snapshot("Nueve numeros con resultado intermedio");
      }
    } finally {
      frame.remove();
    }
  }
  return results;
}
