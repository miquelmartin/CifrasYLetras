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
    const scrollers = new Set(["calculator-history", "lp-box"]);
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
        const inner = element.parentElement.closest("#calculator-history, #lp-box");
        if (/auto|scroll/.test(style.overflowX + style.overflowY)) assert(scrollers.has(element.id), `${name}: ${element.id || element.className} se desplaza por dentro`);
        else if (element.matches("form, section, fieldset, .card, .supplied-numbers, .calculator-target, .entry-pad, .entry-slots, .calculator-operators, #calculator-keys")) {
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
          // Hit areas extend half of the 8px gap; 0.5px is left for subpixel snapping.
          if (nearest > 3.5) continue;
          sampled++;
          if (nearest > 0) gaps++;
          const hit = doc.elementFromPoint(x, y)?.closest("button");
          const index = buttons.indexOf(hit);
          assert(index >= 0, `${name}: zona muerta en (${Math.round(x)}, ${Math.round(y)}) [${width}x${height}]`);
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
    const lastValue = () => byId("calculator-steps").lastElementChild?.querySelector(".step-value")?.textContent || "";
    // Status line, five history rows and the large current row (see calculator-ui.js).
    const MIN_HISTORY = 16 + 34 + 5 * 34 + 56;
    const manualFits = () => {
      const history = byId("calculator-history");
      const controls = doc.querySelector(".calculator-controls").getBoundingClientRect();
      withoutHitAreas(() => {
        for (const element of doc.querySelectorAll("#calculator-keys button, .calculator-operators button")) {
          visible(element);
          const rect = element.getBoundingClientRect();
          assert(rect.width >= rect.height - .5, `${element.textContent}: tecla mas alta que ancha`);
          if (history.clientHeight > MIN_HISTORY + 12 && element.closest("#calculator-keys")) assert(rect.width - rect.height < 1.5, "Las cifras deben crecer hasta ser cuadradas antes de ceder alto a los pasos");
        }
      });
      const auto = byId("calculator-auto");
      visible(auto);
      const autoRect = auto.getBoundingClientRect();
      const goalRect = doc.querySelector("#calculator-panel .calculator-target").getBoundingClientRect();
      assert(Math.abs(autoRect.height - goalRect.height) < 1 && Math.abs(autoRect.top - goalRect.top) < 1 && autoRect.left >= goalRect.right, "Auto-resolver debe ir a la derecha del objetivo con su misma altura");
      assert(autoRect.width <= 80 && parseFloat(win.getComputedStyle(auto).fontSize) < parseFloat(win.getComputedStyle(doc.querySelector("[data-operator]")).fontSize) / 1.5, "Auto-resolver debe ser pequeno y secundario");
      const target = byId("calculator-target").getBoundingClientRect();
      const distance = byId("calculator-distance").getBoundingClientRect();
      assert(distance.top < target.bottom && distance.bottom > target.top, "Distancia no esta junto al objetivo");
      const historyRect = history.getBoundingClientRect();
      assert(historyRect.top >= goalRect.bottom && historyRect.bottom <= controls.top && historyRect.height >= MIN_HISTORY - 1, "Los pasos deben ir entre el objetivo y las cifras con sitio para seis pasos");
      assert(!doc.querySelector("#calculator-display, #calculator-originals, .calculator-footer, #calculator-history h2") && !/Elige/.test(byId("calculator-panel").textContent), "Sobran pantalla, lista de cifras o indicaciones");
      const rows = [...byId("calculator-steps").children, ...(byId("calculator-current").hidden ? [] : [byId("calculator-current")])].map(row => row.getBoundingClientRect());
      if (rows.length) {
        assert(rows.every((row, index) => index === 0 || row.top >= rows[index - 1].bottom - .5), "Los pasos deben apilarse hacia abajo");
        assert(rows.at(-1).bottom <= historyRect.bottom && rows.at(-1).bottom >= historyRect.bottom - 12, "El paso mas reciente debe ser la fila inferior");
      }
    };
    const focusAudit = name => {
      for (const sheet of doc.styleSheets) {
        for (const rule of sheet.cssRules) {
          if (!rule.selectorText || !/:focus|:active/.test(rule.selectorText)) continue;
          const style = rule.style;
          assert(!style.boxShadow && !style.filter && !style.backgroundColor && !style.borderColor && [ "", "none"].includes(style.outlineStyle) && ["", "0px"].includes(style.outlineWidth),
            `${name}: la regla ${rule.selectorText} muestra el foco`);
        }
      }
      const focusable = [...doc.querySelectorAll("button, a[href], input, select, textarea, [tabindex]")].filter(element => element.getClientRects().length && !element.disabled);
      for (const element of focusable) {
        doc.activeElement?.blur?.();
        const before = win.getComputedStyle(element);
        const resting = [before.boxShadow, before.filter, before.backgroundColor, before.borderColor].join("|");
        for (const focusVisible of [false, true]) {
          element.focus({ focusVisible, preventScroll: true });
          const style = win.getComputedStyle(element);
          const label = `${name}: ${element.id || element.getAttribute("aria-label") || element.textContent}`;
          assert(style.outlineStyle === "none" || style.outlineWidth === "0px", `${label} muestra contorno de foco`);
          assert([style.boxShadow, style.filter, style.backgroundColor, style.borderColor].join("|") === resting, `${label} cambia al recibir foco`);
          assert(style.webkitTapHighlightColor === "rgba(0, 0, 0, 0)", `${label} tiene resaltado al tocar`);
        }
        element.blur();
      }
      assert(focusable.length >= 3, `${name}: sin elementos enfocables`);
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
      focusAudit("Entrada de cifras");
      assert([...byId("number-pad").children].map(button => button.dataset.numberKey).join() === "7,8,9,4,5,6,1,2,3,Backspace,0,Enter", "Orden numerico incorrecto");
      const enterKey = doc.querySelector('[data-number-key="Enter"]');
      const isRandom = () => enterKey.classList.contains("random-key") && /Al azar/.test(enterKey.textContent) && win.getComputedStyle(enterKey).backgroundColor === "rgb(246, 201, 107)";
      { const dice = enterKey.querySelector(".dice"), range = doc.createRange(), kr = enterKey.getBoundingClientRect(); range.selectNodeContents(enterKey); const dr = range.getBoundingClientRect(); assert(parseFloat(win.getComputedStyle(dice).fontSize) >= 1.9 * parseFloat(win.getComputedStyle(enterKey).fontSize) && dr.top >= kr.top - 1 && dr.bottom <= kr.bottom + 1 && dr.left >= kr.left - 1 && dr.right <= kr.right + 1, "Cifras Al azar: el dado debe ser grande y caber en la tecla"); }
      assert(isRandom(), "Vacio, Enter debe ser Al azar en ambar");
      contrast(enterKey);
      key("Enter");
      const slots = () => [...byId("number-slots").children];
      const targetSlot = byId("number-target-slot");
      assert(!doc.querySelector(".entry-display, #number-entry-label, #number-draft") && !/de 6/.test(byId("numbers-panel").textContent), "Sobra la franja Numero N de 6");
      assert(slots()[0].classList.contains("current") && slots()[0].textContent === "" && byId("calculator-panel").hidden, "Enter fisico vacio no debe avanzar ni sortear");
      numberKey("4");
      assert(!enterKey.classList.contains("random-key") && enterKey.textContent === "Enter" && win.getComputedStyle(enterKey).backgroundColor === "rgb(244, 167, 124)", "Con un digito vuelve Enter");
      numberKey("Backspace");
      assert(isRandom(), "Al vaciar vuelve Al azar");
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
      assert(!byId("calculator-current").hidden && byId("calculator-current").querySelectorAll(".step-slot:not(.filled)").length === 2 && byId("calculator-steps").children.length === 0, "El paso actual vacio debe mostrar huecos");
      focusAudit("Resolver yo");
      assert(parseFloat(win.getComputedStyle(byId("calculator-target")).fontSize) >= 32, "Objetivo demasiado pequeno");
      contrast(byId("calculator-target"), 3);
      contrast(byId("calculator-distance"));
      contrast(byId("calculator-auto"));
      assert(byId("calculator-distance").textContent === "faltan 902", `Distancia debe decir faltan: ${byId("calculator-distance").textContent}`);
      assert(parseFloat(win.getComputedStyle(byId("calculator-distance")).fontSize) < parseFloat(win.getComputedStyle(byId("calculator-target")).fontSize) / 2, "Distancia debe ser mas pequena que el objetivo");
      const back = byId("calculator-back");
      const backRect = back.getBoundingClientRect(), goalRect = doc.querySelector("#calculator-panel .calculator-target").getBoundingClientRect();
      assert(back.textContent.trim() === "" && back.querySelector("svg path") && back.getAttribute("aria-label") === "Volver", "Volver debe ser una flecha solida");
      assert(Math.abs(backRect.height - goalRect.height) < 1 && Math.abs(backRect.top - goalRect.top) < 1, "Volver debe medir lo mismo que la caja Objetivo");
      const keyRadius = win.getComputedStyle(byId("calculator-keys").firstElementChild).borderTopLeftRadius;
      assert(keyRadius !== "0px" && [...doc.querySelector(".calculator-operators").children].every(button => win.getComputedStyle(button).borderTopLeftRadius === keyRadius), "Operaciones deben redondearse como las cifras");
      const row = [...doc.querySelector(".calculator-operators").children].map(button => button.getBoundingClientRect());
      assert(row.length === 5 && row.every(rect => Math.abs(rect.width - row[0].width) < 1 && Math.abs(rect.top - row[0].top) < 1), "Operaciones y deshacer deben compartir fila y tamano");
      tile(25).click();
      contrast(doc.querySelector("[data-operator]"), 3);
      op("/");
      assert(byId("calculator-current").textContent === "1" + "25\u00f7?" && byId("calculator-current").querySelector(".step-slot.filled"), "El paso actual debe ilustrar la operacion");
      assert(parseFloat(win.getComputedStyle(byId("calculator-current")).fontSize) > parseFloat(win.getComputedStyle(byId("calculator-steps")).fontSize || "16") * 1.4, "El paso actual debe ser mayor"); tile(8).click();
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
      assert(lastValue() === "952" && byId("calculator-distance").textContent === "Objetivo alcanzado", "Falla fusion de dos resultados");
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
      assert(lastValue() === "952", "Automatico no continua desde resultados");
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
      assert(lastValue() === "4" && byId("calculator-steps").children.length === 1, "Falla reinicio automatico");
      snapshot("Automatico reinicia sin continuacion");
      await load("?n=0,0,0,0,0,0&obj=1&yo=1");
      byId("calculator-auto").click();
      await wait(() => byId("calculator-auto").textContent === "Auto-resolver");
      assert(byId("calculator-status").textContent === "No hay soluci\u00f3n exacta \u00b7 la m\u00e1s cercana: 0 (a 1)", "Falta aviso de solucion mas cercana");
      await load("?n=1,1,1,1,1,1&obj=1000");
      byId("calculator-auto").click();
      await wait(() => byId("calculator-auto").textContent === "Auto-resolver" && byId("calculator-panel").dataset.animating !== "true");
      assert(lastValue() === "9" && byId("calculator-status").textContent.includes("la m\u00e1s cercana: 9 (a 991)"), "No reproduce la solucion mas cercana");
      manualFits();
      snapshot("Solucion mas cercana");
      await load("?n=1,2,3,4,5,6&obj=999&yo=1");
      await combine(1, "+", 2); await combine(4, "+", 5); await combine(9, "*", 6); await combine(54, "*", 3);
      tile(162).click(); op("*");
      const historyFull = byId("calculator-history");
      assert(byId("calculator-steps").children.length === 4 && !byId("calculator-current").hidden && historyFull.scrollHeight <= historyFull.clientHeight + 1, "Cuatro pasos y el actual deben caber sin desplazar");
      manualFits();
      const rowHeight = byId("calculator-steps").lastElementChild.getBoundingClientRect().height;
      const currentHeight = byId("calculator-current").getBoundingClientRect().height;
      assert(5 * (rowHeight + 4) + currentHeight + 34 <= historyFull.clientHeight - 12 + 1, "Cinco pasos y el actual deben caber al tamano escalado");
      if (width === 390 && height === 844) {
        const historyFont = parseFloat(win.getComputedStyle(byId("calculator-steps").lastElementChild).fontSize);
        const slotFont = parseFloat(win.getComputedStyle(doc.querySelector("#calculator-current .step-slot")).fontSize);
        assert(historyFont >= 26 && rowHeight >= 42, `Pasos demasiado pequenos a 390x844: ${historyFont}px / ${rowHeight}px`);
        assert(slotFont >= 44 && currentHeight >= 78, `Paso actual demasiado pequeno a 390x844: ${slotFont}px / ${currentHeight}px`);
      }
      snapshot("Cinco pasos con el actual");
      const beforeLast = byId("calculator-steps").lastElementChild.getBoundingClientRect();
      tile(3).click(); await idle();
      const newest = byId("calculator-steps").lastElementChild.getBoundingClientRect();
      assert(byId("calculator-steps").children.length === 5 && byId("calculator-current").hidden && lastValue() === "486" && newest.top >= beforeLast.bottom - .5, "El nuevo paso debe aparecer abajo y empujar los anteriores");
      assert(historyFull.scrollHeight <= historyFull.clientHeight + 1, "Cinco pasos terminados deben caber sin desplazar");
      manualFits();
      snapshot("Cinco pasos terminados");
      await load("?n=1000,100,999,998,997,996&obj=999&yo=1");
      await combine(1000, "*", 100); await combine(100000, "*", 999); await combine(99900000, "*", 998);
      tile(99700200000).click(); op("*");
      for (const operation of doc.querySelectorAll("#calculator-steps .operation")) {
        assert(operation.scrollWidth <= operation.clientWidth + 1, `Paso largo recortado: ${operation.textContent}`);
      }
      for (const slot of doc.querySelectorAll("#calculator-current .step-slot")) assert(slot.scrollWidth <= slot.clientWidth + 1, "Hueco del paso actual recortado");
      const currentRow = byId("calculator-current");
      assert(currentRow.scrollWidth <= currentRow.clientWidth + 1, "El paso actual desborda en ancho");
      manualFits();
      snapshot("Pasos largos");
      await load("?n=0,0,0,0,0,0&obj=1&yo=1");
      win.eval("Object.defineProperty(reducedMotion,'matches',{value:true,configurable:true}); reducedMotion.dispatchEvent(new Event('change'));");
      const zeros = [...byId("calculator-keys").children];
      zeros[0].click(); op("+"); zeros[1].click();
      assert(byId("calculator-panel").dataset.animating !== "true", "Movimiento reducido no es instantaneo");
      byId("calculator-undo").click();
      assert(byId("calculator-keys").children.length === 6, "Deshacer reducido pierde duplicados");

      await load("?modo=letras");
      padFits("letter-pad");
      assert(!byId("letters-source"), "La nota del diccionario debe aparecer solo en Auto-resolver");
      snapshot("Abecedario completo");
      gapHits("#letter-pad button", "Teclado de letras");
      assert([...doc.querySelectorAll("[data-letter-key]")].map(button => button.dataset.letterKey).join() === [..."ABCDEFGHIJKLMN\u00d1OPQRSTUVWXYZ", "Backspace"].join(), "Abecedario desordenado o sin enye");
      const solveKey = byId("letters-solve");
      const lettersRandom = () => solveKey.classList.contains("random-key") && /Al azar/.test(solveKey.textContent) && win.getComputedStyle(solveKey).backgroundColor === "rgb(246, 201, 107)";
      { const dice = solveKey.querySelector(".dice"), range = doc.createRange(), kr = solveKey.getBoundingClientRect(); range.selectNodeContents(solveKey); const dr = range.getBoundingClientRect(); assert(parseFloat(win.getComputedStyle(dice).fontSize) >= 1.9 * parseFloat(win.getComputedStyle(solveKey).fontSize) && dr.top >= kr.top - 1 && dr.bottom <= kr.bottom + 1 && dr.left >= kr.left - 1 && dr.right <= kr.right + 1, "Letras Al azar: el dado debe ser grande y caber en la tecla"); }
      assert(lettersRandom(), "Letras vacias: Enter debe ser Al azar en ambar");
      contrast(solveKey);
      visible(solveKey);
      letterKey("A");
      assert(!solveKey.classList.contains("random-key") && solveKey.textContent === "Enter" && solveKey.disabled, "Con una letra vuelve Enter, atenuado hasta tener diez");
      letterKey("Backspace");
      assert(lettersRandom(), "Al vaciar las letras vuelve Al azar");
      letterKey("A"); letterKey("A");
      key(" "); key(","); key(" ");
      assert(byId("letters").value === "AA", "Separadores repiten letras");
      key("\u00e1"); key("\u00f1");
      assert(byId("letters").value === "AA\u00e1\u00f1", "Teclado fisico pierde tildes o enye");
      for (let index = 0; index < 4; index++) letterKey("Backspace");
      const letterSlotsFit = name => {
        const slots = [...byId("letter-slots").children];
        const rects = slots.map(slot => slot.getBoundingClientRect());
        const row = byId("letter-slots").getBoundingClientRect();
        assert(slots.length === 10 && rects.every(rect => Math.abs(rect.top - rects[0].top) < 1 && rect.left >= row.left - .5 && rect.right <= row.right + .5), `${name}: diez huecos fijos en una fila`);
        assert(rects.every(rect => rect.height >= 48 && rect.width >= 24), `${name}: huecos de letra demasiado pequenos`);
        for (const slot of slots) assert(slot.scrollWidth <= slot.clientWidth + 1 && slot.scrollHeight <= slot.clientHeight + 1, `${name}: letra recortada`);
      };
      letterSlotsFit("Letras vacias");
      assert(byId("letter-slots").children[0].classList.contains("current") && win.getComputedStyle(byId("letter-slots").children[0]).borderStyle === "dashed", "El hueco actual debe ser discontinuo");
      for (const letter of "CAMIONES") letterKey(letter);
      assert(byId("letters").value === "CAMIONES", "Letras no se anaden inmediatamente");
      assert(solveKey.disabled && solveKey.textContent === "Enter" && win.getComputedStyle(solveKey).backgroundColor !== "rgb(244, 167, 124)", "Enter debe estar atenuado con menos de diez letras");
      key("Enter");
      await new Promise(resolve => setTimeout(resolve, 100));
      assert(byId("letters-play").hidden, "Enter fisico no debe abrir el solver con menos de diez letras");
      letterSlotsFit("Ocho letras");
      padFits("letter-pad");
      snapshot("Ocho letras y todas las teclas");
      assert(!doc.querySelector("#letters-result, #letters-edit, #letters-cancel") && !/Buscar/.test(byId("letters-panel").textContent), "La entrada ya no tiene paso Buscar");
      letterKey("T");
      assert(byId("letters-play").hidden, "Nueve letras no abren el solver");
      letterKey("A");
      // Tenth letter: straight to the solver page.
      const play = byId("letters-play"), tiles = () => [...byId("lp-tiles").children];
      assert(!play.hidden && new URL(win.location.href).searchParams.get("yo") === "1" && new URL(win.location.href).searchParams.get("l") === "CAMIONESTA", "La decima letra debe abrir el solver y la URL");
      assert(tiles().map(tile => tile.textContent).join("") === "CAMIONESTA", "Fichas del solver incorrectas");
      assert(byId("lp-best-word").textContent === "sin palabras a\u00fan" && byId("lp-best").textContent === "\u2013", "Tu mejor palabra vacia");
      assert(/^m\u00e1x\. (\d+\u2026|\u2026|10)$/.test(byId("lp-best-max").textContent), `Maximo en curso mal mostrado: ${byId("lp-best-max").textContent}`);
      await wait(() => byId("lp-best-max").textContent === "m\u00e1x. 10");
      {
        const goal = play.querySelector(".calculator-target").getBoundingClientRect();
        for (const id of ["lp-best", "lp-best-word", "lp-best-max"]) {
          const rect = byId(id).getBoundingClientRect();
          assert(rect.left >= goal.left - .5 && rect.right <= goal.right + .5 && rect.top >= goal.top - .5 && rect.bottom <= goal.bottom + .5 && byId(id).scrollWidth <= byId(id).clientWidth + 1, `${id} no cabe en Tu mejor palabra`);
        }
        assert(byId("lp-best-max").getBoundingClientRect().top >= byId("lp-best-word").getBoundingClientRect().bottom - .5, "El maximo va bajo la palabra");
      }
      // Live updates: a progress report with a longer word raises the known maximum before the search ends.
      win.eval("lp.result = null; lp.known = 0; handleLettersMessage({ type: 'progress', id: lp.request, examined: 1, total: 2, longest: 6 })");
      assert(byId("lp-best-max").textContent === "m\u00e1x. 6\u2026", "El maximo debe actualizarse en vivo");
      win.eval("handleLettersMessage({ type: 'progress', id: lp.request, examined: 1, total: 2, longest: 4 })");
      assert(byId("lp-best-max").textContent === "m\u00e1x. 6\u2026", "El maximo en vivo no debe bajar");
      win.eval("stopLettersWorker(); startLettersSearch()");
      await wait(() => byId("lp-best-max").textContent === "m\u00e1x. 10");
      const lpFits = name => {
        withoutHitAreas(() => {
          for (const button of byId("letters-play").querySelectorAll("#lp-tiles button, #lp-actions button, #lp-back, #lp-auto")) {
            visible(button);
            const rect = button.getBoundingClientRect();
            if (button.closest("#lp-tiles, #lp-actions")) assert(rect.width >= rect.height - .5, `${name}: ${button.textContent} mas alta que ancha`);
          }
        });
        const rects = tiles().map(tile => tile.getBoundingClientRect());
        assert(rects.slice(0, 5).every(rect => Math.abs(rect.top - rects[0].top) < 1) && rects.slice(5).every(rect => Math.abs(rect.top - rects[5].top) < 1) && rects[5].top > rects[0].bottom, `${name}: fichas en 5x2`);
        const goal = play.querySelector(".calculator-target").getBoundingClientRect(), auto = byId("lp-auto").getBoundingClientRect(), back = byId("lp-back").getBoundingClientRect();
        assert(Math.abs(auto.height - goal.height) < 1 && Math.abs(back.height - goal.height) < 1 && auto.left >= goal.right && back.right <= goal.left, `${name}: fila superior Volver, Tu mejor y Auto-resolver`);
        const box = byId("lp-box").getBoundingClientRect(), current = byId("lp-current").getBoundingClientRect();
        const lpBox = byId("lp-box"), atBottom = lpBox.scrollTop + lpBox.clientHeight >= lpBox.scrollHeight - 1;
        assert(box.top >= goal.bottom && box.bottom <= rects[0].top && (!atBottom || (current.bottom <= box.bottom && current.bottom >= box.bottom - 12)), `${name}: la palabra en curso debe ser la fila inferior de la caja`);
        const actions = [...byId("lp-actions").children].map(button => button.getBoundingClientRect());
        assert(actions[1].width > actions[0].width * 1.5, `${name}: Enter mas ancho que borrar`);
      };
      lpFits("Solver de letras");
      snapshot("Solver de letras vacio");
      gapHits("#lp-tiles button, #lp-actions button", "Fichas de letras");
      focusAudit("Solver de letras");
      tiles()[0].click(); tiles()[1].click();
      assert(tiles()[0].disabled && Math.abs(parseFloat(win.getComputedStyle(tiles()[0]).opacity) - .12) < .02 && !tiles()[2].disabled, "La ficha usada debe quedar casi invisible y desactivada");
      assert(byId("lp-current").textContent.includes("CA"), "La palabra en curso no muestra las letras");
      byId("lp-delete").click();
      assert(!tiles()[1].disabled && tiles()[0].disabled && byId("lp-current").textContent.startsWith("C") && !byId("lp-current").textContent.includes("CA"), "Borrar debe devolver la ultima ficha");
      byId("lp-delete").click();
      byId("lp-submit").click();
      assert(!byId("lp-words").children.length, "Enter vacio no debe anadir filas");
      const submit = word => { for (const letter of word) key(letter); key("Enter"); };
      const lpRow = word => [...byId("lp-words").querySelectorAll("li.mine")].find(item => item.querySelector(".lp-word").textContent === word);
      submit("mano"); submit("naimo");
      assert(tiles().every(tile => !tile.disabled), "Enviar devuelve todas las fichas");
      await wait(() => !byId("lp-words").querySelector("li.pending"));
      const mano = lpRow("MANO"), narimo = lpRow("NAIMO");
      assert(mano && mano.classList.contains("ok") && mano.querySelector(".lp-mark").textContent === "\u2714" && mano.querySelector(".lp-len").textContent === "4", "Palabra valida sin \u2714 y longitud");
      assert(narimo && narimo.classList.contains("bad") && narimo.querySelector(".lp-mark").textContent === "\u2718" && /line-through/.test(win.getComputedStyle(narimo.querySelector(".lp-word")).textDecorationLine + win.getComputedStyle(narimo).textDecorationLine), "Palabra invalida sin tachar o sin \u2718");
      assert(byId("lp-best").textContent === "4" && byId("lp-best-word").textContent === "letras \u00b7 MANO" && byId("lp-best-max").textContent === "m\u00e1x. 10", "Tu mejor palabra incorrecta");
      submit("mano");
      assert(byId("lp-words").querySelectorAll("li.mine").length === 2 && lpRow("MANO").classList.contains("flash"), "Repetir una palabra debe destacarla sin duplicar");
      assert(!doc.querySelector(".celebration"), "Sin fuegos antes del maximo");
      for (const word of ["mas", "mia", "ten"]) submit(word);
      submit("camiones");
      await wait(() => !byId("lp-words").querySelector("li.pending"));
      const rowsTop = [...byId("lp-words").querySelectorAll("li.mine")].map(item => item.getBoundingClientRect());
      assert(rowsTop.every((rect, index) => !index || rect.top >= rowsTop[index - 1].bottom - .5) && lpRow("CAMIONES").getBoundingClientRect().bottom <= byId("lp-current").getBoundingClientRect().top + .5, "La palabra nueva debe empujar las anteriores hacia arriba");
      lpFits("Seis palabras");
      assert(byId("lp-box").scrollHeight <= byId("lp-box").clientHeight + 1, "Seis palabras deben caber sin desplazar");
      snapshot("Seis palabras enviadas");
      submit("camionetas");
      await wait(() => !byId("lp-words").querySelector("li.pending"));
      const maximum = lpRow("CAMIONETAS");
      assert(maximum.classList.contains("best") && maximum.querySelector(".lp-mark").textContent === "\u2605" && byId("lp-best-max").textContent === "\u00a1m\u00e1xima!" && byId("lp-best-word").textContent === "letras \u00b7 CAMIONETAS", "La palabra maxima debe ir en oro con \u2605");
      const lettersFireworks = doc.querySelector(".celebration");
      assert(lettersFireworks && win.getComputedStyle(lettersFireworks).pointerEvents === "none", "La palabra maxima debe lanzar fuegos");
      byId("lp-auto").click();
      assert(byId("lp-auto").disabled && byId("lp-words").firstElementChild.textContent === "Las m\u00e1s largas \u00b7 10 letras", "Auto-resolver debe mostrar las mas largas");
      assert(byId("letters-source").textContent.includes("no verificadas por la RAE") && [...byId("lp-words").querySelectorAll(".lp-section")].map(item => item.textContent).includes("Tus palabras"), "Falta la nota del diccionario o Tus palabras");
      const solutions = [...byId("lp-words").querySelectorAll("li.solution")];
      const mine = solutions.find(item => item.querySelector(".lp-word").textContent === "CAMIONETAS");
      assert(solutions.length >= 2 && mine.classList.contains("best") && mine.textContent.includes("\u2605 tuya") && solutions.filter(item => item.classList.contains("best")).length === 1, "Auto-resolver debe resaltar las palabras encontradas");
      for (const link of byId("lp-words").querySelectorAll("a.lp-dle")) assert(link.querySelector("svg") && link.getAttribute("aria-label").includes("DLE"), "Icono DLE inaccesible");
      lpFits("Auto-resolver de letras");
      snapshot("Auto-resolver de letras");
      focusAudit("Auto-resolver de letras");
      const popped = new Promise(resolve => win.addEventListener("popstate", resolve, { once: true }));
      byId("lp-back").click();
      await Promise.race([popped, new Promise(resolve => setTimeout(resolve, 1000))]);
      await new Promise(resolve => setTimeout(resolve, 20));
      assert(play.hidden && byId("letters").value === "" && lettersRandom() && !new URL(win.location.href).searchParams.has("l") && !doc.querySelector(".celebration"), "Volver debe dejar la entrada de letras vacia");
      letterKey("S");
      byId("letters-tab").click();
      assert(byId("letters").value === "" && byId("letter-slots").querySelector(".current") && !new URL(win.location.href).searchParams.has("l"), "Pulsar Letras debe vaciar");
      assert(lettersRandom(), "Tras vaciar con la pestana vuelve Al azar");
      solveKey.click();
      const drawnLetters = byId("letters").value;
      const vowelCount = [...drawnLetters].filter(letter => "AEIOU".includes(letter)).length;
      assert(drawnLetters.length === 10 && vowelCount >= 3 && vowelCount <= 6 && /^[A-Z\u00d1]+$/.test(drawnLetters) && !/[KW]/.test(drawnLetters), `Sorteo de letras invalido: ${drawnLetters}`);
      assert(!play.hidden && tiles().map(tile => tile.textContent).join("") === drawnLetters, "Al azar debe abrir el solver con las letras sorteadas");
      assert(new URL(win.location.href).searchParams.get("l") === drawnLetters && new URL(win.location.href).searchParams.get("yo") === "1", "Al azar debe actualizar la URL de letras");
      lpFits("Letras al azar");
      assert(!byId("letters-tab").getClientRects().length, "Las pestanas se ocultan en el solver");
      const backed = new Promise(resolve => win.addEventListener("popstate", resolve, { once: true }));
      win.history.back();
      await Promise.race([backed, new Promise(resolve => setTimeout(resolve, 1000))]);
      await new Promise(resolve => setTimeout(resolve, 20));
      assert(play.hidden && byId("letters").value === "" && lettersRandom() && !new URL(win.location.href).searchParams.has("l"), "Atras del navegador sale del solver a la entrada vacia");
      await load("?modo=letras&l=camionesta");
      assert(!byId("letters-play").hidden && tiles().length === 10, "URL con diez letras debe abrir el solver");
      await load("?modo=letras&l=" + "abcdefghijklmnop");
      assert(byId("letters-play").hidden && byId("letters").value === "abcdefghij" && byId("letters-status").classList.contains("error") && byId("letters-status").textContent.includes("10 letras"), "URL debe recortar a diez letras con aviso");
      letterSlotsFit("URL recortada");
      await load("?modo=letras&l=sol");
      await new Promise(resolve => setTimeout(resolve, 200));
      assert(byId("letters").value === "sol" && byId("letters-play").hidden && byId("letters-solve").disabled, "URL con menos de diez letras se carga en la entrada");
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
      assert(longSteps.children.length === 8 && lastValue() === "512", "El solver generico debe admitir nueve numeros y ocho pasos");
      manualFits();
      const historyBox = byId("calculator-history");
      assert(historyBox.scrollTop > 0 && Math.abs(historyBox.scrollTop + historyBox.clientHeight - historyBox.scrollHeight) <= 1, "Los pasos deben quedar desplazados al final");
      assert(doc.documentElement.scrollTop === 0, "Desplazar los pasos mueve la pagina");
      const lastStep = longSteps.lastElementChild.getBoundingClientRect();
      assert(lastStep.bottom <= historyBox.getBoundingClientRect().bottom + 1, "El ultimo paso no es alcanzable dentro de su caja");
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
      assert(doc.querySelector('[data-number-key="Enter"]').classList.contains("random-key"), "Tras borrar todo debe volver Al azar");
      numberKey("Enter");
      const drawn = new URL(win.location.href).searchParams;
      const drawnNumbers = (drawn.get("n") || "").split(",").map(Number);
      assert(!byId("calculator-panel").hidden && drawn.get("yo") === "1" && drawnNumbers.length === 6 && +drawn.get("obj") >= 100 && +drawn.get("obj") <= 999, "Al azar debe rellenar y abrir Resolver yo");
      assert(drawnNumbers.every(value => (value >= 1 && value <= 10) || [25, 50, 75, 100].includes(value)), "Al azar fuera del mazo");
      manualFits();
      await volver();
      assert(byId("numbers").value === "" && doc.querySelector('[data-number-key="Enter"]').classList.contains("random-key"), "Volver tras Al azar debe dejar entrada vacia");
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
