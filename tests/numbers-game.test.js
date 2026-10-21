"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parsePuzzle, Game } = require("../numbers-game.js");
const { NumbersSearch } = require("../numbers-search.js");

test("both solvers share exact puzzle parsing and Spanish validation", () => {
  assert.deepEqual(parsePuzzle("-5, 2 2 0 6 900719925474099312345", "-12"), {
    numbers: [-5n, 2n, 2n, 0n, 6n, 900719925474099312345n], target: -12n
  });
  for (const [numbers, target] of [["1 2", "4"], ["1 2 3 4 5 x", "4"], ["1 2 3 4 5 6", "1.5"]]) {
    assert.throws(() => parsePuzzle(numbers, target), /Introduce|objetivo/);
  }
});

function combine(game, left, operator, right) {
  game.chooseNumber(left);
  game.chooseOperator(operator);
  return game.chooseNumber(right);
}

test("merges two intermediate results and undo restores operands in place", () => {
  const game = new Game([25n, 8n, 6n, 50n, 3n, 7n], 952n);
  const a = combine(game, "input:0", "-", "input:1");
  const b = combine(game, "input:2", "+", "input:3");
  const before = [...game.state.tiles];
  const c = combine(game, a, "*", b);
  assert.equal(game.state.tiles.find(tile => tile.id === c).value, 952n);
  assert.equal(game.distance, 0n);
  assert.deepEqual(game.used.sort(), [0, 1, 2, 3]);
  assert.equal(game.state.tiles.length, 3);
  assert.equal(game.state.steps[2].leftStep, 1);
  assert.equal(game.state.steps[2].rightStep, 2);
  game.undo();
  assert.deepEqual(game.state.tiles, before);
  assert.equal(game.state.current, 56n);
  game.undo();
  game.undo();
  assert.deepEqual(game.state.tiles.map(tile => tile.id), ["input:0", "input:1", "input:2", "input:3", "input:4", "input:5"]);
  assert.equal(game.state.steps.length, 0);
  assert.deepEqual(game.used, []);
});

test("duplicate identities remain distinct and one undo reverses one operation", () => {
  const game = new Game([2n, 2n, 0n], 4n);
  const result = combine(game, "input:0", "+", "input:1");
  assert.equal(game.state.tiles[0].id, result);
  assert.equal(game.state.tiles[0].value, 4n);
  assert.equal(game.history.length, 1);
  assert.throws(() => game.chooseNumber("input:0"), /disponible/);
  game.undo();
  assert.deepEqual(game.state.tiles.map(tile => tile.id), ["input:0", "input:1", "input:2"]);
  assert.equal(game.history.length, 0);
});

test("undo clears a pending operator then operand before undoing a completed operation", () => {
  const game = new Game([2n, 3n, 4n], 9n);
  const result = combine(game, "input:0", "+", "input:1");
  game.chooseNumber(result);
  game.chooseOperator("*");
  game.undo();
  assert.equal(game.state.operator, null);
  assert.equal(game.state.selected, result);
  assert.equal(game.history.length, 1);
  game.undo();
  assert.equal(game.state.selected, null);
  assert.equal(game.history.length, 1);
  game.undo();
  assert.equal(game.history.length, 0);
  assert.equal(game.state.tiles.length, 3);
});

test("invalid divisions and same-button selection do not mutate state or consume operands", () => {
  const game = new Game([6n, 4n, 0n, 3n], 2n);
  game.chooseNumber("input:0");
  game.chooseOperator("/");
  const before = structuredClone(game.state);
  for (const [id, message] of [["input:1", /sin fracciones/], ["input:2", /entre cero/], ["input:0", /distintos/]]) {
    assert.throws(() => game.chooseNumber(id), message);
    assert.deepEqual(game.state, before);
    assert.equal(game.history.length, 0);
  }
  game.chooseNumber("input:3");
  assert.equal(game.state.current, 2n);
  assert.equal(game.state.tiles.length, 3);
});

test("exact requested flow and large negative values work without equals", () => {
  const game = new Game([5n, 3n, 6n, -900719925474099312345n], 21n);
  const a = combine(game, "input:0", "*", "input:1");
  assert.equal(game.state.current, 15n);
  assert.equal(game.distance, 6n);
  const b = combine(game, a, "+", "input:2");
  assert.equal(game.state.current, 21n);
  assert.equal(game.distance, 0n);
  combine(game, b, "*", "input:3");
  assert.equal(game.state.current, -18915118434956085559245n);
  game.undo();
  assert.equal(game.distance, 0n);
});

test("closest-button distance covers above, below, negatives, and target in any tile", () => {
  for (const [target, numbers, expected] of [
    [6n, [10n, -5n], 4n], [10n, [6n, 20n], 4n], [-6n, [-10n, 10n], 4n],
    [0n, [0n, 3n], 0n], [900719925474099312345n, [-5n], 900719925474099312350n]
  ]) {
    const game = new Game(numbers, target);
    assert.equal(game.distance, expected);
  }
});

function reference(numbers) {
  const best = new Map();
  const tables = new Map();
  for (let mask = 1; mask < 1 << numbers.length; mask++) {
    const values = new Set();
    if ((mask & (mask - 1)) === 0) values.add(numbers[Math.log2(mask)]);
    for (let left = (mask - 1) & mask; left; left = (left - 1) & mask) {
      const right = mask ^ left;
      if (!right || left > right) continue;
      for (const a of tables.get(left) || []) for (const b of tables.get(right) || []) {
        values.add(a + b); values.add(a - b); values.add(b - a); values.add(a * b);
        if (b !== 0n && a % b === 0n) values.add(a / b);
        if (a !== 0n && b % a === 0n) values.add(b / a);
      }
    }
    tables.set(mask, values);
    const operations = mask.toString(2).replace(/0/g, "").length - 1;
    for (const value of values) if (!best.has(value) || operations < best.get(value)) best.set(value, operations);
  }
  return best;
}

test("general solver shortest answers match exhaustive independent subset reference", () => {
  for (const numbers of [[1n, 2n, 3n], [-2n, 0n, 3n, 3n], [2n, 2n, 3n, 4n], [1n, 2n, 3n, 4n, 5n]]) {
    const expected = reference(numbers);
    for (let target = -15n; target <= 45n; target++) {
      const { solution } = NumbersSearch.solve(numbers.map(String), String(target));
      assert.equal(solution?.steps.length ?? null, expected.get(target) ?? null, `${numbers} -> ${target}`);
      if (solution) {
        const game = new Game(numbers, target);
        const ids = new Map(game.state.tiles.map(tile => [tile.id, tile.id]));
        for (const step of solution.steps) ids.set(step.id, combine(game, ids.get(step.leftId), step.operator, ids.get(step.rightId)));
        assert.equal(game.distance, 0n);
      }
    }
  }
});

test("general search solves the two-results 952 example in three operations", () => {
  const { solution } = NumbersSearch.solve(["25", "8", "6", "50"], "952");
  assert.equal(solution.steps.length, 3);
  assert.ok(solution.steps.at(-1).leftStep && solution.steps.at(-1).rightStep);
});
