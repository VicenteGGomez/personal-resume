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

En el editor hay cuatro pestañas:

- **General** — foto de perfil (subir/quitar), nombre, ubicación, correo,
  WhatsApp, LinkedIn y los enlaces al CV en PDF (inglés y español).
- **Projects** — tus proyectos (solo inglés). Ver más abajo.
- **English** — todo el contenido de la versión en inglés.
- **Español** — todo el contenido de la versión en español.

### Moverse entre bloques

Cada pestaña es una columna larga de bloques, así que a la **izquierda** hay una
barra que los lista todos —*Destacados*, *Sobre mí*, *Experiencia*, *Educación*,
*Habilidades*… en las pestañas de idioma; *Contacto y enlaces*, *Publicaciones
(LinkedIn)*… en *General*— y salta al que pulses, sin pasar por lo de en medio.
El bloque que estás mirando queda marcado mientras te desplazas.

La lista cambia sola con la pestaña, y un bloque nuevo aparece en ella sin que
haya que anotarlo en ningún sitio. En pantallas estrechas, donde no cabe la
barra, los mismos bloques están en el desplegable **Ir a**, bajo las pestañas.

Cada sección (destacados, experiencia, educación, habilidades,
**reconocimientos**, **cursos adicionales** y **voluntariado**) permite
**añadir, eliminar y reordenar** elementos con los botones `↑` `↓` y *Eliminar*.
La insignia verde ("Disponible para prácticas…") también es editable; déjala
vacía para ocultarla.

En el menú de navegación se muestran **Experiencia**, **Educación**,
**Reconocimientos**, **Contacto** y **Más/More**; *Sobre mí* y *Habilidades*
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

### Copiar el CV como Markdown (para IA)

En la barra superior, el botón **Copiar Markdown (IA)** copia al portapapeles
**todo tu CV en inglés** como un único documento Markdown ordenado: identidad y
contacto, resumen, perfil, destacados, experiencia, educación, habilidades,
proyectos y publicaciones. Está pensado para pegarlo en una IA (ChatGPT, Claude,
etc.) como contexto sobre tu vida profesional.

- Refleja el estado **actual del editor**, incluso cambios sin guardar.
- No necesitas guardar antes de copiar.

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

### Encuadre de las imágenes

Toda imagen —portada de un proyecto, galería del proyecto e imágenes de un
post— se muestra dentro de un marco 16:9. **Pulsa la miniatura** (o el enlace
*Encuadrar* que hay junto a ella) y se abre una ventana con la vista previa
exacta de ese marco:

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
| **Descargas del CV** | Cuántas veces se abrió `/cv` y `/cv-es`. Se cuenta en el servidor, así que ningún bloqueador lo esconde |
| Clics de contacto | WhatsApp, correo y LinkedIn |
| Origen de las visitas | De qué canal llegan (ver abajo) |
| Páginas más vistas | Si además del CV miran proyectos y publicaciones |
| Países y dispositivos | Desde dónde y con qué te leen |
| Hasta dónde leen | Hasta qué punto de la página bajan antes de irse |
| Tiempo en la página | Si de verdad la leen o rebotan |
| Actividad reciente | Cada visita entera, desplegable: por qué páginas pasó esa persona, en qué orden, cuánto estuvo en cada una y qué pulsó |

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

Cada uno trae **su código QR** al lado, descargable en **PNG** (pantallas,
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
  navegador. Los bots tampoco.
- Para excluirte **de forma permanente**, al final del panel está el botón
  **«No contar mis visitas desde este dispositivo»**: deja una cookie de un año
  que el servidor respeta en todo (páginas, clics y descargas del CV), aunque
  caduque tu sesión de admin. Es por navegador, así que púlsalo también desde el
  móvil y desde cualquier otro que uses; se desactiva con el mismo botón.
- Nada de esto identifica a una persona concreta: sabrás que alguien de Madrid,
  desde LinkedIn, se descargó tu CV — no quién.

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

## 3. Cómo iniciar sesión

1. Entra a `https://tu-dominio/admin`.
2. Ingresa uno de los correos autorizados y la contraseña.
3. La sesión dura 7 días.

---

## 4. Configuración (variables de entorno)

El login y el guardado usan variables de entorno. **Nunca se guardan en el código.**

| Variable | Para qué sirve | Obligatoria |
| --- | --- | --- |
| `ADMIN_PASSWORD` | Contraseña de acceso a `/admin` | Sí (en producción) |
| `SESSION_SECRET` | Firma las sesiones (cadena aleatoria) | Sí (en producción) |
| `SUPABASE_URL` | URL del proyecto de Supabase (`https://xxxx.supabase.co`) | Sí en Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio de Supabase, guarda cambios e imágenes | Sí en Vercel |
| `ADMIN_EMAILS` | Lista de correos permitidos, separados por coma | Opcional |

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

## 5. Publicar en Vercel

1. **Crea un proyecto en [supabase.com](https://supabase.com)** (uno dedicado
   a este sitio, no compartido con otro proyecto).
2. **Corre el script** `supabase/schema.sql` una vez, en el *SQL Editor* del
   panel de Supabase: crea las tablas `resume_content` y `analytics_data`
   (con Row Level Security activado y sin políticas — solo la clave de
   servicio puede leerlas o escribirlas) y el bucket público
   `resume-uploads` para fotos y PDFs.
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

## 6. Notas técnicas

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
