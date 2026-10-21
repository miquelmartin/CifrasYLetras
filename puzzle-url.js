"use strict";

const PuzzleUrl = (() => {
  const integer = /^[+-]?\d+$/;
  function decode(search) {
    const params = new URLSearchParams(search);
    let invalid = ["modo", "n", "obj", "l", "yo"].some(key => params.getAll(key).length > 1);
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
    if (!/^[a-z\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc\u00f1]*$/iu.test(letters)) {
      letters = "";
      invalid = true;
    }
    const manualValue = params.get("yo");
    if (manualValue !== null && !["0", "1"].includes(manualValue)) invalid = true;
    let manual = manualValue === "1";
    if (manual && (mode !== "cifras" || numbers.length < 6 || !target)) {
      manual = false;
      invalid = true;
    }
    return { mode: mode === "letras" ? "letras" : "cifras", numbers, target, letters, manual, invalid };
  }
  function encode(puzzle, search = "") {
    const params = new URLSearchParams(search);
    params.set("modo", puzzle.mode);
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
