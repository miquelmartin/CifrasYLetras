# Diccionarios de letras

## Francais / English

`fr.json` and `en.json` are unchanged word lists (including inflections) from
Zeke Sikelianos's MIT-licensed packages, derived from the Letterpress word
list by Loren Brichter and contributors (CC0):

- French: https://github.com/words/an-array-of-french-words/tree/24a6b29562cd0f8c4090262dbe303413f68aafe9
  (`index.json`, 336,524 entries); license in `LICENSE-fr.txt`.
- English: https://github.com/words/an-array-of-english-words/tree/b96df7dc26aeb6366c7adad42cb98e6933bddd89
  (`index.json`, 274,937 entries); license in `LICENSE-en.txt`.
- Upstream: https://github.com/lorenbrichter/Words (CC0 1.0).

The original files are included without editing. At runtime, only lowercase,
single alphabetic words are considered; hyphens, apostrophes, whitespace,
digits and other scripts are excluded. French accents and cedillas are
folded for tile matching; oe/ae ligatures require two corresponding tiles.
English requires A-Z. Displayed spellings are preserved. No new inflections
are invented. Word lengths count tiles, including expanded ligatures.

These are not official Countdown / Des chiffres et des lettres dictionaries.
Coverage and competition acceptance are not guaranteed. The book icon opens
the original spelling on French or English Wiktionary; definitions are not
copied, fetched or bundled.

## Datos ortograficos del espanol

Los archivos `.dic` y `.aff` son el diccionario RLA-ES para espanol de Espana
distribuido por LibreOffice, sin modificaciones, fijado en el commit
`67032ee957631908098a72edf48dc81cac27e369`.

Fuente: https://github.com/LibreOffice/dictionaries/tree/67032ee957631908098a72edf48dc81cac27e369/es

Autores: Santiago Bosio y los colaboradores de RLA-ES. Los agradecimientos
figuran en `README_hunspell_es.txt` y las opciones de licencia en `LICENSE.md`.
Esta distribucion elige **MPL 1.1**; su texto completo esta en `MPL-1.1.txt`.
Los archivos fuente editables originales del diccionario y de los afijos se
incluyen junto a este aviso y estan disponibles en el enlace de origen.

Es un diccionario ortografico, **no el DLE de la RAE**. Contiene omisiones,
vocabulario regional y reglas de derivacion productiva. Ni sus entradas ni
las candidatas flexionadas o derivadas automaticamente garantizan la
aceptacion de la RAE. No se copian definiciones ni contenido del diccionario
de la RAE.

El buscador incluye entradas en minusculas del alfabeto espanol y sus formas
derivadas mediante afijos, incluidas conjugaciones, plurales y cambios de
genero. Se excluyen nombres propios con mayusculas, siglas, signos de
puntuacion y entradas de otros alfabetos. Los enlaces al DLE usan el lema
de origen, mas util que una forma conjugada; tampoco se garantiza que el lema
tenga una entrada en el DLE.
