"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const solver = require("../letters-core.js");
const i18n = require("../i18n.js");
const { drawRandomLetters, LANGUAGE_LETTER_BAGS } = require("../keypad-model.js");
const root = path.join(__dirname, "..");
const lists = Object.fromEntries(["fr", "en"].map(language => [language, fs.readFileSync(path.join(root, "data", language + ".json"), "utf8")]));

test("every interface message has French and English translations, including interpolation and nested errors", () => {
  for (const [source, translations] of i18n.messages) {
    for (const language of ["es", "fr", "en"]) {
      assert.ok(translations[language], `${language}: ${source}`);
      const placeholders = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
      const expected = placeholders(source);
      if (source.startsWith("Consultar")) continue;
      assert.deepEqual(placeholders(translations[language]), expected);
    }
  }
  assert.equal(i18n.translate("Objetivo", {}, "fr"), "Objectif");
  assert.equal(i18n.translate("Buscando con hasta 3 operaciones (123 estados)...", {}, "en"), "Searching up to 3 operations (123 states)...");
  assert.equal(i18n.translate("Error: No se puede dividir entre cero. Elige otra cifra.", {}, "fr"), "Erreur : Impossible de diviser par z\u00e9ro. Choisissez un autre nombre.");
  assert.equal(i18n.translate("Las m\u00e1s largas \u00b7 {count} {unit}", { count: 7, unit: "letters" }, "en"), "Longest words \u00b7 7 letters");
});

test("French normalization handles accents, cedilla, diaeresis and ligatures without changing Spanish or English rules", () => {
  assert.equal(solver.parseLetters("\u00c9 \u00e8 \u00ea \u00e0 \u00e2 \u00e7 \u00ee \u00ef \u00f4 \u00f9 \u00fb \u00fc \u00ff \u0153 \u00e6", "fr"), "eee aaciiouuuyoeae".replace(/ /g, ""));
  assert.equal(solver.parseLetters("N N\u0303"), "n\u00f1");
  for (const [language, input] of [["fr", "ni\u00f1o"], ["en", "\u00e9cole"], ["en", "ni\u00f1o"], ["es", "\u00e7"]]) {
    assert.throws(() => solver.parseLetters(input, language));
  }
});

test("real French and English word lists validate words and all longest results against the same rack", () => {
  for (const [language, rack, expected] of [["fr", "relations", "relations"], ["fr", "garcon", "gar\u00e7on"], ["en", "countdown", "countdown"]]) {
    const dictionary = solver.parseWordList(lists[language], language);
    const result = solver.search(dictionary, rack, undefined, { all: true });
    const valid = new Map(result.valid.map(([key, word]) => [key, word]));
    assert.ok(valid.has(solver.normalize(expected, language)), expected);
    assert.ok(result.matches.every(match => valid.has(solver.normalize(match.word, language))));
    for (const [key] of result.valid) {
      const remaining = [...rack];
      for (const letter of key) {
        const index = remaining.indexOf(letter);
        assert.ok(index >= 0);
        remaining.splice(index, 1);
      }
    }
    assert.equal(result.length, rack.length);
  }
  const fixture = solver.parseWordList('["c\u0153ur","coeur","Paris","a-b","a b","gar\u00e7ons"]', "fr");
  assert.equal(solver.search(fixture, "coeur").length, 5);
  assert.deepEqual(solver.search(fixture, "coeur").matches.map(match => match.word).sort(), ["coeur", "c\u0153ur"].sort());
  assert.deepEqual(solver.search(fixture, "paris").matches, []);
  for (const corrupt of ["{}", "[]", '["ok",null]', '[""]', "["]) assert.throws(() => solver.parseWordList(corrupt, "fr"));
});

test("language-specific random bags keep ten tiles, 3-6 vowels and at most two of each consonant", () => {
  for (const language of ["fr", "en"]) {
    for (let run = 0; run < 400; run++) {
      const result = drawRandomLetters(Math.random, language);
      const vowels = result.filter(letter => "AEIOU".includes(letter)).length;
      assert.equal(result.length, 10);
      assert.ok(vowels >= 3 && vowels <= 6);
      assert.ok(result.every(letter => /^[A-Z]$/.test(letter)));
      const bag = Object.assign({}, ...LANGUAGE_LETTER_BAGS[language]);
      for (const letter of new Set(result)) {
        const count = result.filter(value => value === letter).length;
        assert.ok(count <= bag[letter]);
        if (!"AEIOU".includes(letter)) assert.ok(count <= 2);
      }
    }
  }
});

test("worker caches dictionaries independently, shares in-flight loads and never reuses a different language", async () => {
  const messages = [], requests = [];
  let fail = false;
  const context = {
    self: { postMessage: message => messages.push(message) },
    importScripts() {},
    LettersSolver: solver, AbortController, setTimeout, clearTimeout,
    fetch: async url => {
      requests.push(url);
      return { ok: !fail, status: 503, text: async () => lists[url.includes("fr.") ? "fr" : "en"] };
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, "letters-worker.js"), "utf8"), context);
  const send = (language, id) => context.self.onmessage({ data: { language, id, letters: "relations", all: true } });
  await Promise.all([send("fr", 1), send("fr", 2)]);
  assert.deepEqual(requests, ["data/fr.json"]);
  await send("en", 3);
  await send("fr", 4);
  assert.deepEqual(requests, ["data/fr.json", "data/en.json"]);
  assert.equal(messages.filter(message => message.type === "done").length, 4);
  await send("xx", 5);
  assert.equal(messages.at(-1).type, "error");
  assert.equal(messages.at(-1).id, 5);
  fail = true;
  const retryContext = { ...context, self: { postMessage: message => messages.push(message) } };
  vm.runInNewContext(fs.readFileSync(path.join(root, "letters-worker.js"), "utf8"), retryContext);
  await retryContext.self.onmessage({ data: { language: "en", letters: "countdown", id: 6 } });
  assert.equal(messages.at(-1).type, "error");
  fail = false;
  await retryContext.self.onmessage({ data: { language: "en", letters: "countdown", id: 7 } });
  assert.equal(messages.at(-1).type, "done");
});
