"use strict";

importScripts("letters-core.js?v=8");
const dictionaries = new Map();

self.onmessage = async ({ data }) => {
  try {
    const language = data.language || "es";
    if (!["es", "fr", "en"].includes(language)) throw new Error("Idioma no compatible.");
    if (!dictionaries.has(language)) {
      self.postMessage({ type: "loading", id: data.id });
      const loading = (async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        try {
          const urls = language === "es" ? ["data/es_ES.aff", "data/es_ES.dic"] : [`data/${language}.json`];
          const texts = await Promise.all(urls.map(async url => {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) throw new Error(`No se pudo descargar el diccionario (HTTP ${response.status}).`);
            return response.text();
          }));
          return language === "es" ? LettersSolver.parseDictionary(...texts) : LettersSolver.parseWordList(texts[0], language);
        } finally {
          clearTimeout(timeout);
        }
      })();
      dictionaries.set(language, loading);
      loading.catch(() => dictionaries.delete(language));
    }
    const dictionary = await dictionaries.get(language);
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
        error instanceof TypeError || error instanceof SyntaxError ? "No se pudo descargar o interpretar el diccionario." : error.message
    });
  }
};
