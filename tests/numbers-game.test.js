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
  game.execute();
  assert.equal(game.state.current, 4n);
  assert.deepEqual(game.state.used, [0, 1]);
  assert.throws(() => game.chooseNumber(0), /disponible/);
  game.undo();
  assert.equal(game.state.current, 2n);
  assert.equal(game.state.pending, 2n);
  game.undo();
  assert.deepEqual(game.state.used, [0]);
  assert.equal(game.state.pending, null);
  game.undo();
  assert.equal(game.state.operator, null);
  game.undo();
  assert.equal(game.state.current, null);
  assert.deepEqual(game.state.used, []);
  game.undo();
  assert.equal(game.state.current, null);
});

test("fractional division and division by zero fail without altering state", () => {
  const game = new Game([5n, 2n, 0n, 3n, 4n, 6n], 1n);
  game.chooseNumber(0);
  game.chooseOperator("/");
  game.chooseNumber(1);
  const before = structuredClone(game.state);
  assert.throws(() => game.execute(), /sin fracciones/);
  assert.deepEqual(game.state, before);
  game.undo();
  game.chooseNumber(2);
  assert.throws(() => game.execute(), /entre cero/);
  while (game.history.length) game.undo();
  assert.equal(game.history.length, 0);
  assert.deepEqual(game.state.used, []);
});

test("supports negatives, exact large integers and sequential steps", () => {
  const game = new Game([5n, 2n, 900719925474099312345n, 0n, 3n, 6n], -3n);
  game.chooseNumber(1);
  game.chooseOperator("-");
  game.chooseNumber(0);
  game.execute();
  assert.equal(game.state.current, -3n);
  game.chooseOperator("*");
  game.chooseNumber(2);
  game.execute();
  assert.equal(game.state.current, -2702159776422297937035n);
  assert.equal(game.state.steps.length, 2);
  while (game.history.length) game.undo();
  game.chooseNumber(5);
  game.chooseOperator("/");
  game.chooseNumber(1);
  game.execute();
  assert.equal(game.state.current, 3n);
});
