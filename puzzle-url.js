"use strict";

const PuzzleUrl = (() => {
  const integer = /^[+-]?\d+$/;
  function decode(search) {
    const params = new URLSearchParams(search);
    let invalid = ["modo", "n", "obj", "l", "yo", "lang"].some(key => params.getAll(key).length > 1);
    let language = params.get("lang") || "es";
    if (!["es", "fr", "en"].includes(language)) { language = "es"; invalid = true; }
    const mode = params.get("modo") || "cifras";
    if (!["cifras", "letras"].includes(mode)) invalid = true;
    const numbers = [];
    for (const token of (params.get("n") || "").trim().split(/[\s,]+/).filter(Boolean)) {
      if (integer.test(token) && numbers.length < 6) numbers.push(token);
      else invalid = true;
    }
    let target = (params.get("obj") || "").trim();
    if (target && !integer.test(target)) { target = ""; invalid = true; }
    let letters = (params.get("l") || "").replace(/[\s,]/gu, "").normalize("NFC");
    const letterPattern = language === "es" ? /^[a-z\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc\u00f1]*$/iu :
      language === "fr" ? /^[a-z\u00e0\u00e2\u00e4\u00e6\u00e7\u00e9\u00e8\u00ea\u00eb\u00ee\u00ef\u00f4\u00f6\u0153\u00f9\u00fb\u00fc\u00ff]*$/iu : /^[a-z]*$/iu;
    if (!letterPattern.test(letters)) {
      letters = "";
      invalid = true;
    }
    if (language === "fr") letters = letters.replace(/\u0153/g, "oe").replace(/\u0152/g, "OE").replace(/\u00e6/g, "ae").replace(/\u00c6/g, "AE");
    if ([...letters].length > 10) {
      letters = [...letters].slice(0, 10).join("");
      invalid = true;
    }
    const manualValue = params.get("yo");
    if (manualValue !== null && !["0", "1"].includes(manualValue)) invalid = true;
    let manual = manualValue === "1";
    const complete = mode === "letras" ? [...letters].length === 10 : mode === "cifras" && numbers.length === 6 && target !== "";
    if (manual && !complete) {
      manual = false;
      invalid = true;
    }
    return { mode: mode === "letras" ? "letras" : "cifras", language, numbers, target, letters, manual, invalid };
  }
  function encode(puzzle, search = "") {
    const params = new URLSearchParams(search);
    params.set("modo", puzzle.mode);
    if (puzzle.language && puzzle.language !== "es") params.set("lang", puzzle.language);
    else params.delete("lang");
    for (const [key, value] of [
      ["n", puzzle.numbers.join(",")], ["obj", puzzle.target], ["l", puzzle.letters], ["yo", puzzle.manual ? "1" : ""]
    ]) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    return "?" + params.toString().replace(/%2C/gi, ",");
  }
  return { decode, encode };
})();

if (typeof module !== "undefined") module.exports = PuzzleUrl;
