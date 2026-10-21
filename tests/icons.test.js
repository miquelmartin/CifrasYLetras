"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");

test("optimized local icon assets have the declared dimensions and small payloads", () => {
  let bytes = 0;
  for (const [name, size] of [
    ["favicon-32.png", 32], ["logo-156.png", 156], ["apple-touch-icon.png", 180],
    ["icon-192.png", 192], ["icon-512.png", 512], ["maskable-192.png", 192], ["maskable-512.png", 512]
  ]) {
    const data = fs.readFileSync(path.join(root, "icons", name));
    assert.equal(data.readUInt32BE(16), size);
    assert.equal(data.readUInt32BE(20), size);
    bytes += data.length;
  }
  const ico = fs.readFileSync(path.join(root, "favicon.ico"));
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 3);
  assert.deepEqual([0, 1, 2].map(index => ico[6 + index * 16]), [16, 32, 48]);
  assert.ok(bytes + ico.length < 250000);
});

test("installable icons use white backgrounds, including maskable safe-zone variants", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "site.webmanifest"), "utf8"));
  assert.equal(manifest.background_color, "#ffffff");
  const purposes = manifest.icons.map(icon => icon.purpose);
  assert.ok(purposes.includes("any") && purposes.includes("maskable"));
  for (const icon of manifest.icons) {
    const data = fs.readFileSync(path.join(root, icon.src.split("?")[0]));
    // Palette PNGs (colour type 3) must not be transparent: tRNS chunks would leave the launcher background showing.
    assert.equal(data.indexOf(Buffer.from("tRNS")), -1, `${icon.src} has transparency`);
  }
});

test("manifest and HTML use versioned repository-relative icons for Pages subpaths", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "site.webmanifest"), "utf8"));
  assert.equal(manifest.name, "Cifras y Letras");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  for (const icon of manifest.icons) {
    assert.ok(icon.src.startsWith("icons/") && icon.src.includes("?v="));
    assert.ok(fs.existsSync(path.join(root, icon.src.split("?")[0])));
  }
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  for (const value of ["favicon.ico?v=2", "icons/favicon-32.png?v=2", "icons/apple-touch-icon.png?v=2", "site.webmanifest?v=4"]) {
    assert.ok(html.includes(`href="${value}"`));
  }
  assert.doesNotMatch(html, /<h1/);
  assert.match(html, /role="tablist"[^>]*>[\s\S]*?id="numbers-tab"[\s\S]*?<img src="icons\/logo-156\.png\?v=1"[^>]*alt=""[^>]*aria-hidden="true"[\s\S]*?id="letters-tab"/);
});
