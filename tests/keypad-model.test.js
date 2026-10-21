"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const NumberEntry = require("../keypad-model.js");
const type = (entry, value) => { for (const digit of value) entry.digit(digit); };

test("keypad requires exactly six numbers, then an objective; empty Enter is a no-op", () => {
  const entry = new NumberEntry();
  assert.equal(entry.enter(), false);
  assert.equal(entry.cursor, 0);
  for (const value of ["0", "25", "25", "6", "3", "7"]) {
    type(entry, value);
    entry.enter();
  }
  assert.deepEqual(entry.numbers, ["0", "25", "25", "6", "3", "7"]);
  assert.equal(entry.cursor, 6);
  assert.equal(entry.ready, false);
  assert.equal(entry.enter(), false);
  type(entry, "952");
  entry.enter();
  assert.equal(entry.target, "952");
  assert.equal(entry.ready, true);
});

test("backspace edits digits and steps back without losing other committed numbers", () => {
  const entry = new NumberEntry(["25", "8"]);
  entry.backspace();
  assert.equal(entry.cursor, 1);
  assert.equal(entry.draft, "8");
  entry.backspace();
  assert.equal(entry.draft, "");
  entry.digit("9");
  entry.enter();
  assert.deepEqual(entry.numbers, ["25", "9"]);
  entry.edit(0);
  entry.backspace(); entry.backspace();
  type(entry, "50");
  entry.enter();
  assert.deepEqual(entry.numbers, ["50", "9"]);
});

test("180-digit numbers and targets remain exact strings", () => {
  const huge = "9".repeat(180);
  const entry = new NumberEntry();
  type(entry, huge);
  entry.enter();
  for (let index = 1; index < 6; index++) { entry.digit("0"); entry.enter(); }
  type(entry, huge);
  entry.enter();
  assert.equal(entry.numbers[0], huge);
  assert.equal(entry.target, huge);
  const restored = new NumberEntry(entry.numbers, entry.target);
  assert.equal(restored.ready, true);
  restored.backspace();
  assert.equal(restored.target, huge.slice(0, -1));
});

test("UI cannot create a minus sign; legacy signed URLs remain exact and editable", () => {
  const entry = new NumberEntry();
  assert.throws(() => entry.digit("-"), /d\u00edgito/);
  assert.equal(entry.draft, "");
  assert.throws(() => new NumberEntry(Array(7).fill("1")), /seis/);
  const legacy = new NumberEntry(["-5", "2", "3", "4", "5", "6"], "25");
  assert.equal(legacy.ready, true);
  legacy.edit(0);
  legacy.backspace();
  assert.equal(legacy.enter(), false);
  assert.deepEqual(legacy.numbers, ["2", "3", "4", "5", "6"]);
  assert.deepEqual(legacy.slots, ["", "2", "3", "4", "5", "6"]);
});

test("after editing a complete puzzle, backspace deletes the target and all six numbers", () => {
  const entry = new NumberEntry(["100", "75", "50", "25", "3", "6"], "952");
  entry.edit(6);
  for (let index = 0; index < 40; index++) entry.backspace();
  assert.deepEqual(entry.numbers, []);
  assert.equal(entry.target, "");
  assert.equal(entry.draft, "");
  assert.equal(entry.cursor, 0);
  assert.deepEqual(entry.slots, ["", "", "", "", "", ""]);
  assert.equal(entry.ready, false);
});

test("deleting a middle number leaves an insertion gap that can be refilled", () => {
  const entry = new NumberEntry(["1", "2", "3", "4", "5", "6"], "21");
  entry.edit(2);
  entry.backspace();
  assert.deepEqual(entry.numbers, ["1", "2", "4", "5", "6"]);
  assert.equal(entry.inserting, true);
  assert.deepEqual(entry.slots, ["1", "2", "", "4", "5", "6"]);
  type(entry, "9");
  assert.deepEqual(entry.slots, ["1", "2", "9", "4", "5", "6"]);
  entry.enter();
  assert.deepEqual(entry.numbers, ["1", "2", "9", "4", "5", "6"]);
  assert.equal(entry.cursor, 3);
  entry.edit(6);
  entry.enter();
  assert.equal(entry.ready, true);
});
