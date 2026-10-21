"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const solver = require("../letters-core.js");
const root = path.join(__dirname, "..");
const aff = fs.readFileSync(path.join(root, "data", "es_ES.aff"), "utf8");
const dic = fs.readFileSync(path.join(root, "data", "es_ES.dic"), "utf8");
const dictionary = solver.parseDictionary(aff, dic);

test("normalizes vowels and diaeresis but preserves composed and decomposed enye", () => {
  assert.equal(solver.parseLetters(" A, \u00c1 E\u0301 \u00cd \u00d3 \u00da \u00dc N N\u0303 "), "aaeiouunñ");
  for (const input of ["", " , ", "abc1", "a-b", "ç", "a.b"]) {
    assert.throws(() => solver.parseLetters(input), /Introduce letras/);
  }
});

test("finds all globally longest matches, respecting repeated letters and optional inputs", () => {
  const fixture = solver.parseDictionary(
    "SET UTF-8\nFLAG UTF-8\nSFX S Y 1\nSFX S 0 s .",
    "4\nas\ncasa/S\nsaca/S\ncasaca"
  );
  const words = ["as", "casa", "casas", "saca", "sacas", "casaca"];
  for (const rack of ["cas", "casa", "casas", "casaca", "casacaz", "zz", "sacas", "aaacss"]) {
    const fits = word => {
      let remaining = rack;
      for (const letter of word) {
        const index = remaining.indexOf(letter);
        if (index < 0) return false;
        remaining = remaining.slice(0, index) + remaining.slice(index + 1);
      }
      return true;
    };
    const candidates = words.filter(fits);
    const length = Math.max(0, ...candidates.map(word => word.length));
    const expected = candidates.filter(word => word.length === length).sort();
    const actual = solver.search(fixture, rack);
    assert.equal(actual.length, length);
    assert.deepEqual(actual.matches.map(match => match.word).sort(), expected);
  }
});

test("supports suffix continuations and prefix/suffix cross-products", () => {
  const fixture = solver.parseDictionary(
    "SET UTF-8\nFLAG UTF-8\nPFX p Y 1\nPFX p 0 des .\nSFX G Y 1\nSFX G o a/S o\nSFX S Y 1\nSFX S 0 s .",
    "1\ncanto/pGS"
  );
  assert.deepEqual(solver.search(fixture, "descantas").matches, [{ word: "descantas", lemma: "canto" }]);
  assert.deepEqual(solver.search(fixture, "cantas").matches, [{ word: "cantas", lemma: "canto" }]);
});

test("rejects corrupt or unsupported dictionary data instead of using partial data", () => {
  assert.throws(() => solver.parseDictionary(aff, "2\ncasa"), /incompleto/);
  assert.throws(() => solver.parseDictionary("SET UTF-8\nFLAG UTF-8\nNEEDAFFIX x", "1\ncasa"), /no compatible/);
  assert.throws(() => solver.parseDictionary("SET UTF-8\nFLAG UTF-8\nSFX S Y 2\nSFX S 0 s .", "1\ncasa/S"), /afijos incompleto/);
});

test("real RLA-ES forms include conjugations, irregular verbs, plurals and diaeresis", () => {
  for (const [rack, word, lemma] of [
    ["cantabamos", "cantábamos", "cantar"],
    ["tuvieron", "tuvieron", "tener"],
    ["camiones", "camiones", "camión"],
    ["niños", "niños", "niño"],
    ["pinguino", "pingüino", "pingüino"]
  ]) {
    const result = solver.search(dictionary, rack);
    assert.equal(result.length, rack.length);
    assert.ok(result.matches.some(match => match.word === word && match.lemma === lemma), word);
    for (const match of result.matches) {
      const remaining = [...rack];
      for (const letter of solver.normalize(match.word)) {
        const index = remaining.indexOf(letter);
        assert.ok(index >= 0, `${match.word} overuses ${letter}`);
        remaining.splice(index, 1);
      }
    }
  }
  assert.ok(!solver.search(dictionary, "ninos").matches.some(match => match.word === "niños"));
  assert.deepEqual(solver.search(dictionary, "qzx").matches, []);
});

