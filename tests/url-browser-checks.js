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
      frame.src = new URL(`../index.html${search}`, import.meta.url).href;
    });
    const refresh = () => new Promise(resolve => { frame.onload = resolve; frame.contentWindow.location.reload(); });
    try {
      const huge = "9".repeat(180);
      const query = new URLSearchParams({ modo: "cifras", n: `-5,-5,0,3,2,${huge}`, obj: "-" + huge });
      await load("?" + query);
      let win = frame.contentWindow;
      let doc = frame.contentDocument;
      assert(!doc.getElementById("calculator-panel").hidden && new URL(win.location.href).searchParams.get("yo") === "1", "Reto completo debe abrir Resolver yo");
      doc.getElementById("calculator-back").click();
      assert(doc.getElementById("number-slots").querySelectorAll(".done").length === 6, "No se restauran seis cifras");
      assert(doc.getElementById("numbers").value.endsWith(huge), "Se pierde precision en URL");
      assert(doc.getElementById("target").value === "-" + huge, "No se restaura objetivo exacto");
      await refresh();
      win = frame.contentWindow; doc = frame.contentDocument;
      assert(doc.getElementById("numbers").value.startsWith("-5, -5, 0"), "Recargar pierde negativos o duplicados");
      assert(!doc.getElementById("calculator-panel").hidden, "Recargar reto completo debe abrir Resolver yo");
      doc.getElementById("calculator-back").click();
      doc.getElementById("solve-myself").click();
      assert(new URL(win.location.href).searchParams.get("yo") === "1", "No se guarda Resolver yo");
      win.history.back();
      await wait(() => frame.contentDocument.getElementById("calculator-panel").hidden);
      win.history.forward();
      await wait(() => !frame.contentDocument.getElementById("calculator-panel").hidden);
      await refresh();
      win = frame.contentWindow; doc = frame.contentDocument;
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
      assert(tabIcon.complete && tabIcon.naturalWidth === 64, "Icono entre pestanas no carga");

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
