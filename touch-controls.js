"use strict";

// A browser's long-press menu can consume the click generated when a touch is released.
document.addEventListener("contextmenu", event => {
  if (event.target instanceof Element && event.target.closest("button")) event.preventDefault();
});
