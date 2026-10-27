"use strict";

const I18n = (() => {
  const rows = [
    ["Cifras y Letras", "Des chiffres et des lettres", "Numbers and Letters"],
    ["Cifras", "Chiffres", "Numbers"], ["Letras", "Lettres", "Letters"],
    ["Elige un reto", "Choisir un d\u00e9fi", "Choose a challenge"],
    ["Objetivo", "Objectif", "Target"], ["Enter", "Entr\u00e9e", "Enter"],
    ["Al azar", "Au hasard", "Random"], ["Volver", "Retour", "Back"],
    ["Auto-resolver", "Solution auto", "Auto-solve"], ["Cancelar", "Annuler", "Cancel"],
    ["Editar cifras", "Modifier les chiffres", "Edit numbers"], ["Resolver yo", "Jouer", "Solve myself"],
    ["Tus seis n\u00fameros", "Vos six nombres", "Your six numbers"],
    ["Tus letras", "Vos lettres", "Your letters"], ["Tus diez letras", "Vos dix lettres", "Your ten letters"],
    ["Teclado num\u00e9rico", "Clavier num\u00e9rique", "Number keypad"],
    ["Abecedario en orden alfab\u00e9tico", "Alphabet dans l\u2019ordre", "Alphabet in order"],
    ["Resolver letras", "Former des mots", "Solve letters"], ["Tu mejor palabra", "Votre meilleur mot", "Your best word"],
    ["Tus palabras", "Vos mots", "Your words"], ["Palabras enviadas", "Mots propos\u00e9s", "Submitted words"],
    ["Palabra en curso", "Mot en cours", "Current word"],
    ["Acciones", "Actions", "Actions"], ["Quitar la \u00faltima letra", "Effacer la derni\u00e8re lettre", "Remove the last letter"],
    ["Comprobar palabra", "V\u00e9rifier le mot", "Check word"], ["Objetivo y distancia", "Objectif et \u00e9cart", "Target and distance"],
    ["Pasos", "\u00c9tapes", "Steps"], ["Pasos realizados", "\u00c9tapes effectu\u00e9es", "Completed steps"],
    ["Operaci\u00f3n actual", "Calcul en cours", "Current operation"],
    ["Botones disponibles: cifras y resultados", "Nombres et r\u00e9sultats disponibles", "Available numbers and results"],
    ["Botones azules con =: resultados anteriores.", "Boutons bleus avec = : r\u00e9sultats pr\u00e9c\u00e9dents.", "Blue buttons with =: previous results."],
    ["Operaciones", "Op\u00e9rations", "Operations"], ["Sumar", "Additionner", "Add"], ["Restar", "Soustraire", "Subtract"],
    ["Multiplicar", "Multiplier", "Multiply"], ["Dividir", "Diviser", "Divide"], ["Deshacer", "Annuler", "Undo"],
    ["Idioma", "Langue", "Language"], ["Interfaz y diccionario", "Interface et dictionnaire", "Interface and dictionary"],
    ["Borrar d\u00edgito", "Effacer un chiffre", "Delete digit"], ["Confirmar n\u00famero", "Confirmer le nombre", "Confirm number"],
    ["Borrar letra", "Effacer une lettre", "Delete letter"],
    ["Cifras y objetivo al azar", "Nombres et objectif au hasard", "Random numbers and target"],
    ["Letras al azar", "Lettres au hasard", "Random letters"],
    ["Resolver con estas diez letras", "Jouer avec ces dix lettres", "Solve with these ten letters"],
    ["vac\u00edo", "vide", "empty"], ["vac\u00eda", "vide", "empty"], [", actual", ", en cours", ", current"],
    ["N\u00famero {number}: {value}", "Nombre {number} : {value}", "Number {number}: {value}"],
    ["Objetivo: {value}", "Objectif : {value}", "Target: {value}"],
    ["Quitar letra {number}: {letter}", "Retirer la lettre {number} : {letter}", "Remove letter {number}: {letter}"],
    ["Siguiente letra; {count} de {total} letras introducidas", "Lettre suivante ; {count} lettres sur {total}", "Next letter; {count} of {total} letters entered"],
    ["{count} letras: {letters}", "{count} lettres : {letters}", "{count} letters: {letters}"],
    ["Letra {letter}", "Lettre {letter}", "Letter {letter}"],
    ["letra", "lettre", "letter"], ["letras", "lettres", "letters"],
    ["Cargando el diccionario...", "Chargement du dictionnaire...", "Loading dictionary..."],
    ["Buscando... {percent} % de las entradas revisadas.", "Recherche... {percent} % des entr\u00e9es examin\u00e9es.", "Searching... {percent}% of entries checked."],
    ["Error en la b\u00fasqueda: {message} Vuelve atr\u00e1s e int\u00e9ntalo de nuevo.", "Erreur de recherche : {message} Revenez en arri\u00e8re et r\u00e9essayez.", "Search error: {message} Go back and try again."],
    ["No se pudo cargar o ejecutar el proceso de letras. Abre el sitio web en lugar del archivo local e int\u00e9ntalo de nuevo.", "Impossible de lancer la recherche de mots. Ouvrez le site web plut\u00f4t que le fichier local et r\u00e9essayez.", "Could not run the letters worker. Open the website instead of the local file and try again."],
    ["No se pudo iniciar la b\u00fasqueda. Comprueba que tu navegador permite los procesos en segundo plano.", "Impossible de lancer la recherche. V\u00e9rifiez que votre navigateur autorise les t\u00e2ches en arri\u00e8re-plan.", "Could not start the search. Check that your browser allows background workers."],
    ["Las m\u00e1s largas \u00b7 {count} {unit}", "Les plus longs \u00b7 {count} {unit}", "Longest words \u00b7 {count} {unit}"],
    ["Sin candidatas", "Aucun mot trouv\u00e9", "No candidates"], ["\u2605 tuya", "\u2605 trouv\u00e9", "\u2605 yours"],
    ["comprobando", "v\u00e9rification en cours", "checking"], ["no v\u00e1lida", "non valide", "invalid"],
    ["v\u00e1lida, {count} {unit}{maximum}", "valide, {count} {unit}{maximum}", "valid, {count} {unit}{maximum}"],
    [", de las m\u00e1s largas", ", parmi les plus longs", ", one of the longest"],
    ["Palabra en curso: {word}", "Mot en cours : {word}", "Current word: {word}"],
    ["Palabra en curso: vac\u00eda", "Mot en cours : vide", "Current word: empty"],
    ["sin palabras a\u00fan", "aucun mot pour l\u2019instant", "no words yet"],
    ["\u00a1m\u00e1xima!", "maximum !", "maximum!"], ["m\u00e1x.", "max.", "max."],
    ["Buscando las palabras m\u00e1s largas...", "Recherche des mots les plus longs...", "Finding the longest words..."],
    ["No se han encontrado candidatas en este diccionario ortogr\u00e1fico. Esto no demuestra que no exista ninguna palabra real.", "Aucun mot trouv\u00e9 dans ce dictionnaire. Cela ne signifie pas qu\u2019aucun mot n\u2019existe.", "No candidates found in this dictionary. This does not prove that no real word exists."],
    ["Consultar \u00ab{word}\u00bb en el DLE (lema: {lemma})", "Consulter \u00ab {word} \u00bb dans le dictionnaire", "Look up \u201c{word}\u201d in the dictionary"],
    ["Cifra original {number}: {value}", "Nombre initial {number} : {value}", "Original number {number}: {value}"],
    ["Resultado: {value}", "R\u00e9sultat : {value}", "Result: {value}"],
    ["Resultado anterior", "R\u00e9sultat pr\u00e9c\u00e9dent", "Previous result"],
    ["{value}, resultado anterior", "{value}, r\u00e9sultat pr\u00e9c\u00e9dent", "{value}, previous result"],
    ["Paso {number}: {left} {operator} ?", "\u00c9tape {number} : {left} {operator} ?", "Step {number}: {left} {operator} ?"],
    ["faltan", "manque", "short by"], ["sobran", "exc\u00e8s de", "over by"],
    ["Objetivo alcanzado", "Objectif atteint", "Target reached"], ["\u00a1Objetivo alcanzado!", "Objectif atteint !", "Target reached!"],
    ["{gap} {distance} respecto al bot\u00f3n m\u00e1s cercano", "{gap} {distance} par rapport au nombre le plus proche", "{gap} {distance} from the nearest number"],
    ["Buscando con hasta {depth} operaciones ({states} estados)...", "Recherche avec au plus {depth} op\u00e9rations ({states} \u00e9tats)...", "Searching up to {depth} operations ({states} states)..."],
    ["El navegador no pudo ejecutar la b\u00fasqueda autom\u00e1tica.", "Le navigateur n\u2019a pas pu lancer la recherche automatique.", "The browser could not run the automatic search."],
    ["Autom\u00e1tico cancelado. Se conservan las operaciones ya realizadas.", "Recherche annul\u00e9e. Les op\u00e9rations effectu\u00e9es sont conserv\u00e9es.", "Auto-solve cancelled. Completed operations are preserved."],
    ["Buscando una continuaci\u00f3n desde los botones actuales...", "Recherche \u00e0 partir des nombres actuels...", "Searching from the current numbers..."],
    ["No hay continuaci\u00f3n exacta. Buscando desde las cifras originales...", "Aucune suite exacte. Recherche \u00e0 partir des nombres initiaux...", "No exact continuation. Searching from the original numbers..."],
    ["Sin continuaci\u00f3n: empezamos desde las cifras originales.", "Aucune suite : reprise \u00e0 partir des nombres initiaux.", "No continuation: restarting from the original numbers."],
    ["Desde las cifras originales se llega m\u00e1s cerca.", "Les nombres initiaux permettent de se rapprocher davantage.", "The original numbers give a closer result."],
    ["No hay soluci\u00f3n exacta \u00b7 la m\u00e1s cercana: {value} (a {distance})", "Pas de solution exacte \u00b7 la plus proche : {value} (\u00e9cart {distance})", "No exact solution \u00b7 closest: {value} (off by {distance})"],
    ["Reproduciendo la soluci\u00f3n...", "Lecture de la solution...", "Playing the solution..."],
    ["Soluci\u00f3n introducida. Puedes deshacer cada operaci\u00f3n.", "Solution saisie. Vous pouvez annuler chaque op\u00e9ration.", "Solution entered. You can undo each operation."],
    ["Error: {message}", "Erreur : {message}", "Error: {message}"],
    ["No se pudo completar el c\u00e1lculo: {message}", "Impossible de terminer le calcul : {message}", "Could not complete the calculation: {message}"],
    ["Se han omitido datos no v\u00e1lidos de la URL. Revisa el reto.", "Des donn\u00e9es non valides ont \u00e9t\u00e9 ignor\u00e9es dans l\u2019URL. V\u00e9rifiez le d\u00e9fi.", "Invalid URL data was omitted. Check the puzzle."],
    ["Se admiten exactamente 10 letras; la URL tra\u00eda m\u00e1s y se han recortado.", "Il faut exactement 10 lettres ; celles en trop dans l\u2019URL ont \u00e9t\u00e9 retir\u00e9es.", "Exactly 10 letters are allowed; extra URL letters were trimmed."],
    ["No se pudo actualizar la direcci\u00f3n. El reto sigue disponible en esta p\u00e1gina, pero no se guardar\u00e1 al recargar.", "Impossible de mettre \u00e0 jour l\u2019adresse. Le d\u00e9fi reste disponible, mais ne sera pas conserv\u00e9 au rechargement.", "Could not update the URL. The puzzle still works but will not be saved on reload."],
    ["No se pudo guardar el idioma.", "Impossible d\u2019enregistrer la langue.", "Could not save the language preference."],
    ["El teclado admite seis n\u00fameros enteros y un objetivo.", "Le clavier accepte six nombres entiers et un objectif.", "The keypad accepts six integers and a target."],
    ["Elige un d\u00edgito del 0 al 9.", "Choisissez un chiffre de 0 \u00e0 9.", "Choose a digit from 0 to 9."],
    ["Completa el n\u00famero antes de confirmar.", "Compl\u00e9tez le nombre avant de confirmer.", "Complete the number before confirming."],
    ["Ese hueco todav\u00eda no est\u00e1 disponible.", "Cet emplacement n\u2019est pas encore disponible.", "That slot is not available yet."],
    ["Introduce enteros separados por comas o espacios, por ejemplo: -5, 2, 3, 6, 7, 10.", "Saisissez des entiers s\u00e9par\u00e9s par des espaces ou des virgules, par exemple : -5, 2, 3, 6, 7, 10.", "Enter integers separated by commas or spaces, e.g. -5, 2, 3, 6, 7, 10."],
    ["Introduce entre 6 y 9 cifras.", "Saisissez entre 6 et 9 nombres.", "Enter between 6 and 9 numbers."],
    ["El objetivo debe ser un entero; puede ser negativo.", "L\u2019objectif doit \u00eatre un entier, \u00e9ventuellement n\u00e9gatif.", "The target must be an integer; it can be negative."],
    ["Esa cifra no est\u00e1 disponible.", "Ce nombre n\u2019est pas disponible.", "That number is not available."],
    ["Elige dos botones distintos.", "Choisissez deux boutons distincts.", "Choose two different buttons."],
    ["No se puede dividir entre cero. Elige otra cifra.", "Impossible de diviser par z\u00e9ro. Choisissez un autre nombre.", "Cannot divide by zero. Choose another number."],
    ["La divisi\u00f3n debe ser exacta, sin fracciones. Elige otra cifra o deshaz para cambiar la operaci\u00f3n.", "La division doit \u00eatre exacte, sans fraction. Choisissez un autre nombre ou annulez pour changer l\u2019op\u00e9ration.", "Division must be exact, with no fractions. Choose another number or undo to change the operation."],
    ["Elige primero un bot\u00f3n.", "Choisissez d\u2019abord un nombre.", "Choose a number first."],
    ["Idioma no compatible.", "Langue non prise en charge.", "Unsupported language."],
    ["No se pudo descargar el diccionario (HTTP {status}).", "Impossible de t\u00e9l\u00e9charger le dictionnaire (HTTP {status}).", "Could not download the dictionary (HTTP {status})."],
    ["Se agot\u00f3 el tiempo de descarga del diccionario.", "Le t\u00e9l\u00e9chargement du dictionnaire a expir\u00e9.", "Dictionary download timed out."],
    ["No se pudo descargar o interpretar el diccionario.", "Impossible de charger ou de lire le dictionnaire.", "Could not download or parse the dictionary."],
    ["El diccionario ortogr\u00e1fico est\u00e1 incompleto.", "Le dictionnaire est incomplet.", "The dictionary is incomplete."],
    ["El diccionario ortogr\u00e1fico est\u00e1 vac\u00edo.", "Le dictionnaire est vide.", "The dictionary is empty."],
    ["Introduce letras del espa\u00f1ol, juntas o separadas por espacios o comas. No se admiten cifras ni signos de puntuaci\u00f3n.", "Saisissez des lettres fran\u00e7aises, ensemble ou s\u00e9par\u00e9es par des espaces ou des virgules.", "Enter English letters, together or separated by spaces or commas."],
    ["El diccionario debe usar texto e indicadores UTF-8.", "Le dictionnaire doit utiliser UTF-8.", "The dictionary must use UTF-8 text and flags."],
    ["Directiva de diccionario no compatible: {value}", "Directive de dictionnaire non prise en charge : {value}", "Unsupported dictionary directive: {value}"],
    ["Grupo de afijos duplicado: {value}", "Groupe d\u2019affixes en double : {value}", "Duplicate affix group: {value}"],
    ["Afijo de diccionario no v\u00e1lido: {value}", "Affixe de dictionnaire non valide : {value}", "Invalid dictionary affix: {value}"],
    ["Grupo de afijos incompleto: {value}", "Groupe d\u2019affixes incomplet : {value}", "Incomplete affix group: {value}"],
    ["Indicador de diccionario desconocido: {value}", "Indicateur de dictionnaire inconnu : {value}", "Unknown dictionary flag: {value}"],
    ["Las reglas de continuaci\u00f3n de prefijos no son compatibles.", "Les continuations de pr\u00e9fixes ne sont pas prises en charge.", "Prefix continuation rules are not supported."]
  ];
  const messages = new Map(rows.map(([es, fr, en]) => [es, { es, fr, en }]));
  const patterns = rows.filter(([source]) => source.includes("{")).map(([source]) => {
    const names = [...source.matchAll(/\{(\w+)\}/g)].map(match => match[1]);
    const escaped = source.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{(\w+)\}/g, "(.+?)");
    return { source, names, pattern: new RegExp("^" + escaped + "$", "u") };
  });
  let locale = "es";

  function translate(source, values = {}, language = locale) {
    let message = messages.get(source);
    if (!message && language !== "es") {
      for (const entry of patterns) {
        const match = source.match(entry.pattern);
        if (!match) continue;
        message = messages.get(entry.source);
        values = Object.fromEntries(entry.names.map((name, index) => [name, translate(match[index + 1], {}, language)]));
        break;
      }
    }
    return (message ? message[language] : source).replace(/\{(\w+)\}/g, (match, key) => values[key] === undefined ? match : String(values[key]));
  }

  function setLocale(language) {
    if (!["es", "fr", "en"].includes(language)) throw new Error("Unsupported language");
    if (locale === language) return;
    locale = language;
    document.documentElement.lang = language;
    for (const { node, source, attribute } of staticContent) {
      if (!node.isConnected) continue;
      if (attribute) node.setAttribute(attribute, translate(source));
      else node.nodeValue = translate(source);
    }
    document.title = translate("Cifras y Letras");
    document.getElementById("lp-box").lang = language;
    updateSelector();
    document.dispatchEvent(new CustomEvent("languagechange"));
  }

  const staticContent = [];
  function updateSelector() {
    document.getElementById("language-button").firstChild.nodeValue = locale.toUpperCase();
    document.getElementById("language-button").setAttribute("aria-label", translate("Idioma") + ": " + locale.toUpperCase());
    for (const option of document.querySelectorAll("[data-language]")) option.setAttribute("aria-checked", String(option.dataset.language === locale));
  }

  if (typeof document !== "undefined") {
    const walker = document.createTreeWalker(document.querySelector("main"), NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const source = walker.currentNode.nodeValue;
      if (source.trim()) staticContent.push({ node: walker.currentNode, source });
    }
    for (const node of document.querySelectorAll("main [aria-label], main [title]")) {
      for (const attribute of ["aria-label", "title"]) {
        if (node.hasAttribute(attribute)) staticContent.push({ node, attribute, source: node.getAttribute(attribute) });
      }
    }
    const toggle = document.getElementById("language-button");
    const menu = document.getElementById("language-menu");
    const close = (focus = false) => {
      menu.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      if (focus) toggle.focus();
    };
    const open = () => {
      menu.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      menu.querySelector(`[data-language="${locale}"]`).focus();
    };
    toggle.onclick = () => menu.hidden ? open() : close();
    for (const option of menu.querySelectorAll("[data-language]")) option.onclick = () => {
      setLocale(option.dataset.language);
      try { localStorage.setItem("puzzle-language", locale); }
      catch (error) {
        console.error(translate("No se pudo guardar el idioma."), error);
        const id = document.getElementById("letters-tab").getAttribute("aria-selected") === "true" ? "letters-status" : "status";
        document.getElementById(id).textContent = translate("No se pudo guardar el idioma.");
      }
      close(true);
    };
    document.addEventListener("click", event => { if (!event.target.closest(".language-control")) close(); });
    document.addEventListener("keydown", event => {
      if (!event.target.closest(".language-control")) return;
      const options = [...menu.querySelectorAll("[data-language]")];
      if (event.key === "Escape") { event.preventDefault(); close(true); }
      else if (event.key === "Tab") close();
      else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        if (menu.hidden) open();
        else {
          const index = options.indexOf(document.activeElement);
          const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 :
            (index + (event.key === "ArrowUp" ? -1 : 1) + options.length) % options.length;
          options[next].focus();
        }
      }
    });
    let initial = new URLSearchParams(location.search).get("lang");
    if (!initial && !/[?&](l|n|obj)=/.test(location.search)) {
      try { initial = localStorage.getItem("puzzle-language"); }
      catch (error) { console.error("Could not read language preference:", error); }
    }
    setLocale(["fr", "en"].includes(initial) ? initial : "es");
    updateSelector();
  }
  return { get locale() { return locale; }, setLocale, translate, messages };
})();

const tr = (source, values) => I18n.translate(source, values);
if (typeof module !== "undefined") module.exports = I18n;
