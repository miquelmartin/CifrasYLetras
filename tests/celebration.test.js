"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function createCelebration(reduced = false) {
  let id = 0;
  let created = 0;
  let drawn = 0;
  const frames = new Map();
  const nodes = new Set();
  const motion = { matches: reduced, addEventListener(type, listener) { this.listener = listener; } };
  const context = {
    innerWidth: 360, innerHeight: 640,
    matchMedia: () => motion,
    requestAnimationFrame(callback) { frames.set(++id, callback); return id; },
    cancelAnimationFrame(handle) { frames.delete(handle); },
    document: {
      body: { append(node) { nodes.add(node); } },
      createElement() {
        created++;
        return {
          setAttribute() {},
          getContext: () => ({ clearRect() {}, beginPath() {}, arc() { drawn++; }, fill() {} }),
          remove() { nodes.delete(this); }
        };
      }
    }
  };
  const source = fs.readFileSync(path.join(__dirname, "..", "celebration.js"), "utf8");
  vm.runInNewContext(`${source}\nthis.Celebration = TargetCelebration;`, context);
  const classes = new Set();
  const celebration = new context.Celebration({
    classList: { toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); } }
  });
  return {
    celebration, nodes, frames, motion, classes,
    get created() { return created; },
    get drawn() { return drawn; },
    tick(now) {
      const callbacks = [...frames.values()];
      frames.clear();
      for (const callback of callbacks) callback(now);
    }
  };
}

test("celebration runs once per target transition and cleans its animation", () => {
  const state = createCelebration();
  state.celebration.update(true);
  assert.equal(state.nodes.size, 1);
  assert.equal(state.frames.size, 1);
  state.celebration.update(true);
  assert.equal(state.created, 1);
  state.tick(0);
  state.tick(1300);
  assert.equal(state.nodes.size, 1);
  assert.ok(state.drawn >= 500, "Larger staggered bursts draw many more particles");
  state.tick(4500);
  assert.equal(state.nodes.size, 1);
  state.tick(5800);
  assert.equal(state.nodes.size, 0);
  assert.equal(state.frames.size, 0);
  state.celebration.update(true);
  assert.equal(state.created, 1);
  state.celebration.update(false);
  state.celebration.update(true);
  assert.equal(state.created, 2);
  state.celebration.stop();
  assert.equal(state.nodes.size, 0);
  assert.equal(state.frames.size, 0);
});

test("reduced motion uses a calm success class without animation", () => {
  const state = createCelebration(true);
  state.celebration.update(true);
  assert.equal(state.nodes.size, 0);
  assert.equal(state.frames.size, 0);
  assert.ok(state.classes.has("target-reached"));
  state.celebration.stop();
  assert.equal(state.classes.size, 0);
});

test("changing to reduced motion cancels existing fireworks", () => {
  const state = createCelebration();
  state.celebration.update(true);
  state.motion.matches = true;
  state.motion.listener();
  assert.equal(state.nodes.size, 0);
  assert.equal(state.frames.size, 0);
  assert.ok(state.classes.has("target-reached"));
});
