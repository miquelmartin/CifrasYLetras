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

// TV-show style draw: 10 letters with 3-6 vowels, from the Spanish Scrabble bag without CH, LL and RR.
const LETTER_BAG_VOWELS = { A: 12, E: 12, I: 6, O: 9, U: 5 };
const LETTER_BAG_CONSONANTS = { B: 2, C: 4, D: 5, F: 1, G: 2, H: 2, J: 1, L: 4, M: 2, N: 5, "\u00d1": 1, P: 2, Q: 1, R: 5, S: 6, T: 4, V: 1, X: 1, Y: 1, Z: 1 };
const MAX_SAME_CONSONANT = 2;
const LANGUAGE_LETTER_BAGS = {
  es: [LETTER_BAG_VOWELS, LETTER_BAG_CONSONANTS],
  fr: [{ A: 9, E: 15, I: 8, O: 6, U: 6 }, { B: 2, C: 2, D: 3, F: 2, G: 2, H: 2, J: 1, K: 1, L: 5, M: 3, N: 6, P: 2, Q: 1, R: 6, S: 6, T: 6, V: 2, W: 1, X: 1, Y: 1, Z: 1 }],
  en: [{ A: 9, E: 12, I: 9, O: 8, U: 4 }, { B: 2, C: 2, D: 4, F: 2, G: 3, H: 2, J: 1, K: 1, L: 4, M: 2, N: 6, P: 2, Q: 1, R: 6, S: 4, T: 6, V: 2, W: 2, X: 1, Y: 2, Z: 1 }]
};

function drawRandomLetters(random = Math.random, language = "es") {
  if (!LANGUAGE_LETTER_BAGS[language]) throw new Error("Idioma no compatible.");
  const [vowelBag, consonantBag] = LANGUAGE_LETTER_BAGS[language];
  const bag = counts => Object.entries(counts).flatMap(([letter, count]) => Array(count).fill(letter));
  const vowelCount = 3 + Math.floor(random() * 4);
  const vowels = bag(vowelBag);
  let consonants = bag(consonantBag);
  const drawn = [];
  for (let index = 0; index < vowelCount; index++) drawn.push(vowels.splice(Math.floor(random() * vowels.length), 1)[0]);
  for (let index = vowelCount; index < 10; index++) {
    const letter = consonants.splice(Math.floor(random() * consonants.length), 1)[0];
    drawn.push(letter);
    if (drawn.filter(value => value === letter).length >= MAX_SAME_CONSONANT) consonants = consonants.filter(value => value !== letter);
  }
  for (let index = drawn.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [drawn[index], drawn[other]] = [drawn[other], drawn[index]];
  }
  return drawn;
}

if (typeof module !== "undefined") {
  module.exports = NumberEntry;
  Object.assign(module.exports, { drawRandomLetters, LETTER_BAG_VOWELS, LETTER_BAG_CONSONANTS, LANGUAGE_LETTER_BAGS, MAX_SAME_CONSONANT });
}
