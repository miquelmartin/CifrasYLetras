"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parsePuzzle, Game } = require("../numbers-game.js");

test("both solvers share exact puzzle parsing and Spanish validation", () => {
  assert.deepEqual(parsePuzzle("-5, 2 2 0 6 900719925474099312345", "-12"), {
    numbers: [-5n, 2n, 2n, 0n, 6n, 900719925474099312345n], target: -12n
  });
  for (const [numbers, target] of [["1 2", "4"], ["1 2 3 4 5 x", "4"], ["1 2 3 4 5 6", "1.5"]]) {
    assert.throws(() => parsePuzzle(numbers, target), /Introduce|objetivo/);
  }
});

test("duplicate numbers retain identity and each selection can be undone", () => {
  const game = new Game([2n, 2n, 0n, 3n, 4n, 5n], 4n);
  game.chooseNumber(0);
  game.chooseOperator("+");
  game.chooseNumber(1);
  assert.equal(game.state.current, 4n);
  assert.deepEqual(game.state.used, [0, 1]);
  assert.throws(() => game.chooseNumber(0), /disponible/);
  game.undo();
  assert.equal(game.state.current, 2n);
  assert.deepEqual(game.state.used, [0]);
  assert.equal(game.state.operator, "+");
  game.undo();
  assert.equal(game.state.operator, null);
  game.undo();
  assert.equal(game.state.current, null);
  assert.deepEqual(game.state.used, []);
  game.undo();
  assert.equal(game.state.current, null);
});

test("fractional division and division by zero fail without altering state", () => {
  const game = new Game([6n, 4n, 0n, 3n, 2n, 5n], 2n);
  game.chooseNumber(0);
  game.chooseOperator("/");
  const before = structuredClone(game.state);
  const historyLength = game.history.length;
  assert.throws(() => game.chooseNumber(1), /sin fracciones/);
  assert.deepEqual(game.state, before);
  assert.equal(game.history.length, historyLength);
  assert.throws(() => game.chooseNumber(2), /entre cero/);
  assert.deepEqual(game.state, before);
  game.chooseNumber(3);
  assert.equal(game.state.current, 2n);
  assert.deepEqual(game.state.used, [0, 3]);
  while (game.history.length) game.undo();
  assert.equal(game.history.length, 0);
  assert.deepEqual(game.state.used, []);
});

test("supports negatives, exact large integers and sequential steps", () => {
  const game = new Game([5n, 2n, 900719925474099312345n, 0n, 3n, 6n], -3n);
  game.chooseNumber(1);
  game.chooseOperator("-");
  game.chooseNumber(0);
  assert.equal(game.state.current, -3n);
  game.chooseOperator("*");
  game.chooseNumber(2);
  assert.equal(game.state.current, -2702159776422297937035n);
  assert.equal(game.state.steps.length, 2);
  while (game.history.length) game.undo();
  game.chooseNumber(5);
  game.chooseOperator("/");
  game.chooseNumber(1);
  assert.equal(game.state.current, 3n);
});

test("requested 5 times 3 then plus 6 flow evaluates on each number click", () => {
  const game = new Game([5n, 3n, 6n, 0n, 2n, 2n], 21n);
  assert.equal(game.distance, null);
  game.chooseNumber(0);
  assert.equal(game.distance, 16n);
  game.chooseOperator("*");
  game.chooseNumber(1);
  assert.equal(game.state.current, 15n);
  assert.equal(game.distance, 6n);
  game.chooseOperator("+");
  game.chooseNumber(2);
  assert.equal(game.state.current, 21n);
  assert.equal(game.distance, 0n);
  game.undo();
  assert.equal(game.state.current, 15n);
  assert.equal(game.state.operator, "+");
  assert.deepEqual(game.state.used, [0, 1]);
  assert.equal(game.distance, 6n);
});

test("absolute distance covers above, below, negatives and very large targets", () => {
  for (const [target, current, distance] of [[6n, 10n, 4n], [10n, 6n, 4n],
    [-6n, -10n, 4n], [-10n, 6n, 16n], [0n, 0n, 0n],
    [900719925474099312345n, -5n, 900719925474099312350n]]) {
    const game = new Game([current], target);
    game.chooseNumber(0);
    assert.equal(game.distance, distance);
    game.undo();
    assert.equal(game.distance, null);
  }
});
