"use strict";

// Capture before a key's action disables or removes it. Listen only to click, not touch/pointer events.
document.addEventListener("click", event => {
  if (!event.isTrusted || typeof navigator.vibrate !== "function" || !(event.target instanceof Element)) return;
  const control = event.target.closest("button, a[href], summary, [role='button']");
  if (!control || control.matches(":disabled, [aria-disabled='true']")) return;
  navigator.vibrate(10);
}, { capture: true });
