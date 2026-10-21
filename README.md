# Cifras y Letras

Un buscador de soluciones estatico que funciona en el navegador. Abre
`index.html` directamente para usar cifras, o sirve este directorio por HTTP
para usar ambas pestanas, por ejemplo con `python -m http.server 8000`.

El diseno compacto usa la altura visible del movil. Los resultados, las fichas
y la ayuda tienen desplazamiento interno cuando es necesario; los pasos de
cifras conservan sus cajas y distintivos. En pantallas con menos de 504 px de
altura util (por ejemplo, con teclado abierto) se permite desplazar la pagina
para mantener controles legibles, sin recortar contenido.

En cifras, espacio o coma confirma cada entero como ficha. Puedes pegar listas,
quitar fichas o usar retroceso con el campo vacio para corregir la ultima.
La ultima cifra escrita se incluye aunque no hayas pulsado un separador.
En letras, cada letra crea una ficha de inmediato; espacios y comas se ignoran.
Se respetan la composicion de caracteres, las tildes y la distincion entre N y
&Ntilde;.

**Resolver yo** abre una calculadora dentro de la pagina con una tecla por
cifra, incluidas las repetidas como instancias separadas. Elige una cifra,
una operacion y otra cifra: el resultado se calcula inmediatamente, sin `=`.
Cada paso reutiliza el resultado anterior. La distancia absoluta al objetivo
se actualiza con enteros exactos al elegir cifras, calcular y deshacer.
Una division invalida no consume la cifra ni cambia el resultado.
Al alcanzar el objetivo se dibujan breves fuegos artificiales en canvas,
sin bloquear controles; se cancelan al salir o deshacer y se limpian al terminar.
Con la preferencia de movimiento reducido solo se resalta el resultado.
Los cuatro botones de operacion son azules, cuadrados y grandes.
La flecha hacia atras (**Deshacer**) revierte cada accion, incluida la seleccion
de una cifra. **Volver** conserva el reto
y los resultados automaticos. Los calculos siguen siendo enteros exactos.
Las dos pestanas y el objetivo empiezan vacios, sin ejemplos precargados.

- **Cifras:** calculos enteros exactos, uso opcional de las cifras y solucion
  secuencial con el menor numero de operaciones. Se puede cancelar la busqueda.
- **Letras:** candidatas mas largas del diccionario ortografico espanol usando
  algunas o todas las letras; muestra todos los empates de longitud maxima.
  Respeta las repeticiones. Ignora tildes y dieresis, pero distingue N de
  &Ntilde;. Las conjugaciones y plurales proceden de las reglas de afijos del
  diccionario RLA-ES incluido, no de una lista de palabras inventada.

Las candidatas **no estan verificadas por la RAE**. El enfoque de diccionario
ortografico, aprobado por el usuario, proporciona enlaces al DLE para consultar
los lemas de origen, sin garantizar que la RAE acepte cada candidata.
Consulta la [procedencia, licencia y alcance](data/README.md).

Las dos busquedas usan procesos independientes en segundo plano. Cambiar de
pestana conserva entradas y resultados. El diccionario de letras se descarga
de este sitio solo en la primera busqueda (unos 0,9 MB) y se conserva en memoria
para las siguientes. Cancelar termina el proceso y descarta esa copia.
Los errores de carga se muestran y permiten reintentar. No necesita servidor
de aplicaciones, CDN externo, compilacion ni instalacion de paquetes.

Ejecuta las pruebas de regresion con Node.js 18 o posterior:

```text
node --test tests/solver.test.js tests/numbers-game.test.js tests/celebration.test.js
```

Para ejecutar las comprobaciones reales de interfaz, sirve el sitio y ejecuta
en la consola del navegador:

```js
await (await import("./tests/browser-checks.js")).run()
```

Comprueban interacciones y dimensiones reales con ventanas internas de
360x640, 390x844 y 1280x720, incluidos ocho pasos, numerosos empates, ayuda,
enteros largos, fichas y calculadora con deshacer.

El lector del diccionario admite intencionadamente solo las directivas de la
version fijada de RLA-ES. Una actualizacion con nuevas directivas produce un
error visible, en vez de ignorar restricciones morfologicas. La busqueda aplica
como maximo dos sufijos, siguiendo los indicadores de continuacion declarados,
y las combinaciones permitidas con prefijos.
