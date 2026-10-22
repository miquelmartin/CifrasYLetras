"use strict";

importScripts("letters-core.js?v=7");
let dictionary;

self.onmessage = async ({ data }) => {
  try {
    if (!dictionary) {
      self.postMessage({ type: "loading", id: data.id });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      try {
        const texts = await Promise.all(["data/es_ES.aff", "data/es_ES.dic"].map(async url => {
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) throw new Error(`No se pudo descargar el diccionario (HTTP ${response.status}).`);
          return response.text();
        }));
        dictionary = LettersSolver.parseDictionary(...texts);
      } finally {
        clearTimeout(timeout);
      }
    }
    const result = LettersSolver.search(dictionary, data.letters, (examined, total, longest) => {
      self.postMessage({ type: "progress", id: data.id, examined, total, longest });
    }, { all: Boolean(data.all) });
    self.postMessage({ type: "done", id: data.id, result });
  } catch (error) {
    console.error("Error en la b\u00fasqueda de letras:", error);
    self.postMessage({
      type: "error",
      id: data.id,
      message: error.name === "AbortError" ? "Se agot\u00f3 el tiempo de descarga del diccionario." :
        error instanceof TypeError ? "No se pudo descargar o interpretar el diccionario." : error.message
    });
  }
};
