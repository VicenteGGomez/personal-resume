# Panel de administración (`/admin`)

Tu currículum ahora es **editable desde una página web**, sin tocar código. Todo el
contenido (español e inglés), los enlaces, el CV y una foto de perfil se editan
en `/admin` y se publican en vivo.

- Sitio en inglés: `/en`
- Sitio en español: `/es`
- Editor: `/admin`

Solo pueden entrar los correos autorizados:
`vicente@vicentegomez.cl` y `vgomezo@fen.uchile.cl`.

---

## 1. Qué puedes editar

En el editor hay cinco pestañas:

- **General** — foto de perfil (subir/quitar), nombre, ubicación, correo,
  WhatsApp, LinkedIn y los enlaces al CV en PDF (inglés y español). También el
  **teléfono** y los **idiomas**, que no se muestran en la web: existen para el
  CV que genera la IA (ver *El botón IA*).
- **Projects** — tus proyectos (solo inglés). Ver más abajo.
- **Story** — tu historia: la portada de la página y sus hitos, con los dos
  idiomas juntos. Ver más abajo.
- **English** — todo el contenido de la versión en inglés.
- **Español** — todo el contenido de la versión en español.

### Moverse entre bloques

Cada pestaña es una columna larga de bloques, así que a la **izquierda** hay una
barra que los lista todos —*Destacados*, *Sobre mí*, *Experiencia*, *Educación*,
*Habilidades*… en las pestañas de idioma; *Contacto y enlaces*, *Idiomas (para el
CV)*, *Publicaciones (LinkedIn)*… en *General*— y salta al que pulses, sin pasar por lo de en medio.
El bloque que estás mirando queda marcado mientras te desplazas.

La lista cambia sola con la pestaña, y un bloque nuevo aparece en ella sin que
haya que anotarlo en ningún sitio. En pantallas estrechas, donde no cabe la
barra, los mismos bloques están en el desplegable **Ir a**, bajo las pestañas.

Cada sección (destacados, experiencia, educación, habilidades,
**reconocimientos**, **cursos adicionales** y **voluntariado**) permite
**añadir, eliminar y reordenar** elementos con los botones `↑` `↓` y *Eliminar*.
La insignia verde ("Disponible para prácticas…") también es editable; déjala
vacía para ocultarla.

En el menú de navegación se muestran **Mi historia/My story**, **Experiencia**,
**Educación**, **Reconocimientos**, **Contacto** y **Más/More**; *Sobre mí* y *Habilidades*
siguen en la página, pero no aparecen como enlaces del menú. Los enlaces de
**Reconocimientos** y **Más/More** desaparecen solos cuando esa sección está
vacía. Las etiquetas de todos ellos se editan en *Menú de navegación*, y si
añado una sección nueva al sitio su enlace aparece con la etiqueta por defecto
sin que tengas que volver a guardar.

Pulsa **Guardar cambios** y el sitio se actualiza al instante.

### Varios cargos en una misma compañía

Si te promueven o cambias de cargo, no repitas la compañía: agrega el cargo
nuevo dentro de la misma experiencia.

- En *Experiencia*, cada elemento tiene la **compañía / lugar** arriba
  (compartida) y debajo sus **cargos**, cada uno con su cargo, fecha,
  descripción y habilidades.
- **+ Añadir cargo en esta compañía** agrega el cargo nuevo **al principio** de
  la lista, que es lo habitual al ser promovido. Ordénalos del más reciente al
  más antiguo con `↑` `↓`, o quita uno con *Eliminar cargo*.
- Con **un solo cargo**, la tarjeta del CV se ve como siempre: el cargo como
  título, la compañía debajo y la fecha a la derecha.
- Con **dos o más**, la tarjeta muestra la **compañía como título** —con el
  rango total, calculado desde el inicio del cargo más antiguo hasta el fin del
  más reciente— y los cargos listados debajo, cada uno con su propia fecha,
  descripción y etiquetas.
- Recuerda hacer el mismo cambio en **English** y en **Español**.

### Mantener el inglés y el español en línea