test("worker reports download errors and supports a subsequent retry", async () => {
  const messages = [];
  let fail = true;
  let requests = 0;
  const context = {
    self: { postMessage: message => messages.push(message) },
    importScripts() {},
    LettersSolver: solver,
    AbortController,
    setTimeout,
    clearTimeout,
    fetch: async url => {
      requests++;
      return {
        ok: !fail,
        status: fail ? 503 : 200,
        text: async () => url.endsWith(".aff") ? aff : dic
      };
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, "letters-worker.js"), "utf8"), context);
  await context.self.onmessage({ data: { letters: "niños" } });
  assert.equal(messages.at(-1).type, "error");
  assert.match(messages.at(-1).message, /HTTP 503/);
  fail = false;
  await context.self.onmessage({ data: { letters: "niños" } });
  assert.equal(messages.at(-1).type, "done");
  assert.equal(messages.at(-1).result.matches[0].word, "niños");
  const loadedRequests = requests;
  await context.self.onmessage({ data: { letters: "pinguino" } });
  assert.equal(messages.at(-1).result.matches[0].word, "pingüino");
  assert.equal(requests, loadedRequests, "Later searches reuse the loaded dictionary");
});

test("worker exposes download timeout and malformed data errors in Spanish", async () => {
  for (const timeout of [true, false]) {
    const messages = [];
    const context = {
      self: { postMessage: message => messages.push(message) },
      importScripts() {},
      LettersSolver: solver,
      AbortController,
      setTimeout: callback => { if (timeout) queueMicrotask(callback); return 1; },
      clearTimeout() {},
      fetch: async (url, { signal }) => {
        if (!timeout) return { ok: true, text: async () => url.endsWith(".aff") ? aff : "2\ncasa" };
        return new Promise((resolve, reject) => {
          signal.addEventListener("abort", () => reject(Object.assign(new Error(), { name: "AbortError" })));
        });
      }
    };
    vm.runInNewContext(fs.readFileSync(path.join(root, "letters-worker.js"), "utf8"), context);
    await context.self.onmessage({ data: { letters: "casa" } });
    assert.equal(messages.at(-1).type, "error");
    assert.match(messages.at(-1).message, timeout ? /tiempo de descarga/ : /incompleto/);
  }
});

test("serialized numbers worker finds exact general integer solutions", () => {
  const source = fs.readFileSync(path.join(root, "numbers-search.js"), "utf8");
  function solve(numbers, target) {
    const messages = [];
    const context = { self: { postMessage: message => messages.push(message) } };
    vm.runInNewContext(source + "\nnumbersSearchWorker();", context);
    context.self.onmessage({ data: { numbers: numbers.map(String), target: String(target) } });
    return messages.at(-1).solution;
  }
  for (const [numbers, target] of [
    [[25, 50, 3, 6, 7, 8], 952],
    [[-5, 2, 3, 6, 7, 10], -50],
    [[2, 2, 0, 0, 0, 0], 4],
    [["9007199254740993", 2, 0, 0, 0, 0], "18014398509481986"]
  ]) {
    const solution = solve(numbers, target);
    assert.ok(solution);
    assert.equal(new Set(solution.usedIndices).size, solution.used);
    assert.ok(solution.usedIndices.every(index => index >= 0 && index < numbers.length));
    const remaining = new Map(numbers.map((value, index) => [`input:${index}`, BigInt(value)]));
    const consume = (id, operand) => {
      assert.equal(remaining.get(id), operand, `Input ${id} was unavailable`);
      remaining.delete(id);
    };
    for (const step of solution.steps) {
      const { left, operator, right, value: output } = step;
      const a = BigInt(left), b = BigInt(right), value = BigInt(output);
      consume(step.leftId, a); consume(step.rightId, b);
      if (operator === "+") assert.equal(a + b, value);
      if (operator === "-") assert.equal(a - b, value);
      if (operator === "*") assert.equal(a * b, value);
      if (operator === "/") { assert.notEqual(b, 0n); assert.equal(a % b, 0n); assert.equal(a / b, value); }
      remaining.set(step.id, value);
    }
    assert.ok([...remaining.values()].includes(BigInt(target)));
  }
  assert.equal(solve([25, 50, 3, 6, 7, 8], 25).steps.length, 0);
  assert.equal(solve([0, 0, 0, 0, 0, 0], 1), null);
});
