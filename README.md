# Cifras y Letras

Un buscador de soluciones estatico que funciona en el navegador. Abre
`index.html` directamente para usar cifras, o sirve este directorio por HTTP
para usar ambas pestanas, por ejemplo con `python -m http.server 8000`.

El diseno compacto usa la altura visible del movil. Los resultados, las fichas
y la ayuda tienen desplazamiento interno cuando es necesario; los pasos de
cifras conservan sus cajas y distintivos. En pantallas con menos de 504 px de
altura util (por ejemplo, con teclado abierto) se permite desplazar la pagina
para mantener controles legibles, sin recortar contenido.
La interfaz usa la paleta Pop: fondo celeste, naranja mandarina, ambar y azul
electrico, con contornos oscuros y sombras solidas. Se usa tinta oscura sobre
naranja para mantener el contraste de los textos. En la calculadora
todas las cifras originales permanecen visibles en una tira compacta: las usadas
aparecen tachadas y con una marca de verificacion. Los botones disponibles
desaparecen al usarse y aparece un nuevo boton de resultado, identificado con R
y su numero de paso. Deshacer restaura los operandos en su posicion.
Los resultados automaticos muestran tambien cada cifra original, con su
estado utilizada/sin usar, distinguiendo las instancias repetidas.
Al encontrar una solucion, los pasos sustituyen al formulario para disponer
de espacio real en movil; **Editar cifras** recupera la entrada completa.
El historial manual se despliega con **Ver pasos**, en vez de dejar una lista
comprimida a unos pocos pixeles bajo el teclado.
Las teclas numericas ajustan el tamano de fuente y, para enteros muy largos,
dividen el numero en varias lineas. Nunca incorporan barras de desplazamiento
ni recortan cifras; si hace falta se desplaza el conjunto de controles.

En cifras, espacio o coma confirma cada entero como ficha. Puedes pegar listas,
quitar fichas o usar retroceso con el campo vacio para corregir la ultima.
La ultima cifra escrita se incluye aunque no hayas pulsado un separador.
En letras, cada letra crea una ficha de inmediato; espacios y comas se ignoran.
Se respetan la composicion de caracteres, las tildes y la distincion entre N y
&Ntilde;.
Los separadores se cancelan antes de editar y se ignoran tambien en los eventos
de entrada de teclados moviles; los eventos finales de composicion no vuelven
a confirmar una letra ya insertada. Las repeticiones escritas a proposito se
conservan.
Durante la composicion predictiva de palabras (por ejemplo Gboard), cada
actualizacion sustituye solo las fichas de esa composicion, de modo que las
letras completas aparecen inmediatamente y las correcciones no se duplican.
Solo los acentos pendientes esperan a su letra base.

**Resolver yo** abre una calculadora dentro de la pagina con una tecla por
cifra, incluidas las repetidas como instancias separadas. Elige una cifra,
una operacion y otra cifra: el resultado se calcula inmediatamente, sin `=`.
Cualquier par de botones puede combinarse, incluidos dos resultados anteriores.
La distancia absoluta al objetivo corresponde al boton disponible mas cercano,
con enteros exactos, y se actualiza al calcular y deshacer.
Una division invalida no consume la cifra ni cambia el resultado.
Al alcanzar el objetivo se dibujan breves fuegos artificiales en canvas,
sin bloquear controles; se cancelan al salir o deshacer y se limpian al terminar.
Con la preferencia de movimiento reducido solo se resalta el resultado.
Los cuatro botones de operacion son azules, cuadrados y grandes.
La flecha hacia atras (**Deshacer**) cancela primero una seleccion pendiente;
si no la hay, revierte una operacion completa. Las operaciones solo se habilitan
cuando se ha elegido el primer operando; mientras se espera una cifra,
Deshacer sigue disponible si hay una seleccion u operacion que revertir.
**Resolver automaticamente** busca primero desde los botones actuales; si no
hay continuacion, busca desde las cifras originales y avisa antes de reiniciar.
La solucion se reproduce paso a paso, se puede cancelar y permite deshacer
despues cada operacion. **Volver** conserva el reto
y los resultados automaticos. Los calculos siguen siendo enteros exactos.
Las fusiones y Deshacer animan los operandos y la reorganizacion de los botones
durante 340 ms; las pulsaciones se bloquean mientras termina cada transicion.
Con movimiento reducido se actualizan al instante.
Las dos pestanas y el objetivo empiezan vacios, sin ejemplos precargados.

- **Cifras:** calculos enteros exactos, uso opcional de las cifras y solucion
  combinando cualquier par de cifras o resultados, con el menor numero de
  operaciones. Las referencias [paso n] identifican resultados anteriores.
  Se puede cancelar la busqueda.
- **Letras:** candidatas mas largas del diccionario ortografico espanol usando
  algunas o todas las letras; muestra todos los empates de longitud maxima.
  Respeta las repeticiones. Ignora tildes y dieresis, pero distingue N de
  &Ntilde;. Las conjugaciones y plurales proceden de las reglas de afijos del
  diccionario RLA-ES incluido, no de una lista de palabras inventada.

Las candidatas **no estan verificadas por la RAE**. El enfoque de diccionario
ortografico, aprobado por el usuario, proporciona enlaces al DLE para consultar
los lemas de origen, sin garantizar que la RAE acepte cada candidata.
Consulta la [procedencia, licencia y alcance](data/README.md).
Cada candidata incluye un icono de libro para consultar su lema en el DLE,
con nombre accesible y una zona tactil de 44 px, sin repetir texto en cada fila.

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
360x640, 375x667, 390x844 y 1280x720, incluidos nueve numeros y ocho pasos,
numerosos empates, ayuda, enteros largos y negativos, fichas, calculadora,
continuacion automatica, reinicio, cancelacion y deshacer.

El lector del diccionario admite intencionadamente solo las directivas de la
version fijada de RLA-ES. Una actualizacion con nuevas directivas produce un
error visible, en vez de ignorar restricciones morfologicas. La busqueda aplica
como maximo dos sufijos, siguiendo los indicadores de continuacion declarados,
y las combinaciones permitidas con prefijos.
