"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { decode, encode } = require("../puzzle-url.js");

test("URL round-trips exact duplicate, signed and 180-digit numbers and both tabs", () => {
  for (const mode of ["cifras", "letras"]) {
    const puzzle = {
      mode, numbers: ["+002", "-5", "-5", "0", "9".repeat(180), "-900719925474099312345"],
      target: "-" + "8".repeat(180), letters: "A\u0301\u00fc\u00f1\u00f1aa".normalize("NFC"), manual: mode === "cifras"
    };
    const search = encode(puzzle, "?extra=kept");
    assert.ok(search.includes("n=%2B002,-5,-5,0,"));
    assert.equal(new URLSearchParams(search).get("extra"), "kept");
    assert.deepEqual(decode(search), { ...puzzle, invalid: false });
  }
});

test("partial valid puzzles remain partially filled without opening the calculator", () => {
  assert.deepEqual(decode("?modo=letras&n=2,2&l=ni%C3%B1os"), {
    mode: "letras", numbers: ["2", "2"], target: "", letters: "ni\u00f1os", manual: false, invalid: false
  });
  assert.deepEqual(decode(""), { mode: "cifras", numbers: [], target: "", letters: "", manual: false, invalid: false });
});

test("malformed or out-of-range URL values are rejected visibly and without HTML parsing", () => {
  for (const search of [
    "?modo=other&yo=1",
    "?n=1,2,x,3,4,5,6,7,8,9,10&obj=1.5&l=%3Cscript%3E",
    "?n=1&n=2&yo=wrong",
    "?l=%E0%A4%A&obj=%",
    "?modo=letras&yo=1&n=1,2,3,4,5,6&obj=9"
  ]) {
    const puzzle = decode(search);
    assert.equal(puzzle.invalid, true, search);
    assert.ok(puzzle.numbers.length <= 6);
    assert.ok(puzzle.numbers.every(value => /^[+-]?\d+$/.test(value)));
    assert.equal(puzzle.manual, false);
  }
});

test("removing inputs removes obsolete query keys, while accents and enye remain exact", () => {
  const puzzle = decode("?modo=letras&l=N%CC%83,%20A%CC%81,%20%C3%BC,aa");
  assert.equal(puzzle.letters, "\u00d1\u00c1\u00fcaa");
  const result = encode({ mode: "cifras", numbers: [], letters: "", target: "", manual: false }, "?l=old&n=1&obj=2&yo=1");
  assert.equal(result, "?modo=cifras");
});

test("yo=1 opens the Letras solver only with exactly ten letters", () => {
  const puzzle = decode("?modo=letras&l=camionesta&yo=1");
  assert.equal(puzzle.manual, true);
  assert.equal(puzzle.invalid, false);
  assert.equal(encode(puzzle), "?modo=letras&l=camionesta&yo=1");
  for (const search of ["?modo=letras&l=camion&yo=1", "?modo=letras&yo=1"]) {
    assert.equal(decode(search).manual, false, search);
    assert.equal(decode(search).invalid, true, search);
  }
});

test("URL letters are capped at ten", () => {
  const puzzle = decode("?modo=letras&l=" + "abcdefghijklmn");
  assert.equal(puzzle.letters, "abcdefghij");
  assert.equal(puzzle.invalid, true);
  assert.equal(decode("?modo=letras&l=abcdefghi%C3%B1").letters, "abcdefghi\u00f1");
  assert.equal(decode("?modo=letras&l=abcdefghi%C3%B1").invalid, false);
});
