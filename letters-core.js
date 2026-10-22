"use strict";

const LettersSolver = (() => {
  const alphabet = "abcdefghijklmnñopqrstuvwxyz";
  const wordPattern = /^[a-záéíóúüñ]+$/u;
  const splitFlags = value => value.match(/.\uFE0F?/gu) || [];

  function normalize(value) {
    return value.normalize("NFC").toLowerCase().replace(/[áéíóúü]/g,
      letter => ({ á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u" })[letter]);
  }

  function parseLetters(value) {
    const letters = normalize(value).replace(/[\s,]+/g, "");
    if (!letters || !/^[a-zñ]+$/u.test(letters)) {
      throw new Error("Introduce letras del espa\u00f1ol, juntas o separadas por espacios o comas. No se admiten cifras ni signos de puntuaci\u00f3n.");
    }
    return letters;
  }

  function parseDictionary(affText, dicText) {
    const prefixes = new Map();
    const suffixes = new Map();
    const headers = new Map();
    const ignored = new Set(["TRY", "REP", "MAP"]);
    let encoding = false;
    let flags = false;
    for (const line of affText.split(/\r?\n/)) {
      const parts = line.trim().split(/\s+/u);
      const [type, flag, strip, addition, condition] = parts;
      if (!type || type.startsWith("#")) continue;
      if (type === "SET" && flag === "UTF-8") { encoding = true; continue; }
      if (type === "FLAG" && flag === "UTF-8") { flags = true; continue; }
      if (ignored.has(type)) continue;
      if (type !== "PFX" && type !== "SFX") {
        throw new Error(`Directiva de diccionario no compatible: ${type}`);
      }
      const table = type === "PFX" ? prefixes : suffixes;
      const key = `${type}:${flag}`;
      if (parts.length === 4 && /^[YN]$/.test(strip) && /^\d+$/.test(addition)) {
        if (headers.has(key)) throw new Error(`Grupo de afijos duplicado: ${key}`);
        headers.set(key, { expected: Number(addition), cross: strip === "Y" });
        table.set(flag, []);
        continue;
      }
      if (parts.length !== 5 || !table.has(flag)) {
        throw new Error(`Afijo de diccionario no v\u00e1lido: ${line}`);
      }
      const [add, continuation = ""] = addition.split("/");
      table.get(flag).push({
        strip: strip === "0" ? "" : strip,
        add: add === "0" ? "" : add,
        continuation: splitFlags(continuation),
        condition: new RegExp(type === "PFX" ? `^(?:${condition})` : `(?:${condition})$`, "u"),
        cross: headers.get(key).cross
      });
    }
    if (!encoding || !flags) throw new Error("El diccionario debe usar texto e indicadores UTF-8.");
    for (const [key, header] of headers) {
      const [type, flag] = key.split(":");
      const table = type === "PFX" ? prefixes : suffixes;
      if (table.get(flag).length !== header.expected) {
        throw new Error(`Grupo de afijos incompleto: ${key}`);
      }
    }
    // This pinned dictionary has no prefix continuations. Reject unsupported updates.
    for (const rules of prefixes.values()) {
      if (rules.some(rule => rule.continuation.length)) {
        throw new Error("Las reglas de continuaci\u00f3n de prefijos no son compatibles.");
      }
    }
    const lines = dicText.trim().split(/\r?\n/);
    const expected = Number(lines.shift());
    if (!Number.isInteger(expected) || expected !== lines.length) {
      throw new Error("El diccionario ortogr\u00e1fico est\u00e1 incompleto.");
    }
    const entries = [];
    for (const line of lines) {
      const [word, entryFlags = ""] = line.trim().split("/");
      if (!wordPattern.test(word)) continue;
      const rootFlags = splitFlags(entryFlags);
      for (const flag of rootFlags) {
        if (!prefixes.has(flag) && !suffixes.has(flag)) {
          throw new Error(`Indicador de diccionario desconocido: ${flag}`);
        }
      }
      entries.push({ word, flags: rootFlags });
    }
    if (!entries.length || !suffixes.size) throw new Error("El diccionario ortogr\u00e1fico est\u00e1 vac\u00edo.");
    return { entries, prefixes, suffixes };
  }

  function applyRule(word, rule, prefix = false) {
    if (!rule.condition.test(word)) return null;
    if (prefix) {
      if (!word.startsWith(rule.strip)) return null;
      return rule.add + word.slice(rule.strip.length);
    }
    if (!word.endsWith(rule.strip)) return null;
    return word.slice(0, word.length - rule.strip.length) + rule.add;
  }

  function search(dictionary, supplied, progress = () => {}, { all = false } = {}) {
    const letters = parseLetters(supplied);
    const available = new Uint32Array(alphabet.length);
    for (const letter of letters) available[alphabet.indexOf(letter)]++;
    let longest = 0;
    const matches = new Map();
    // With all = true, also keep every formable word (by normalized spelling) to validate the player's words.
    const valid = new Map();
    let examined = 0;

    function consider(word, lemma) {
      if ((!all && word.length < longest) || word.length > letters.length || !wordPattern.test(word)) return;
      const normalized = normalize(word);
      const used = new Uint32Array(alphabet.length);
      for (const letter of normalized) {
        const index = alphabet.indexOf(letter);
        if (++used[index] > available[index]) return;
      }
      if (all) {
        // Prefer the unaccented spelling (mano over man\u00f3) when both forms exist.
        const known = valid.get(normalized);
        if (!known || (known[0] !== normalized && word === normalized)) valid.set(normalized, [word, lemma]);
      }
      if (word.length < longest) return;
      if (word.length > longest) { longest = word.length; matches.clear(); }
      if (!matches.has(word)) matches.set(word, lemma);
    }

    function withPrefixes(word, entry, cross) {
      consider(word, entry.word);
      if (word.length > letters.length) return;
      for (const flag of entry.flags) {
        for (const rule of dictionary.prefixes.get(flag) || []) {
          if (cross && !rule.cross) continue;
          const derived = applyRule(word, rule, true);
          if (derived !== null) consider(derived, entry.word);
        }
      }
    }

    for (const entry of dictionary.entries) {
      withPrefixes(entry.word, entry, false);
      for (const flag of entry.flags) {
        for (const rule of dictionary.suffixes.get(flag) || []) {
          const derived = applyRule(entry.word, rule);
          if (derived === null) continue;
          if (rule.cross) withPrefixes(derived, entry, true);
          else consider(derived, entry.word);
          // Hunspell permits at most two suffixes; only declared continuations apply.
          for (const nextFlag of rule.continuation) {
            for (const next of dictionary.suffixes.get(nextFlag) || []) {
              const twiceDerived = applyRule(derived, next);
              if (twiceDerived === null) continue;
              if (rule.cross && next.cross) withPrefixes(twiceDerived, entry, true);
              else consider(twiceDerived, entry.word);
            }
          }
        }
      }
      examined++;
      if (examined % 2000 === 0) progress(examined, dictionary.entries.length, longest);
    }
    return {
      length: longest,
      supplied: letters.length,
      matches: [...matches].map(([word, lemma]) => ({ word, lemma }))
        .sort((a, b) => a.word.localeCompare(b.word, "es")),
      ...(all ? { valid: [...valid].map(([key, [word, lemma]]) => [key, word, lemma]) } : {})
    };
  }

  return { normalize, parseLetters, parseDictionary, search };
})();

if (typeof module !== "undefined") module.exports = LettersSolver;
