"use strict";

class NumberEntry {
  constructor(numbers = [], target = "") {
    if (numbers.length > 6 || numbers.some(value => !/^[+-]?\d+$/.test(value)) ||
        (target && !/^[+-]?\d+$/.test(target))) throw new Error("El teclado admite seis n\u00fameros enteros y un objetivo.");
    this.numbers = [...numbers];
    this.target = target;
    this.cursor = Math.min(numbers.length, 6);
    this.draft = this.cursor === 6 ? target : "";
    this.ready = numbers.length === 6 && target !== "";
  }
  digit(value) {
    if (!/^\d$/.test(value)) throw new Error("Elige un d\u00edgito del 0 al 9.");
    this.ready = false;
    this.draft += value;
    if (this.cursor === 6) this.target = this.draft;
  }
  enter() {
    if (!this.draft) return false;
    if (!/^[+-]?\d+$/.test(this.draft)) throw new Error("Completa el n\u00famero antes de confirmar.");
    if (this.cursor < 6) {
      this.numbers[this.cursor++] = this.draft;
      this.draft = this.cursor === 6 ? this.target : this.numbers[this.cursor] || "";
    } else {
      this.target = this.draft;
      this.ready = true;
    }
    return true;
  }
  backspace() {
    this.ready = false;
    if (this.draft) {
      this.draft = this.draft.slice(0, -1);
      if (this.cursor === 6) this.target = this.draft;
    } else if (this.cursor > 0) {
      this.cursor--;
      this.draft = this.numbers[this.cursor] || "";
    }
  }
  edit(index) {
    if (!Number.isInteger(index) || index < 0 || index > Math.min(6, this.numbers.length)) {
      throw new Error("Ese hueco todav\u00eda no est\u00e1 disponible.");
    }
    this.cursor = index;
    this.draft = index === 6 ? this.target : this.numbers[index] || "";
    this.ready = false;
  }
}

if (typeof module !== "undefined") module.exports = NumberEntry;
