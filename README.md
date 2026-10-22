# Cifras y Letras

Un buscador de soluciones estatico, en espanol, que funciona en el navegador.
Abre `index.html` directamente para cifras, o sirve este directorio por HTTP
para ambas pestanas, por ejemplo con `python -m http.server 8000`.

## Entrada sin teclado del movil

**Cifras** pide exactamente seis numeros y despues el objetivo. El teclado
grande de pantalla usa filas `7 8 9`, `4 5 6`, `1 2 3`, `borrar 0 Enter`.
Enter confirma cada numero; vacio no hace nada. Borrar quita un digito y, si
no hay ninguno, vuelve al numero anterior. Lo tecleado aparece directamente en
el hueco actual (borde azul discontinuo); no hay franja de "Numero N de 6". Debajo
de los seis huecos, la caja **Objetivo** espera con `···` hasta su turno y muestra
el objetivo grande en naranja. Los seis huecos permiten editar
cifras ya introducidas sin perder las demas; borrar sigue
retrocediendo por el objetivo y las seis cifras hasta vaciarlo todo. Al
confirmar el objetivo se abre directamente Resolver yo. Mientras la entrada esta vacia, la
tecla Enter se convierte en **Al azar** (ambar): saca seis cifras de las 24 fichas
clasicas (1 a 10 dos veces y 25, 50, 75 y 100 una vez) y un objetivo de 100 a 999,
y abre Resolver yo. Al teclear un digito vuelve a ser Enter. No hay tecla menos, campos editables,
cursor de texto ni teclado del sistema. Los numeros muy largos se abrevian en
los huecos, conservando su valor completo en el titulo, nombre accesible y URL.

**Letras** muestra todo el abecedario en orden, con N y &Ntilde; separadas,
en cinco columnas. Cada pulsacion anade una letra; borrar quita la ultima y
Buscar ocupa dos columnas. Se admiten como maximo doce letras, siempre en una
sola fila de fichas que se estrechan; al llegar a doce se desactivan las letras. Tambien funcionan digitos, letras, Enter y retroceso del
teclado fisico como comodidad, pero no son necesarios. Espacios y comas no
repiten letras; se conservan las repeticiones deliberadas, tildes y &Ntilde;.

La pagina nunca se desplaza. Solo la lista de Pasos y la de palabras halladas
pueden desplazarse dentro de su propia caja; teclados, operaciones, objetivo y
botones quedan siempre visibles (comprobado a 360x640, 375x667 y 390x844).
Pulsar la pestana Cifras o Letras, aunque ya este activa, vacia ese modo y su URL.
Cada tecla de los teclados, botones de Resolver yo y operaciones extiende de forma
invisible su zona tactil hasta la mitad del hueco vecino: tocar entre teclas activa
la mas cercana. En Letras, la nota del diccionario aparece tras pulsar Buscar. La paleta Pop suave combina celeste claro, naranja,
ambar y azul menos saturados, con contornos y sombras solidas de 2 px.

En Resolver yo, una flecha solida (Volver) tan alta como la caja Objetivo vuelve a
una entrada de Cifras vacia y lista para un reto nuevo (`?modo=cifras`); el boton
Atras del navegador o de Android lleva a esa misma entrada vacia sin salir del sitio; junto al objetivo se indica en pequeno "faltan N" o "sobran N" respecto
al boton mas cercano. Las operaciones tienen las mismas esquinas redondeadas que las cifras.

## Estadisticas

