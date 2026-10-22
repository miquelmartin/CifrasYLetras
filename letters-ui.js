"use strict";

const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(selected) {
  for (const tab of tabs) {
    const active = tab === selected;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute("aria-controls")).hidden = !active;
  }
  document.dispatchEvent(new CustomEvent("puzzlechange"));
}
for (const tab of tabs) {
  tab.addEventListener("click", () => {
    const mode = tab.id === "letters-tab" ? "letras" : "cifras";
    selectTab(tab);
    document.dispatchEvent(new CustomEvent("resetpuzzle", { detail: mode }));
  });
  tab.addEventListener("keydown", event => {
    let index = tabs.indexOf(tab);
    if (event.key === "ArrowRight") index = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") index = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") index = 0;
    else if (event.key === "End") index = tabs.length - 1;
    else return;
    event.preventDefault();
    selectTab(tabs[index]);
    tabs[index].focus();
  });
}
