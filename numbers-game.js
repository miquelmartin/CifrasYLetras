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
      this.reset();
    }
    reset() {
      this.state = { current: null, operator: null, pending: null, reversed: false, used: [], steps: [] };
      this.history = [];
    }
    save() {
      this.history.push({ ...this.state, used: [...this.state.used], steps: [...this.state.steps] });
    }
    chooseNumber(index) {
      if (!Number.isInteger(index) || index < 0 || index >= this.numbers.length || this.state.used.includes(index)) {
        throw new Error("Esa cifra no est\u00e1 disponible.");
      }
      const state = this.state;
      if (state.current !== null && (!state.operator || state.pending !== null)) {
        throw new Error("Elige una operaci\u00f3n antes de otra cifra, o pulsa = para calcular.");
      }
      this.save();
      state.used.push(index);
      if (state.current === null) state.current = this.numbers[index];
      else state.pending = this.numbers[index];
    }
    chooseOperator(operator) {
      if (!["+", "-", "*", "/"].includes(operator) || this.state.current === null || this.state.pending !== null) {
        throw new Error("Elige primero una cifra o termina la operaci\u00f3n pendiente.");
      }
      this.save();
      this.state.operator = operator;
    }
    reverse() {
      if (this.state.pending === null) throw new Error("Elige las dos cifras antes de invertir su orden.");
      this.save();
      this.state.reversed = !this.state.reversed;
    }
    execute() {
      const state = this.state;
      if (state.pending === null || !state.operator) throw new Error("Elige una operaci\u00f3n y otra cifra.");
      const a = state.reversed ? state.pending : state.current;
      const b = state.reversed ? state.current : state.pending;
      if (state.operator === "/" && b === 0n) throw new Error("No se puede dividir entre cero. Usa Deshacer para cambiar la cifra.");
      if (state.operator === "/" && a % b !== 0n) throw new Error("La divisi\u00f3n debe ser exacta, sin fracciones. Usa Deshacer o invierte el orden.");
      const value = state.operator === "+" ? a + b : state.operator === "-" ? a - b :
        state.operator === "*" ? a * b : a / b;
      this.save();
      const symbol = { "+": "+", "-": "\u2212", "*": "\u00d7", "/": "\u00f7" }[state.operator];
      const format = number => number < 0n ? `(${number})` : String(number);
      state.steps.push(`${format(a)} ${symbol} ${format(b)} = ${value}`);
      state.current = value;
      state.operator = null;
      state.pending = null;
      state.reversed = false;
    }
    undo() {
      if (this.history.length) this.state = this.history.pop();
    }
  }
  return { parsePuzzle, Game };
})();

if (typeof module !== "undefined") module.exports = NumbersGame;