Cada vez que **guardas** con cambios en uno de los dos idiomas, aparece una
ventana preguntando si quieres actualizar el otro: **Sí**, **No** o
**Después**. Trae solo los campos que cambiaron, **agrupados por elemento**
(«Experiencia #1 · Bridge Ventures Group», «Destacado #2»), no como una lista
de campos sueltos.

- **Sí** abre el panel de revisión: a la izquierda lo que acabas de guardar, a
  la derecha el otro idioma —editable— con lo que ya decía como texto por
  defecto. Cada campo trae un botón **Copiar ⟶** para traer el valor del otro
  lado tal cual, útil en fechas, enlaces y nombres propios. Al pulsar
  *Guardar*, se escribe y se publica.
- **Después** lo deja en la **campana** de la barra superior, con el número de
  elementos pendientes. Al abrirla puedes revisar todo lo de una dirección, o
  descartar una línea con la ✕. Al guardar la traducción, el pendiente
  desaparece solo.
- **No** lo descarta sin dejar rastro.
- El pendiente queda anotado en la campana **apenas aparece la ventana**, antes
  de que respondas: si recargas la página, cierras la pestaña o te vas a otro
  lado sin contestar, el recordatorio sigue ahí. Lo mismo si cierras el panel de
  revisión sin guardar. Solo **No** y guardar la traducción lo sacan de la lista.
- La lista de pendientes se guarda **en el servidor**, junto al contenido, así
  que la ves igual desde el computador y el teléfono, y sobrevive a cerrar el
  navegador.

Funciona en las **dos direcciones**: editar el inglés pregunta por el español y
al revés. Si en un mismo guardado cambiaste los dos idiomas, no pregunta nada —
esa edición ya venía bilingüe.

Detalles que conviene saber:

- Los elementos de las listas se emparejan **por id y, si no, por posición**, así
  que «Experiencia #3» se cruza con la experiencia equivalente en el otro idioma
  aunque las listas tengan distinto largo.
- Si un elemento **no existe todavía** en el otro idioma, el lado editable viene
  **en blanco** con el original al lado; al guardar se crea en la misma posición
  y **hereda el id**, de modo que los proyectos y posts asociados también
  aparecen en ese idioma.
- Si una lista tiene **distinto número de elementos** en cada idioma, el panel lo
  avisa arriba. Agregar o eliminar elementos se sigue haciendo en cada pestaña:
  el panel solo traduce, no cambia la estructura.
- **Proyectos y publicaciones no entran**: están escritos solo en inglés a
  propósito (el bloque «More about me» se muestra en inglés también en `/es`), así
  que no hay campo en español que traducir. Tampoco entran los datos comunes
  (nombre, foto, correo, enlaces, CV), que son los mismos en los dos idiomas.

### Habilidades por cargo y asociaciones

- Cada **cargo** tiene un campo opcional de **habilidades** (etiquetas separadas
  por comas o «·») que se muestran de forma discreta bajo su descripción.
- Las secciones **Reconocimientos**, **Cursos adicionales** y **Voluntariado**
  se muestran después de Habilidades (en ese orden) y comparten el mismo formato
  que Educación.
- Cada **curso** admite un **enlace al certificado** opcional; si lo agregas,
  aparece un enlace “Ver certificado” en su tarjeta.
- **Experiencia, educación, reconocimientos, cursos y voluntariado** pueden
  tener **proyectos** y **publicaciones (posts de LinkedIn)** asociados, que
  aparecen como etiquetas «Related» en su tarjeta. Un proyecto también puede
  tener posts asociados.
- En experiencia, la asociación es con el **cargo** exacto, no con la compañía:
  los desplegables *Asociar a* muestran una opción por cargo («Experiencia ·
  Cargo (Compañía)») y la etiqueta «Related» aparece dentro de ese cargo. Las
  asociaciones que ya tenías siguen apuntando al mismo cargo.
- Cada **reconocimiento** puede asociarse a una **educación** (u otro elemento);
  aparece como etiqueta «Related» en esa tarjeta y enlaza a la sección de
  reconocimientos.

### El botón **IA**

En la barra superior, el botón **IA** abre una ventana con tres pestañas. Todo
lo que hay ahí refleja el estado **actual del editor**, incluso cambios sin
guardar: no hace falta guardar antes de copiar.

#### 1. Copiar para la IA

Arma el texto que le pegas a una IA (ChatGPT, Claude…) y lo copia al
portapapeles. Tres decisiones:

- **¿Qué le vas a pedir?**
  - *Editar mi perfil* — tu perfil completo más las reglas para devolverlo en el
    mismo formato y volver a subirlo en la pestaña siguiente.
  - *Quién soy* — **no le pide nada**. Es tu historia y tu perfil juntos, para
    que la IA sepa con quién habla *antes* de que le encargues algo: una beca,
    una carta de motivación, un correo. Ver más abajo.
  - *Versión corta* / *Versión extensa* — tu perfil envuelto en un encargo:
    escribir tu **CV en LaTeX**. Ver más abajo.
- **Versión** — inglés, español o ambas. «Ambas» sirve para leer; para volver a
  subir hay que ir de a un idioma. Un CV, y también *Quién soy*, se escriben en
  un idioma, así que ahí «Ambas» queda apagada.
- **Qué incluir** — interruptores por bloque: identidad y contacto,
  presentación, destacados, experiencia, educación, habilidades,
  reconocimientos, cursos, voluntariado, **mi historia**, proyectos,
  publicaciones y los textos del sitio (menú, títulos de sección, contacto y
  SEO). Lo que apagues **no viaja**.

*Mi historia* es el único bloque que no aparece siempre: en *Editar mi perfil*
no se ofrece —ese documento vuelve a subirse y la historia no forma parte de
él—, en *Quién soy* viene encendido, y en los dos CV viene apagado, por si
alguna postulación pide que la IA entienda de dónde sale cada cosa.

En todos los casos el texto copiado le pide a la IA que **primero te cuente qué
piensa hacer y te pregunte**, y que si se le ocurre una mejora la consulte en
vez de aplicarla. Recién cuando le digas que sí escribe el documento.

##### *Quién soy*: contexto, no encargo

Es el texto para **empezar** una conversación, no para cerrarla. Lleva tu
historia completa (los hitos, con sus enlaces al CV) y tu perfil, le explica que
la historia es el *por qué* y el currículum el *qué*, y le prohíbe inventar un
dato que no esté ahí: si le falta algo, tiene que preguntártelo.

Trae un campo libre, **¿para qué lo vas a usar?**, donde escribes la beca, el
programa o la carta que tienes en mente; vacío, queda como contexto general y se
lo dices tú en el mensaje siguiente. Termina pidiéndole dos cosas y que se
detenga: **quién cree que eres**, en cinco o seis líneas y con tus palabras, y
**qué necesita saber** que no esté en el texto.

Abajo a la izquierda ves el tamaño de lo que vas a copiar, por si la IA que uses
tiene un límite.

#### 2. Subir / actualizar web

Aquí pegas el documento que devolvió la IA. **Un idioma a la vez** — el propio
documento dice cuál es, y si perdió esa marca te deja elegirlo a mano. Mientras
escribes, la ventana ya te dice qué idioma detectó y qué secciones reconoció.

*Revisar cambios* abre una segunda ventana con **todos los cambios, uno por
uno**: a la izquierda lo que dice la web hoy, a la derecha lo que dice el
documento, agrupados por elemento («Experiencia #1 · Bridge Ventures Group»),
cada uno con su casilla.

- Las **ediciones** y los **elementos nuevos** vienen **marcados**.
- Todo lo que **borra** viene **sin marcar** y hay que elegirlo a mano: eliminar
  un elemento, quitar un cargo de una compañía, o dejar un texto en blanco. Es
  la protección contra el caso más común — que la IA corte la respuesta a mitad.
- Lo que dejes sin marcar se queda **exactamente** como está hoy.

*Publicar* escribe y publica solo lo marcado, y después aparece la pregunta de
siempre sobre el otro idioma.

Dos reglas que conviene tener claras:

- **Una sección que no viene en el documento no se toca.** Si la IA no escribió
  `## Skills`, tus habilidades siguen igual. Para borrar un elemento hay que
  mandar la sección **con** los demás elementos y **sin** ese.
- **Los identificadores importan.** Cada elemento viaja con un comentario
  `<!-- id: … -->` invisible. Es lo que distingue «renombré este cargo» de
  «borré uno y creé otro», y lo que mantiene enganchados los proyectos y
  reconocimientos asociados. Si la IA los pierde, la ventana lo avisa y empareja
  por posición.

#### 3. CV en LaTeX

Un único cuadro de texto que hace dos cosas: es la **forma** que se le pide a la
IA que siga cuando le encargas un CV, y es donde **pegas el `.tex` que te
devuelve**.

- *Descargar .tex* baja lo que haya en el cuadro como archivo.
- *Guardar como plantilla* lo deja como la nueva forma de referencia — queda
  como cambio sin guardar, así que después hay que pulsar **Guardar cambios**.
  Es un botón aparte a propósito: un `.tex` que no te convenció se descarga sin
  ensuciar la plantilla.
- *Restaurar la plantilla de ejemplo* vuelve al CV que venía de fábrica.

Aquí **no se compila nada**: no hay LaTeX en el servidor. El PDF que sirve `/cv`
se sube aparte, en *General → Currículum (PDF)*.

##### Las dos versiones del CV

- **Corta** — máximo **2 carillas**. Entre 1 y 2 puntos por trabajo, nunca tres;
  cada punto de 1 a 2 líneas. Un trabajo que se lee mejor en prosa va sin
  viñetas, con 2 o 3 líneas. Y nunca queda un punto solo: si un trabajo se
  reduce a una idea, va como texto corrido.
- **Extensa** — **3 carillas**, y 4 solo si de verdad hace falta. Hasta 3 puntos
  por trabajo pero promediando 1 o 2, con las mismas reglas de viñetas. Puede
  añadir una línea de habilidades por cargo.

Las dos versiones traen la casilla **enlazar a mi web**: un proyecto o una
publicación con página propia queda enlazado desde el CV, en cualquiera de los
dos largos. La segunda casilla, **conectar secciones entre sí** —un premio
menciona la carrera donde lo ganaste, un proyecto el cargo del que salió—, es
solo de la versión extensa, que tiene espacio para esas frases.

##### Dirigir el CV a un puesto

Las dos versiones traen un campo de texto libre: **¿va dirigido a alguien en
particular?**. Pega ahí la empresa, el cargo o el aviso completo y el encargo le
pide a la IA que ordene y redacte todo para maximizar tus opciones ahí — sin
inventar nada, y recortando primero lo menos relevante para ese puesto. Si lo
dejas vacío, sale un CV genérico.

Los datos que el CV necesita y la web no muestra — **teléfono** e **idiomas** —
se editan en la pestaña *General*.

### Formato Markdown en los textos

Los campos de texto del CV aceptan **Markdown**, así que puedes dar formato
(negrita, cursiva, enlaces, listas) sin tocar código. Hay dos niveles:

- **Markdown completo** — párrafos, listas con viñetas, `**negrita**`,
  `*cursiva*`, `[enlaces](https://…)`, `# títulos` y `> citas`. Se aplica al
  texto de **Perfil profesional** ("Positioning") y a la **descripción de cada
  cargo**. Úsalos cuando quieras viñetas o varios párrafos.
- **Markdown en línea** — solo `**negrita**`, `*cursiva*`, `código` y
  `[enlaces](https://…)`. Se aplica al **subtítulo**, la **descripción** del
  encabezado y los textos de **educación**, **habilidades**,
  **reconocimientos**, **cursos adicionales**, **voluntariado** y **contacto**.
  En estos campos, de una sola línea, una lista con `-` no se convierte en
  viñetas.

El texto sin símbolos de Markdown se sigue viendo igual que siempre.

### Proyectos y publicaciones — bloque «More about me» (dentro del CV)

Los proyectos y las publicaciones de LinkedIn ya **no viven en una página
aparte**: son un bloque del propio CV, presente en los dos idiomas. El orden al
final de la página es un sándwich: la tarjeta de contacto («Let's grab a coffee»
/ «¿Nos tomamos un café?»), luego **More about me** con **Projects**
(`#projects`) y **Publications** (`#publications`), y otra vez la misma tarjeta
de contacto. Así, se lea de arriba a abajo o se llegue directo al bloque, la
forma de escribirte queda siempre a la vista.

El bloque va **siempre en inglés**, también en `/es`: los proyectos y los posts
están escritos en inglés, así que el CV en español muestra el mismo contenido en
lugar de una traducción a medias. En el CV en español el título lleva la
etiqueta «en inglés», y el enlace del menú dice **Más** (apuntando igualmente a
`#more`).

El enlace del menú se muestra cuando existe al menos un proyecto o una
publicación. Las direcciones antiguas siguen funcionando: `/en/more` redirige a
`/en#more`, y `/en/publications` o `/es/publicaciones` a la sección
`#publications` del CV.

**Proyectos** (pestaña **Projects**, solo inglés): cada proyecto se publica como
página propia tipo blog.

- Campos: título, *slug* (la dirección `/en/projects/…`), fecha, **asociación**
  (un desplegable con tus cargos, educación, cursos y voluntariado),
  resumen, imagen de portada opcional, contenido en **Markdown**, galería de
  imágenes y enlaces.
- Tanto la **portada** como cada imagen de la **galería** aceptan las dos vías:
  pega un enlace a la foto o súbela desde tu equipo (máx. 5 MB).
- Al asociar un proyecto, aparece como etiqueta dentro de ese elemento del CV.
  En el bloque «More about me», los proyectos se agrupan bajo el elemento
  asociado, con su nombre en inglés (igual que el resto del bloque).
- El **Markdown** admite `# Título`, `**negrita**`, `*cursiva*`, listas,
  `> citas`, `código` y `[enlaces](https://…)`.

**Publicaciones** (pestaña **General** → *Publicaciones*): cada post enlaza al
original en LinkedIn.

- Campos: título, fecha, enlace al post, resumen, **imagen** (pega un enlace o
  súbela) y **asociación** opcional a una experiencia, educación, curso,
  voluntariado o **proyecto**.
- Si asocias un post, aparece como etiqueta «Related» en ese elemento del CV.
  Al abrirlo desde el CV, no salta directo a LinkedIn: baja hasta ese post en la
  misma página (`#pub-…`) y lo **resalta**. Desde la tarjeta del post, el enlace
  sí abre LinkedIn.

### Mi historia — la página `/story`

El CV cuenta **qué** has hecho; esta página cuenta **cómo llegaste ahí**. Vive
aparte del currículum, en `/en/story` y `/es/historia` (y `/story` lleva a la
inglesa), y va en **los dos idiomas**.

Se llega a ella por tres caminos, y los tres aparecen y desaparecen juntos: el
**enlace del menú** (en degradado, el único que no lleva a una sección de la
página en la que estás), un **botón en el encabezado** del CV, junto a
*Descargar CV*, y una invitación al **final de «Sobre mí»**. Están mientras haya
un saludo o al menos un hito; si vacías las dos cosas, la página deja de
ofrecerse sola.

La invitación de «Sobre mí» es una **tira con las fotos de la historia**: los
primeros seis hitos que tengan foto, cada uno con su año debajo, y toda la tira
es el enlace. Mientras no haya ninguna foto es solo el botón «Read my story» /
«Leer mi historia» — una tira vacía diría menos que una frase.

**La portada** (pestaña **Story** → *Portada de la historia*), por idioma:

- **Nombre del enlace** — lo que dice el menú y el botón del CV («My story»,
  «Mi historia»).
- **Saludo** — el titular grande. Lo que escribas en `**negrita**` sale en el
  **degradado de color**: así se destaca tu nombre dentro de la frase, sin tocar
  código.
- **Entrada** y **cierre** — Markdown, antes del primer hito y después del
  último.

**Los hitos** (*Story* → *Hitos*) se dibujan como una línea de tiempo: en
pantalla ancha van cayendo **a lado y lado del riel**, cada uno frente a su
fecha; en el teléfono quedan en una sola columna, con el riel a la izquierda.
Salen en el orden de la lista — lo natural es del más antiguo al más nuevo — y
se reordenan con `↑` `↓`. El riel **se va pintando** con el degradado a medida
que se baja, y **cada foto se enciende** cuando la línea la alcanza: hasta ese
momento está en gris y un poco más chica, y al llegar el riel sale en color. Ni
el riel ni las fotos vuelven atrás si subes de nuevo — lo ya visto queda visto.
Con «reducir movimiento» activado sale todo entero y en color desde el
principio. La línea **termina en «Today» / «Hoy»**, para que no se deshilache al
final: el último hito no es el fin de nada.

Dos ayudas para leer una historia larga, que no se editan porque salen solas:

- Mientras estás **dentro de un capítulo**, su nombre queda fijo bajo la barra
  de navegación, así que siempre sabes en qué etapa vas. Desaparece antes del
  primer hito y después del último.
- Con más de tres hitos aparece un interruptor **Extendida / Compacta**, el
  mismo que ya tiene *Experiencia*. En compacta la línea de tiempo se reduce a
  la fecha y el título —sin textos, sin fotos, sin etiquetas— y cabe de una
  pasada. Es una elección de esa visita: la página no la recuerda.

Cada hito se edita **una sola vez, con los dos idiomas dentro**: la fecha, las
fotos y los enlaces al CV son el mismo hecho en inglés y en español, y separarlos
significaría encuadrar cada foto dos veces.

- **Fecha** — se muestra tal cual: `2004`, `2021 – 2022`. Un año sirve igual en
  los dos idiomas.
- **Fecha en palabras** (opcional, por idioma) — para cuando la fecha no es un
  año: «I don't remember the year» / «No recuerdo el año». Vacía, se usa la de
  arriba.
- **Título** y **texto** por idioma. Los dos admiten Markdown, **enlaces
  incluidos**: `[texto](https://…)`, `**negrita**`, `*cursiva*`, listas,
  `> citas` y `código`. Un enlace a otro sitio se abre en una pestaña nueva; uno
  que empiece por `/` o `#` navega dentro de tu web (`/en#experience`,
  `/en/projects/mi-proyecto`).
- **Capítulo que empieza aquí** (opcional, por idioma) — nombra la etapa que
  arranca en ese hito («Colegio», «Universidad», «Salir al mundo») y el riel se
  corta con ese rótulo justo antes. Déjalo vacío en los hitos que solo continúan
  el anterior. Si lo escribes en un solo idioma, el otro usa el mismo rótulo: es
  lo que da forma a la página, y las dos versiones tienen que partirse igual.
- **Imágenes** — normalmente una. En pantalla ancha la foto va montada **sobre
  el riel, en lugar del punto**: es la marca del hito en la línea de tiempo, y
  al pulsarla se abre **completa y sin recortar** en una ventana (con flechas y
  `←` `→` si hay varias, `Esc` para cerrar). En el teléfono va sobre el título
  del hito. Con dos o tres se **apilan superpuestas**, como una fila de
  avatares; de la cuarta en adelante la última lleva un `+N` y todas siguen
  estando en la ventana. Un hito sin foto conserva el punto de siempre.
- **Enlaces al CV** — **puedes nombrar varios**: el año en que entraste a la
  universidad es la carrera, el cuadro de honor y la ayudantía a la vez. Cada uno
  sale como una etiqueta bajo el hito, que lleva a esa parte del currículum. Es
  un enlace **de ida**: las tarjetas del CV no cambian.
- **SEO de la historia** — título y descripción por idioma, para Google y para
  cuando compartes el enlace.

**Forma de las imágenes** (*Story* → *Hitos*, arriba de la lista): un solo
interruptor para toda la línea de tiempo — **círculo**, **redondeada** o
**cuadrada**. Cada opción muestra la forma que significa. Se ven pequeñas a
propósito: la foto es la marca del momento, y la ventana es para mirarla. El
recorte que elijas en *Encuadre* es el de esa marca; la ventana siempre abre la
imagen entera. La miniatura del editor y la ventana de encuadre se cortan con
la forma elegida, así que encuadras contra lo que se va a ver de verdad.

La historia también viaja a la IA: es el bloque *Mi historia* de *Copiar para la
IA*, y el corazón del texto *Quién soy*.

### Encuadre de las imágenes

Toda imagen se muestra dentro de un marco: **16:9** en la portada y la galería
de un proyecto y en las imágenes de un post, y la **forma elegida en *Story*
→ *Hitos*** (círculo, redondeada o cuadrada) en los hitos de la historia.
**Pulsa la miniatura** (o el enlace *Encuadrar* que hay junto a ella) y se abre
una ventana con la vista previa exacta de ese marco, con su misma forma:

- **Tamaño** — *Ajustar* muestra la imagen completa, con márgenes; *Rellenar*
  llena el marco y recorta los bordes.
- **Zoom** — del 100 % al 400 %, con la barra o con la rueda del ratón sobre la
  vista previa. Acerca hacia la parte que hayas dejado a la vista.
- **Mover** — arrastra la imagen dentro del marco (o usa las flechas del
  teclado) para elegir qué parte se ve.
- **Restablecer** — vuelve a la imagen centrada y sin zoom.

Nada de esto recorta el archivo: la foto original queda intacta y el encuadre es
solo la forma de mostrarla, así que puedes rehacerlo tantas veces como quieras.
Cada imagen guarda el suyo —dos fotos del mismo proyecto pueden ir una
*Ajustar* y otra *Rellenar*—, la miniatura del editor enseña el resultado al
instante y se publica al pulsar **Guardar cambios**.


---

## 2. Métricas de visitas (`/admin/stats`)

En la barra superior del editor, el botón **Métricas** abre tu propio panel de
estadísticas. Hay dos capas, y se complementan:

- **Tu panel** (`/admin/stats`) — lo que importa para un CV: quién entra, de
  dónde llega y si se lleva el CV.
- **Vercel Analytics** — tráfico general, rendimiento (Speed Insights) y series
  históricas, en el panel de Vercel. Se activa solo al desplegar.

### Qué mide tu panel

| Bloque | Qué responde |
| --- | --- |
| Visitas / visitantes únicos | Cuánta gente entra, comparado con el período anterior |
| **Descargas del CV** | Cuántas veces una persona abrió `/cv` y `/cv-es`. Lo confirma su navegador al mostrar el aviso de la fecha, así que los escáneres y monitores que piden el PDF no cuentan |
| Clics de contacto | WhatsApp, correo y LinkedIn |
| Acciones | Cada descarga, cada clic de contacto, **qué publicación** abrió cada quien y **qué pasó en la historia**, todo por su título |
| Origen de las visitas | De qué canal llegan (ver abajo) |
| Páginas más vistas | Si además del CV miran proyectos y publicaciones |
| Países y dispositivos | Desde dónde y con qué te leen |
| Hasta dónde leen | Hasta qué punto de la página bajan antes de irse |
| **Hasta dónde llega la historia** | «Historia · llegó a *University*» por cada capítulo alcanzado, «la leyó hasta el final» al llegar al último hito, y «foto de *…*» por cada imagen que alguien abre |
| Tiempo en la página | Si de verdad la leen o rebotan |
| Actividad reciente | Cada visita entera, desplegable: por qué páginas pasó esa persona, en qué orden, cuánto estuvo en cada una y qué pulsó |
| **Bots filtrados** | Cuántos accesos automáticos se descartaron y por qué (ver *Protección contra bots*) |

Arriba puedes cambiar el rango: **7, 30 o 90 días**. Se guarda un año de
historial.

### El rastro de cada visita

En «Actividad reciente» cada línea es una **visita completa**, no un clic
suelto. Ábrela con la flecha y ves el recorrido en orden:

```
Visitante 3 · Hoy · 12:04 · 2 páginas · 2 min 59 s · 🇪🇸 Madrid · linkedin
  12:04  /es              47 s · leyó 75 %
  12:05  /es/proyectos    2 min 12 s · leyó 100 %
  12:07  Descarga del CV (ES)
```

- El número («Visitante 3») vale **solo dentro de su día**: el hash rota a
  medianoche, así que el Visitante 3 del martes y el del miércoles no son la
  misma persona. Dentro del mismo día sí: si vuelve por la tarde aparece otra
  visita con su mismo número y la etiqueta **vuelve**.
- Una pausa de **30 minutos** cierra la visita; lo siguiente ya es otra.
- El tiempo de cada página lo manda el navegador al salir de ella. Si se pierde
  ese aviso (cierre brusco, pestaña matada) verás *sin medir*, y el total lleva
  un `+` para avisar de que se queda corto.
- Este detalle se guarda **14 días**; los totales, un año.

### Saber por qué canal llegó cada persona — panel «Compartir» (`/admin/share`)

Botón **Compartir** en la barra del editor (también desde Métricas). Ahí tienes,
listo para copiar, el enlace de cada canal con su etiqueta ya puesta:

| Canal | Enlace |
| --- | --- |
| LinkedIn | `…/en?src=linkedin` |
| Instagram | `…/en?src=instagram` |
| WhatsApp | `…/en?src=whatsapp` |
| QR impreso | `…/en?src=qr` |
| Correo | `…/en?src=email` |
| Reenvíos desde el sitio | `…/en?src=reshare` |

Esa lista es tuya: abajo, en **Mis etiquetas**, puedes **añadir, renombrar,
ocultar y quitar** etiquetas. Cada una tiene:

- **Etiqueta** — lo que va después de `?src=` (`gmail`, `uc3m-gmail`,
  `cvenweb`…). Minúsculas, números, puntos y guiones, así que también vale
  `vicentegomez.cl`.
- **Nombre** — cómo la ves en Métricas («Firma del correo UC3M»).
- **Nota** — dónde está puesta, para acordarte.
- **Oculta** — sin tarjeta en Compartir, pero reconocida por su nombre en
  Métricas. Para versiones cortas o enlaces que ya están puestos (la firma, el
  PDF del CV).

Si llegan visitas con una etiqueta que no está en la lista, aparece debajo como
botón: tócalo y le pones nombre. Sirve también para nombrar un origen sin
etiqueta, como `l.instagram.com`. Quitar una etiqueta no borra sus visitas:
solo dejan de tener nombre. Los cambios se guardan con **Guardar**.

Cada canal trae **su código QR** al lado, descargable en **PNG** (pantallas,
historias de Instagram) y **SVG** (vectorial: imprímelo del tamaño que quieras
sin que se pixele). El QR ya lleva la etiqueta dentro, así que quien lo escanee
se cuenta en ese canal.

Arriba eliges **qué** compartes: CV en inglés, CV en español, la página de
proyectos y publicaciones, o el **PDF del CV directo**. Los enlaces y los QR se
regeneran solos.

Al lado de cada canal aparece cuántas visitas ha traído (30 días y total), así
ves qué canal vale la pena repetir.

**Etiqueta propia**: escribe cualquier cosa («Banco Santander», «feria empleo
UC3M», «profesor Méndez») y se convierte en una etiqueta limpia
(`banco-santander`). Úsala cuando quieras saber si **esa persona concreta** abrió
tu CV.

**`reshare` se aplica solo**: es el enlace que reparte el botón «Compartir» que
ven los visitantes en tu web, así que mide el boca a boca.

Sin etiqueta la visita se cuenta igual: aparece como el sitio de origen
(LinkedIn, Google…) o como **Directo**. La etiqueta se mantiene mientras la
persona navega por el sitio, así que también sabrás qué canal terminó en una
descarga del CV.

### Privacidad (y por qué no hace falta banner de cookies)

- **No se instalan cookies** ni identificadores persistentes. Cada visitante se
  cuenta con un hash del día (IP + navegador + secreto + fecha) que se vuelve
  inservible al día siguiente: no se puede seguir a nadie de una jornada a otra.
- **No se guarda ninguna IP.** El país y la ciudad los aporta la red de Vercel,
  solo en producción.
- **Tus propias visitas no cuentan** mientras tengas sesión de `/admin` en ese
  navegador. Los bots tampoco (abajo).
- Para excluirte **de forma permanente**, al final del panel está el botón
  **«No contar mis visitas desde este dispositivo»**: deja una cookie de un año
  que el servidor respeta en todo (páginas, clics y descargas del CV), aunque
  caduque tu sesión de admin. Es por navegador, así que púlsalo también desde el
  móvil y desde cualquier otro que uses; se desactiva con el mismo botón.
- Nada de esto identifica a una persona concreta: sabrás que alguien de Madrid,
  desde LinkedIn, se descargó tu CV — no quién.

### Protección contra bots

El sitio **no bloquea a nadie** ni pone captchas: un reclutador entra como
siempre, y los buscadores o una IA que lea tu CV siguen recibiendo las páginas
y el PDF. Lo que cambia es **qué cuenta como persona**:

- Una visita solo vale si la confirma un **navegador real**. Lo revisa
  [Vercel BotID](https://vercel.com/docs/botid), invisible para quien entra,
  junto con unas reglas propias: el navegador no puede estar controlado por un
  programa y el aviso tiene que salir del propio sitio.
- Las **descargas del CV** las confirma el aviso de la fecha que ve la persona.
  Lo que pide el PDF sin pasar por ahí (filtros de seguridad del correo que
  abren todos los enlaces de un mail, monitores, `curl`, una IA) recibe el PDF
  igual, pero no suma.
- Todo lo descartado se cuenta aparte en **Bots filtrados**, por motivo, para
  que veas que el filtro trabaja. No aparece en Actividad reciente ni en las
  cifras.

Esto importa sobre todo con los enlaces de tu **firma de correo**: los filtros
de seguridad de muchas empresas (Outlook Safe Links, Mimecast…) abren cada
enlace de un mail en cuanto llega, desde datacenters de cualquier país.

Al final del panel hay tres botones:

- **No contar mis visitas desde este dispositivo** — el de arriba: excluye ese
  navegador durante un año.
- **Comprobar almacenamiento** — lee y vuelve a escribir el archivo de métricas
  y te dice si funcionó. Úsalo si los contadores se quedan clavados en cero: los
  fallos al guardar se ignoran a propósito (una métrica rota jamás debe romper
  una página), así que esta es la forma de enterarte.
- **Borrar todas las métricas** — deja el contador a cero. Pide confirmación y
  no tiene vuelta atrás.

### Dónde se guardan

En la tabla `analytics_data` de Supabase; en local, en `data/analytics.json`.
Se escriben ya agregados por día, así que la fila no crece con el tráfico.

La tabla tiene Row Level Security activado **sin ninguna política**, así que
ni un usuario anónimo ni uno autenticado puede leerla — solo la clave de
servicio (usada exclusivamente desde el servidor) tiene acceso. A diferencia
del store de Blob anterior, aquí no depende de que el nombre del archivo sea
difícil de adivinar: el acceso está bloqueado por diseño.

Una limitación honesta que sigue igual: si dos visitas caen en el mismo
milisegundo en dos instancias distintas de Vercel, es posible perder alguna.
Para un sitio personal no cambia nada.

---

## 3. Firmar documentos (`/admin/firmas`) y verificarlos (`/verify`, `/verificar`)

En el editor, el botón **Firmas** abre `/admin/firmas`. Ahí firmas un PDF y
queda verificable por cualquiera en `resume.vicentegomez.cl/verify` (en
inglés) o `resume.vicentegomez.cl/verificar` (en español).

### Tu firma

Súbela una vez en **Tu firma**: sirve una foto de la firma en papel blanco,
porque *Quitar el fondo blanco* la deja transparente. Se guarda (en privado) y
se reutiliza en cada documento; **Reemplazar firma** la cambia.

### Firmar un PDF

1. **Elige o arrastra un PDF** (hasta 25 MB, sin contraseña).
2. Ponle **título** y, si quieres, una **nota** que se verá al verificar
   (por ejemplo, «Carta de recomendación para…»).
3. Elige:
   - **Público**: quien tenga el ID ve y descarga el PDF firmado.
   - **Privado**: la verificación solo muestra los datos (título, fecha, huella);
     quien tenga una copia puede comprobarla subiéndola.
   - **Sello del ID**: en el **margen izquierdo** (vertical, como DocuSign) o
     en el **pie de página**. Va en todas las páginas.
   - **Idioma** (español o inglés): el del texto impreso en el PDF y el de la
     página adonde lleva el QR — `/verificar/<ID>` o `/verify/<ID>`.
   - **Nombre y fecha bajo la firma**.
4. **Firma** y **QR** tienen cada uno su opción: **No**, **Última
   página** o **Todas las páginas**. Se **arrastran** para moverlos y se
   cambia el tamaño desde la **esquina** (la proporción se mantiene). En
   *Todas las páginas* van en el mismo lugar de cada una: al mover uno se
   mueven todos. Al acercarlos al centro de la página aparece una línea
   rosada y se ajustan solos al centro, horizontal o verticalmente. Bajo el
   QR se imprime la dirección corta (`vicentegomez.cl/verify` o
   `/verificar`) para quien no pueda escanearlo. La × los quita. El lugar y la opción se recuerdan para el
   siguiente documento mientras no recargues. El QR lleva directo al
   documento, en el idioma elegido.
5. **Firmar documento**. Aparece el ID con los botones para descargar el PDF
   firmado, ver su verificación y copiar el enlace.

### Enviar a otras personas para que firmen

En **Otras personas que firman** → **+ Agregar firmante**, con nombre y correo
(hasta 10). Cada una tiene su recuadro de color en el PDF: arrástralo donde
debe firmar y elige **Última página** o **Todas las páginas**. Tu firma es
opcional: con **Tu firma** en *No*, solo firman ellos. El botón pasa a ser
**Enviar a N firmantes**.

Lo que pasa después:

1. Cada firmante recibe un correo desde `firmas@vicentegomez.cl` (las
   respuestas te llegan a ti) con su enlace personal. Vence en 30 días.
2. Al abrirlo pide un **código de 6 dígitos** que se le envía a su correo.
   Solo después de ingresarlo ve el documento, con su recuadro marcado.
3. Puede **descargar el original**, **dibujar** su firma (dedo o mouse) o
   **escribirla** (su nombre en letra manuscrita), aceptar la firma
   electrónica y **Firmar**, o **Rechazar** con un motivo.
4. Te llega un correo cada vez que alguien firma o rechaza. Firman en
   cualquier orden. Un rechazo cierra el documento para todos.
5. Con la última firma se genera el **PDF final**: todas las firmas en su
   lugar, el Doc ID, el QR, la firma digital y el sello de tiempo. Se genera
   también un **certificado de auditoría** aparte, un PDF firmado con cada
   firmante, su correo verificado, la hora de cada paso, la IP y el
   navegador, y los hashes. Ambos llegan por correo a todos, incluido tú.

En **Documentos**, cada envío muestra quién firmó y quién falta:

- **Reenviar:** manda un enlace nuevo y el anterior deja de funcionar.
- **Cancelar envío:** desactiva los enlaces.
- **Generar PDF final:** aparece si firmaron todos pero el cierre falló.
- **Auditoría:** descarga el certificado. Solo tú puedes, porque tiene los
  correos y las IP de los firmantes.

En /verify, un envío pendiente aparece como *Esperando firmas (1/2)*, y uno
completo lista a los firmantes con el correo enmascarado (`a•••@gmail.com`).

**Requisitos:**
- La variable `RESEND_API_KEY` en Vercel. Puede ser la misma cuenta de Resend
  de la web de clases, donde `vicentegomez.cl` ya está verificado.
- El último bloque de `supabase/schema.sql`: la columna `status` y la tabla
  `document_signers`.

### Qué lleva el PDF firmado

- El **Doc ID** (un UUID, como el *Envelope ID* de DocuSign) y la dirección
  corta `vicentegomez.cl/verify` (o `/verificar`) en cada página, más tu
  firma y el QR donde los pusiste.
- Una **firma digital incrustada** (PAdES, `ETSI.CAdES.detached`) con un
  certificado propio. Cualquier cambio posterior al PDF la invalida, y el
  panel de firmas de Adobe lo muestra.
- Un **sello de tiempo RFC 3161 de FreeTSA** (gratuito e independiente) que
  prueba la hora de la firma sin depender de este servidor. Si FreeTSA no
  responde, se firma igual sin él y la lista lo indica.

Adobe dirá «identidad desconocida» porque el certificado es tuyo y no de una
autoridad. Quien quiera verlo como válido puede descargar el certificado desde
/verify y marcarlo como de confianza. **No es firma electrónica avanzada**
en el sentido de la Ley 19.799, que exige un prestador acreditado: es firma
electrónica simple, con integridad comprobable.

### Revocar o cambiar la visibilidad

En **Documentos firmados**, cada documento tiene **Hacer privado / público** y
**Revocar…** (pide un motivo, que se muestra al verificar). **Quitar
revocación** lo deshace. No hay botón para borrar: un documento borrado haría
que la verificación dijera «no existe» de algo que sí firmaste.

### Las páginas `/verify` y `/verificar`

`/verify` está en inglés y `/verificar` en español: son la misma página, cada
una en su idioma. El botón **EN/ES** de arriba cambia entre ellas sin perder
el documento. La dirección corta impresa (`vicentegomez.cl/verify`) vive en
la web de clases, que **debe redirigir** `/verify` y `/verificar` (con lo que
venga detrás) a `resume.vicentegomez.cl`. El QR no depende de eso: apunta
directo a `resume.vicentegomez.cl`.

- **Con el ID**: se escribe en el formulario o se escanea el QR. La página
  dice *Documento válido* o *revocado*, y muestra título, fecha, sello de
  tiempo y el PDF si es público.
- **Sin el ID**: se elige el PDF y se busca por su huella SHA-256. El
  archivo **se analiza en el navegador** y nunca se sube.
- **Comprueba tu copia** dice si un archivo es exactamente el firmado, si es
  el original sin firmar, o si fue modificado.

Los PDF se abren desde el propio dominio (`resume.vicentegomez.cl/files/<ID>/signed.pdf?token=…`):
Vercel los trae de Supabase por detrás, con un enlace que vence a los 10 minutos.

### Configurar el certificado (una sola vez)

```bash
node scripts/create-signing-cert.mjs "Vicente G. Gómez" vicente@vicentegomez.cl
```

Imprime `SIGNING_CERT_PEM` y `SIGNING_KEY_PEM`. Copia cada valor **completo**,
con las líneas `-----BEGIN …-----` / `-----END …-----` y los `\n` incluidos.
En Vercel pégalo sin las comillas de los extremos (si se cuelan, también
funciona); en `.env.local` pega la línea tal cual. La clave privada **no se
pega en ningún chat ni archivo del repo**: quien la tenga puede firmar como tú. **No lo
regeneres**: un certificado nuevo hace que las firmas siguientes muestren otra
identidad. En local, sin esas variables, se crea uno de prueba en `data/`.

Además hay que correr la parte de firmas de `supabase/schema.sql`: crea la
tabla `signed_documents` y el bucket **privado** `signed-documents`.

---

## 4. Cómo iniciar sesión

1. Entra a `https://tu-dominio/admin`.
2. Ingresa uno de los correos autorizados y la contraseña.
3. La sesión dura 7 días.

---

## 5. Configuración (variables de entorno)

El login y el guardado usan variables de entorno. **Nunca se guardan en el código.**

| Variable | Para qué sirve | Obligatoria |
| --- | --- | --- |
| `ADMIN_PASSWORD` | Contraseña de acceso a `/admin` | Sí (en producción) |
| `SESSION_SECRET` | Firma las sesiones (cadena aleatoria) | Sí (en producción) |
| `SUPABASE_URL` | URL del proyecto de Supabase (`https://xxxx.supabase.co`) | Sí en Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio de Supabase, guarda cambios e imágenes | Sí en Vercel |
| `ADMIN_EMAILS` | Lista de correos permitidos, separados por coma | Opcional |
| `SIGNING_CERT_PEM` | Certificado con que se firman los PDFs (`scripts/create-signing-cert.mjs`) | Sí en Vercel, para firmar |
| `SIGNING_KEY_PEM` | Clave privada de ese certificado (secreta) | Sí en Vercel, para firmar |
| `TSA_URL` | Autoridad de sellos de tiempo (por defecto `https://freetsa.org/tsr`) | Opcional |
| `RESEND_API_KEY` | Envía las invitaciones, los códigos y los PDF finales a quienes firman | Sí, para enviar a firmar |
| `SIGNING_EMAIL_FROM` | Remitente de esos correos (por defecto `Vicente G. Gómez · Firmas <firmas@vicentegomez.cl>`) | Opcional |

Para generar un `SESSION_SECRET` seguro:

```bash
openssl rand -base64 32
```

### Local (desarrollo)

Ya existe un archivo `.env.local` (no se sube a git) con una contraseña de
prueba y un secreto generado. Cámbialos si quieres:

```bash
ADMIN_PASSWORD=tu-contraseña
SESSION_SECRET=<pega-aquí-el-resultado-de-openssl>
```

En local, si no hay `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, los cambios se
guardan en `data/resume.json` y las imágenes en `public/uploads/` (ambos
ignorados por git).

---

## 6. Publicar en Vercel

1. **Crea un proyecto en [supabase.com](https://supabase.com)** (uno dedicado
   a este sitio, no compartido con otro proyecto).
2. **Corre el script** `supabase/schema.sql` una vez, en el *SQL Editor* del
   panel de Supabase: crea las tablas `resume_content` y `analytics_data`
   (con Row Level Security activado y sin políticas — solo la clave de
   servicio puede leerlas o escribirlas), el bucket público
   `resume-uploads` para fotos y PDFs, y lo de las firmas: la tabla
   `signed_documents` y el bucket privado `signed-documents`.
3. **Copia las credenciales**: en el panel de Supabase → *Settings* →
   *API* → `Project URL` y `service_role` (bajo *Project API keys*).
4. **Añade las variables** en Vercel → *Settings* → *Environment Variables*:
   - `SUPABASE_URL` = el *Project URL*.
   - `SUPABASE_SERVICE_ROLE_KEY` = la clave `service_role` (secreta — nunca la
     pongas en el código ni la compartas fuera de Vercel).
   - `ADMIN_PASSWORD` = la contraseña que quieras.
   - `SESSION_SECRET` = el resultado de `openssl rand -base64 32`.
5. **Vuelve a desplegar** (*Redeploy*) para que tome las variables.

Con `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` presentes, todo el contenido y
las imágenes se guardan en Supabase y quedan en vivo para todos los
visitantes al instante.

> Si algún día quieres cambiar los correos con acceso, define `ADMIN_EMAILS`
> (por ejemplo `correo1@x.cl,correo2@y.cl`) en las variables de entorno.

---

## 7. Notas técnicas

- **Auth**: correo permitido + contraseña compartida, con sesión firmada
  (JWT `jose`) en una cookie `httpOnly`. La comparación de contraseña es de
  tiempo constante. La página `/admin` no se indexa en buscadores.
- **Contenido**: el contenido por defecto vive en `lib/resume-content.ts`
  (semilla). Lo editado se guarda aparte (Supabase o archivo) y se fusiona
  sobre la semilla, así nunca se rompe si se agrega un campo nuevo.
- **Almacenamiento**: `lib/resume-store.ts` elige automáticamente Supabase o
  archivo local según existan `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`.
- **SEO / conversión**: metadatos por idioma, datos estructurados `Person`
  (JSON-LD), insignia de disponibilidad, foto, y llamados a la acción claros.
- **Responsive**: optimizado para móvil y escritorio, con menú móvil y respeto
  por `prefers-reduced-motion`.
