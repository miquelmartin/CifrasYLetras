# Cifras y Letras

Un buscador de soluciones estatico que funciona en el navegador. Abre
`index.html` directamente para usar cifras, o sirve este directorio por HTTP
para usar ambas pestanas, por ejemplo con `python -m http.server 8000`.

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
node --test tests/solver.test.js
```

El lector del diccionario admite intencionadamente solo las directivas de la
version fijada de RLA-ES. Una actualizacion con nuevas directivas produce un
error visible, en vez de ignorar restricciones morfologicas. La busqueda aplica
como maximo dos sufijos, siguiendo los indicadores de continuacion declarados,
y las combinaciones permitidas con prefijos.
