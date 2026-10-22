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
    // True when the cursor is an empty gap left by deleting a committed middle number.
    this.inserting = false;
  }
  get isEmpty() {
    return this.numbers.length === 0 && !this.target && !this.draft;
  }
  // Classic tile pool: 1-10 twice each plus one each of 25, 50, 75 and 100.
  static drawRandom(random = Math.random) {
    const pool = [];
    for (let value = 1; value <= 10; value++) pool.push(value, value);
    pool.push(25, 50, 75, 100);
    const numbers = [];
    for (let index = 0; index < 6; index++) numbers.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
    return { numbers, target: 100 + Math.floor(random() * 900) };
  }
  get editingCommitted() {
    return this.cursor < 6 && !this.inserting && this.cursor < this.numbers.length;
  }
  get slots() {
    const values = [...this.numbers];
    if (this.cursor < 6) {
      if (this.editingCommitted) values[this.cursor] = this.draft;
      else values.splice(this.cursor, 0, this.draft);
    }
    return Array.from({ length: 6 }, (_, index) => values[index] || "");
  }
  digit(value) {
    if (!/^\d$/.test(value)) throw new Error("Elige un d\u00edgito del 0 al 9.");
    this.ready = false;
    this.draft += value;
    if (this.cursor === 6) this.target = this.draft;
    else if (this.editingCommitted) this.numbers[this.cursor] = this.draft;
  }
  enter() {
    if (!this.draft) return false;
    if (!/^[+-]?\d+$/.test(this.draft)) throw new Error("Completa el n\u00famero antes de confirmar.");
    if (this.cursor < 6) {
      if (this.editingCommitted) this.numbers[this.cursor] = this.draft;
      else this.numbers.splice(this.cursor, 0, this.draft);
      this.inserting = false;
      this.cursor++;
      this.draft = this.cursor === 6 ? this.target : this.numbers[this.cursor] || "";
    } else {
      this.target = this.draft;
      this.ready = this.numbers.length === 6;
    }
    return true;
  }
  backspace() {
    this.ready = false;
    if (this.draft) {
      this.draft = this.draft.slice(0, -1);
      if (/^[+-]$/.test(this.draft)) this.draft = "";
      if (this.cursor === 6) this.target = this.draft;
      else if (this.editingCommitted) {
        if (this.draft) this.numbers[this.cursor] = this.draft;
        else {
          this.numbers.splice(this.cursor, 1);
          this.inserting = this.cursor < this.numbers.length;
        }
      }
    } else if (this.cursor > 0) {
      this.inserting = false;
      this.cursor--;
      this.draft = this.numbers[this.cursor] || "";
    }
  }
  edit(index) {
    if (this.inserting) {
      if (this.draft) this.numbers.splice(this.cursor, 0, this.draft);
      else if (index > this.cursor) index--;
      this.inserting = false;
    }
    if (!Number.isInteger(index) || index < 0 || index > Math.min(6, this.numbers.length)) {
      throw new Error("Ese hueco todav\u00eda no est\u00e1 disponible.");
    }
    this.cursor = index;
    this.draft = index === 6 ? this.target : this.numbers[index] || "";
    this.ready = false;
  }
}

if (typeof module !== "undefined") module.exports = NumberEntry;
