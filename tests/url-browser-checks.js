export async function run(viewports = [[360, 640], [375, 667], [390, 844]]) {
  const results = [];
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const wait = async predicate => {
    const deadline = Date.now() + 10000;
    while (!predicate()) {
      if (Date.now() > deadline) throw new Error("Tiempo agotado");
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  };
  for (const [width, height] of viewports) {
    const frame = document.createElement("iframe");
    frame.style.cssText = `position:fixed;left:0;top:0;border:0;width:${width}px;height:${height}px;z-index:1000;background:#dff1ff`;
    document.body.append(frame);
    const load = search => new Promise((resolve, reject) => {
      frame.onload = resolve;
      frame.onerror = reject;
      const url = new URL(`../index.html${search}`, import.meta.url);
      url.searchParams.set("lang", "es");
      frame.src = url.href;
    });
    const refresh = () => new Promise(resolve => { frame.onload = resolve; frame.contentWindow.location.reload(); });
    try {
      const huge = "9".repeat(180);
      const query = new URLSearchParams({ modo: "cifras", n: `-5,-5,0,3,2,${huge}`, obj: "-" + huge });
      await load("?" + query);
      let win = frame.contentWindow;
      let doc = frame.contentDocument;
      assert(!doc.getElementById("calculator-panel").hidden && new URL(win.location.href).searchParams.get("yo") === "1", "Reto completo debe abrir Resolver yo");
      assert(doc.getElementById("numbers").value.endsWith(huge), "Se pierde precision en URL");
      assert(doc.getElementById("target").value === "-" + huge, "No se restaura objetivo exacto");
      const historyStart = win.history.length;
      win.history.back();
      await wait(() => frame.contentDocument.getElementById("calculator-panel").hidden);
      assert(frame.contentWindow.location.href.startsWith(new URL("../index.html", import.meta.url).href) && frame.contentDocument.getElementById("numbers").value === "" && frame.contentDocument.getElementById("target").value === "" && new URL(frame.contentWindow.location.href).search === "?modo=cifras", "Atras desde un enlace a Resolver yo debe dejar Cifras vacia sin salir");
      win.history.forward();
      await wait(() => !frame.contentDocument.getElementById("calculator-panel").hidden);
      const popped = new Promise(resolve => win.addEventListener("popstate", resolve, { once: true }));
      doc.getElementById("calculator-back").click();
      assert(doc.getElementById("numbers").value === "" && doc.getElementById("target").value === "" && doc.getElementById("number-slots").firstElementChild.classList.contains("current") && !doc.getElementById("number-pad").hidden, "Volver debe dejar Cifras vacia y lista");
      await popped;
      await new Promise(resolve => setTimeout(resolve, 50));
      assert(new URL(win.location.href).search === "?modo=cifras" && win.history.length === historyStart && doc.getElementById("numbers").value === "", "Volver debe limpiar la URL sin duplicar historial");
      await load("?" + query);
      win = frame.contentWindow; doc = frame.contentDocument;
      doc.getElementById("calculator-back").click();
      await new Promise(resolve => setTimeout(resolve, 100));
      assert(doc.getElementById("number-slots").querySelectorAll(".done").length === 0, "Volver no vacia las cifras");
      await load("?" + query);
      await refresh();
      win = frame.contentWindow; doc = frame.contentDocument;
      assert(doc.getElementById("numbers").value.startsWith("-5, -5, 0"), "Recargar pierde negativos o duplicados");
      assert(!doc.getElementById("calculator-panel").hidden, "Recargar reto completo debe abrir Resolver yo");
      const reloadLength = win.history.length;
      await refresh();
      win = frame.contentWindow; doc = frame.contentDocument;
      assert(win.history.length === reloadLength, "Recargar Resolver yo duplica historial");
      assert(!doc.getElementById("calculator-panel").hidden && doc.getElementById("calculator-keys").children.length === 6, "Recargar no vuelve a Resolver yo");
      assert(doc.documentElement.scrollHeight <= height, "Resolver yo restaurado no cabe");
      doc.getElementById("calculator-back").click();
      await wait(() => !new URL(frame.contentWindow.location.href).searchParams.has("yo"));

      await load("?modo=letras&l=" + encodeURIComponent("\u00c1\u00f1\u00f1\u00fcaa"));
      win = frame.contentWindow; doc = frame.contentDocument;
      assert(doc.getElementById("letters-tab").getAttribute("aria-selected") === "true", "No se restaura pestana Letras");
      assert(doc.getElementById("letters").value === "\u00c1\u00f1\u00f1\u00fcaa", "URL pierde tildes, dieresis o enye");
      const historyLength = win.history.length;
      for (const letter of ["n", "\u00f1", "a"]) {
        doc.body.dispatchEvent(new win.KeyboardEvent("keydown", { key: letter, bubbles: true, cancelable: true }));
      }
      assert(win.history.length === historyLength, "Teclear agrega entradas al historial");
      assert(new URL(win.location.href).searchParams.get("l") === "\u00c1\u00f1\u00f1\u00fcaan\u00f1a", "No se actualiza URL al escribir");
      doc.querySelector("#letter-slots button").click();
      await refresh();
      win = frame.contentWindow; doc = frame.contentDocument;
      assert(doc.getElementById("letters").value === "\u00f1\u00f1\u00fcaan\u00f1a", "Quitar letra no persiste");
      doc.getElementById("numbers-tab").click();
      assert(new URL(win.location.href).searchParams.get("modo") === "cifras", "Cambiar pestana no persiste");

      await load("?modo=letras&l=camionesta");
      win = frame.contentWindow; doc = frame.contentDocument;
      assert(!doc.getElementById("letters-play").hidden && new URL(win.location.href).searchParams.get("yo") === "1", "Diez letras en la URL deben abrir el solver de letras");
      const lettersStart = win.history.length;
      win.history.back();
      await wait(() => frame.contentDocument.getElementById("letters-play").hidden);
      assert(new URL(frame.contentWindow.location.href).search === "?modo=letras" && frame.contentDocument.getElementById("letters").value === "", "Atras desde el solver de letras debe dejar Letras vacia sin salir");
      win.history.forward();
      await wait(() => !frame.contentDocument.getElementById("letters-play").hidden);
      assert(frame.contentDocument.getElementById("lp-tiles").children.length === 10, "Adelante debe reabrir el solver");
      await refresh();
      win = frame.contentWindow; doc = frame.contentDocument;
      assert(!doc.getElementById("letters-play").hidden && win.history.length === lettersStart && doc.documentElement.scrollHeight <= height, "Recargar el solver de letras duplica historial o no cabe");
      const lettersPopped = new Promise(resolve => win.addEventListener("popstate", resolve, { once: true }));
      doc.getElementById("lp-back").click();
      await lettersPopped;
      await new Promise(resolve => setTimeout(resolve, 50));
      assert(new URL(win.location.href).search === "?modo=letras" && win.history.length === lettersStart && doc.getElementById("letters").value === "" && doc.getElementById("letters-play").hidden, "Volver debe dejar Letras vacia sin duplicar historial");

      await load("?modo=cifras&n=1,2,bad,3,4,5,6,7,8,9,10&obj=no&l=%3Cscript%3E&yo=1");
      doc = frame.contentDocument;
      assert(doc.getElementById("numbers").value.split(", ").length === 6, "No se conservan cifras validas dentro del limite");
      assert(doc.getElementById("target").value === "" && doc.getElementById("letters").value === "", "Se aceptan parametros invalidos");
      assert(doc.getElementById("status").classList.contains("error") && doc.getElementById("status").textContent.includes("URL"), "Falta aviso visible de URL invalida");
      assert(doc.getElementById("calculator-panel").hidden, "Se abre calculadora con reto invalido");

      const base = new URL("../", import.meta.url);
      const manifest = await (await fetch(new URL("site.webmanifest?v=3", base))).json();
      for (const icon of manifest.icons) {
        const image = new Image();
        image.src = new URL(icon.src, base);
        await image.decode();
        assert(`${image.naturalWidth}x${image.naturalHeight}` === icon.sizes, "Icono de manifest invalido");
      }
      const tabIcon = doc.querySelector(".tabs img");
      assert(tabIcon.complete && tabIcon.naturalWidth === 156, "Icono entre pestanas no carga");

      await load("?modo=letras&l=secreto");
      win = frame.contentWindow; doc = frame.contentDocument;
      assert(win.goatcounter.path() === win.location.pathname + "?modo=letras", "Analitica envia contenido del reto");
      const sent = [];
      // Freeze the spy so a late count.js load cannot replace it; count.js is not needed for this check.
      Object.defineProperty(win.goatcounter, "count", { configurable: true, get: () => vars => sent.push(vars.path), set: () => {} });
      doc.getElementById("numbers-tab").click();
      doc.getElementById("numbers-tab").click();
      for (const digit of "75") doc.querySelector(`[data-number-key="${digit}"]`).click();
      doc.getElementById("letters-tab").click();
      await new Promise(resolve => setTimeout(resolve, 50));
      assert(sent.join() === [win.location.pathname + "?modo=cifras", win.location.pathname + "?modo=letras"].join(), `Cambios de modo mal contados: ${sent.join()}`);
      assert(!sent.some(path => /[&](n|obj|l|yo)=|secreto|75/.test(path)), "Analitica envia cifras o letras");
      results.push({ viewport: [width, height], restored: true, history: true, icons: true, analytics: true });
    } finally {
      frame.remove();
    }
  }
  return results;
}
