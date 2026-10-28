"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("long-press menus are suppressed on buttons and their icons, not ordinary links", () => {
  let handler;
  class Element {
    constructor(button) { this.button = button; }
    closest(selector) { assert.equal(selector, "button"); return this.button; }
  }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "touch-controls.js"), "utf8"), {
    Element,
    document: {
      addEventListener(type, callback) {
        assert.equal(type, "contextmenu", "Leave native click and keyboard activation unchanged");
        handler = callback;
      }
    }
  });
  for (const [target, expected] of [[new Element({}), true], [new Element(null), false], [{}, false]]) {
    let canceled = false;
    handler({ target, preventDefault() { canceled = true; } });
    assert.equal(canceled, expected);
  }
});
