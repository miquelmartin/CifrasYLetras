"use strict";

const NumbersGame = (() => {
  function parsePuzzle(raw, target) {
    raw = raw.trim();
    target = target.trim();
    if (!/^[+-]?\d+(?:(?:\s*,\s*|\s+)[+-]?\d+)*$/.test(raw)) {
      throw new Error("Introduce enteros separados por comas o espacios, por ejemplo: -5, 2, 3, 6, 7, 10.");
    }
    const numbers = raw.split(/[\s,]+/);
    if (numbers.length < 6 || numbers.length > 9) throw new Error("Introduce entre 6 y 9 cifras.");
    if (!/^[+-]?\d+$/.test(target)) throw new Error("El objetivo debe ser un entero; puede ser negativo.");
    return { numbers: numbers.map(BigInt), target: BigInt(target) };
  }

  class Game {
    constructor(numbers, target) {
      this.numbers = numbers;
      this.target = target;
      this.state = {
        tiles: numbers.map((value, index) => ({ id: `input:${index}`, value, originals: [index], step: null })),
        selected: null, operator: null, current: null, steps: [], lastResultId: null
      };
      this.history = [];
      this.serial = 0;
    }
    chooseNumber(id) {
      const state = this.state;
      const tile = state.tiles.find(tile => tile.id === id);
      if (!tile) throw new Error("Esa cifra no est\u00e1 disponible.");
      if (state.selected === null || !state.operator) {
        state.selected = id;
        return null;
      }
      const left = state.tiles.find(tile => tile.id === state.selected);
      if (left.id === id) throw new Error("Elige dos botones distintos.");
      const a = left.value, b = tile.value, operator = state.operator;
      if (operator === "/" && b === 0n) throw new Error("No se puede dividir entre cero. Elige otra cifra.");
      if (operator === "/" && a % b !== 0n) throw new Error("La divisi\u00f3n debe ser exacta, sin fracciones. Elige otra cifra o deshaz para cambiar la operaci\u00f3n.");
      const value = operator === "+" ? a + b : operator === "-" ? a - b : operator === "*" ? a * b : a / b;
      const step = state.steps.length + 1;
      const result = {
        id: `result:${++this.serial}`, value,
        originals: [...left.originals, ...tile.originals], step
      };
      this.history.push({
        ...state, tiles: [...state.tiles], steps: [...state.steps], selected: null, operator: null
      });
      const position = Math.min(state.tiles.indexOf(left), state.tiles.indexOf(tile));
      state.tiles = state.tiles.filter(node => node !== left && node !== tile);
      state.tiles.splice(position, 0, result);
      state.steps.push({
        id: result.id, leftId: left.id, rightId: tile.id,
        left: String(a), right: String(b), leftStep: left.step, rightStep: tile.step,
        operator, value: String(value)
      });
      state.current = value;
      state.selected = null;
      state.operator = null;
      state.lastResultId = result.id;
      return result.id;
    }
    chooseOperator(operator) {
      if (!["+", "-", "*", "/"].includes(operator) || this.state.selected === null || this.state.operator !== null) {
        throw new Error("Elige primero un bot\u00f3n.");
      }
      this.state.operator = operator;
    }
    get used() {
      return this.state.tiles.filter(tile => tile.step !== null).flatMap(tile => tile.originals);
    }
    get distance() {
      return this.state.tiles.reduce((closest, tile) => {
        const difference = this.target - tile.value;
        const distance = difference < 0n ? -difference : difference;
        return closest === null || distance < closest ? distance : closest;
      }, null);
    }
    undo() {
      if (this.state.operator !== null) this.state.operator = null;
      else if (this.state.selected !== null) this.state.selected = null;
      else if (this.history.length) this.state = this.history.pop();
      else {
        this.state.selected = null;
        this.state.operator = null;
        this.state.current = null;
      }
    }
  }
  return { parsePuzzle, Game };
})();

if (typeof module !== "undefined") module.exports = NumbersGame;
