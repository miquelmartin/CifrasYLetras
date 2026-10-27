"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function setup(supported = true) {
  const pulses = [];
  let click;
  class Element {
    constructor(control = null, disabled = false) { this.control = control; this.disabled = disabled; }
    closest() { return this.control; }
    matches() { return this.disabled; }
  }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "haptics.js"), "utf8"), {
    Element,
    navigator: supported ? { vibrate: ms => pulses.push(ms) } : {},
    document: {
      addEventListener(type, handler, options) {
        assert.equal(type, "click", "No touch/pointer listeners that could double-pulse");
        assert.equal(options.capture, true, "Pulse before controls disable themselves");
        click = handler;
      }
    }
  });
  return { Element, pulses, click };
}

test("one subtle pulse per trusted activation, including nested icons", () => {
  const { Element, pulses, click } = setup();
  const button = new Element();
  button.control = button;
  click({ isTrusted: true, target: new Element(button) });
  assert.deepEqual(pulses, [10]);
  click({ isTrusted: true, target: button });
  assert.deepEqual(pulses, [10, 10]);
  click({ isTrusted: false, target: button });
  click({ isTrusted: true, target: new Element() });
  click({ isTrusted: true, target: {} });
  assert.deepEqual(pulses, [10, 10], "Internal/programmatic clicks and non-controls do not pulse");
});

test("disabled controls and unsupported browsers remain unchanged", () => {
  for (const supported of [true, false]) {
    const { Element, pulses, click } = setup(supported);
    const button = new Element(null, true);
    button.control = button;
    click({ isTrusted: true, target: new Element(button) });
    assert.deepEqual(pulses, []);
    if (!supported) {
      button.disabled = false;
      click({ isTrusted: true, target: button });
      assert.deepEqual(pulses, []);
    }
  }
});