Se usan visitas anonimas de [GoatCounter](https://www.goatcounter.com/)
(visitas, visitantes unicos y pais). Solo se envia la ruta con `?modo=cifras` o
`?modo=letras`, tambien al cambiar de pestana; nunca numeros, objetivo ni letras.
GoatCounter no cuenta archivos locales, `localhost` ni pruebas automatizadas.

## Cifras exactas

El motor sigue siendo generico: enteros BigInt, resultados negativos y cero,
divisiones exactas, cifras opcionales y duplicados separados. El solucionador
busca el menor numero de operaciones combinando cualquier par de cifras o
resultados anteriores. No se admiten fracciones ni division entre cero.

**Resolver yo** permite elegir un boton, una operacion y otro boton, sin `=`.
Los dos operandos desaparecen y aparece el resultado en azul y con un marcador
`=`. Entre el objetivo y los botones, la caja de Pasos se alinea abajo: la
operacion en curso es la ultima fila, mas grande y con huecos punteados, y cada
paso nuevo empuja a los anteriores hacia arriba. Caben seis pasos a 360x640;
si no, la caja se desplaza sola y se mantiene al final. Los operandos
intermedios son azules. Las teclas llenan el ancho y crecen en altura solo
hasta ser cuadradas; el espacio sobrante es para los pasos.

Las cuatro operaciones y Deshacer comparten una fila completa de cinco teclas.
Las operaciones solo se habilitan tras elegir el primer numero. Deshacer
cancela primero una seleccion pendiente o revierte una operacion completa.
Las fusiones y sus reversos animan los botones durante 340 ms, bloqueando
pulsaciones durante la transicion; con movimiento reducido son instantaneas.
Las teclas numericas ajustan la fuente sin barras de desplazamiento ni recortes.
Los valores de mas de doce caracteres se abrevian visualmente en la calculadora
y los pasos; el valor exacto sigue en el titulo, nombre accesible y calculo.

El objetivo grande y su distancia exacta aparecen juntos. La distancia es la
menor diferencia absoluta entre el objetivo y los botones disponibles.
**Auto-resolver**, un boton pequeno a la derecha del objetivo, busca
primero desde los botones actuales; si no hay continuacion exacta, busca desde
las cifras originales y avisa antes de reiniciar. Si ninguna combinacion da el
objetivo, reproduce la mas cercana (menor diferencia y, a igualdad, menos
operaciones) e indica, por ejemplo, "No hay solucion exacta · la mas cercana:
951 (a 1)".
La reproduccion usa los mismos botones, permite cancelar y admite deshacer.

Al alcanzar el objetivo aparecen fuegos artificiales nativos durante 5,8 s:
18 estallidos escalonados y 1512 particulas. No bloquean controles y se limpian
al salir, deshacer o terminar. Movimiento reducido usa solo un resaltado calmo.

## Letras y diccionario

Se muestran todas las candidatas de longitud maxima usando algunas o todas
las letras, respetando cantidades. Se ignoran tildes y dieresis, pero no se
confunden N y &Ntilde;. Las conjugaciones y plurales proceden del diccionario
ortografico RLA-ES y sus afijos, no de una lista inventada.

Las candidatas **no estan verificadas por la RAE**. Este enfoque, aprobado por
el usuario, ofrece un icono de libro con nombre accesible y zona tactil de
44 px para consultar cada lema en el DLE. No garantiza aceptacion de la RAE.
Consulta la [procedencia, licencia y alcance](data/README.md).

Las busquedas usan procesos independientes y cancelables. El diccionario
(unos 0,9 MB) se carga desde este sitio en la primera busqueda y se reutiliza.
Los errores se muestran y permiten reintentar. No se necesita servidor de
aplicaciones, CDN externo, compilacion ni instalacion de paquetes.

## Direcciones e iconos

El reto se guarda con `modo`, `n`, `obj`, `l` y `yo=1`. Recargar restaura
pestana, seis cifras exactas, letras con tildes, objetivo y Resolver yo, pero no
sus operaciones. Teclear sustituye la URL sin llenar el historial. Atras y
Adelante cambian de vista. Los parametros invalidos o mas de seis cifras se
omiten con un aviso; mas de doce letras se recortan a doce, tambien con aviso.
Una URL con el reto completo abre Resolver yo. Los enlaces antiguos con enteros negativos se conservan;
el nuevo teclado no crea signos negativos.

No hay titulo visible: el icono suministrado por el usuario (78 px, sin borde
blanco) aparece, decorativo, centrado sobre la barra de pestanas, mas alto que
ella y solapando un poco Cifras y Letras sin tapar su texto ni bloquear toques. Al instalarla en Android, el manifest usa
iconos sobre fondo blanco, incluidos los adaptables (maskable) con margen de
zona segura, y fondo de arranque blanco. Todos los recursos usan rutas
relativas a Pages y pesan juntos menos de 250 KB.

## Comprobaciones

Con Node.js 18 o posterior:

```text
node --test tests/solver.test.js tests/numbers-game.test.js tests/celebration.test.js
node --test tests/keypad-model.test.js tests/puzzle-url.test.js tests/icons.test.js
```

Sirve el sitio y ejecuta en la consola del navegador:

```js
await (await import("./tests/browser-checks.js")).run()
await (await import("./tests/url-browser-checks.js")).run()
```

Incluyen entrada completa con botones, orden alfabetico, teclas visibles sin
scroll, calculos entre resultados, animacion y deshacer, reproduccion automatica,
reinicio y cancelacion, palabras reales, iconos DLE, persistencia exacta,
recarga e historial. Tambien cubren el motor generico con nueve botones,
valores negativos largos y una solucion de ocho pasos, ademas del contraste
y la ausencia de anillos de foco (contorno, sombra o resaltado tactil) en cualquier elemento enfocable. El motor se compara con una referencia exhaustiva
independiente para conjuntos pequenos.

El lector de RLA-ES admite intencionadamente solo las directivas de la version
fijada. Las directivas nuevas producen un error visible, no una interpretacion
parcial de restricciones morfologicas.
