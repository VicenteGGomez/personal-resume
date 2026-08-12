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

Cada sección (destacados, experiencia, educación, habilidades,
**reconocimientos**, **cursos adicionales** y **voluntariado**) permite
**añadir, eliminar y reordenar** elementos con los botones `↑` `↓` y *Eliminar*.
La insignia verde ("Disponible para prácticas…") también es editable; déjala
vacía para ocultarla.

En el menú de navegación solo se muestran **Experiencia**, **Educación** y
**Contacto** (más el enlace **More**); *Sobre mí* y *Habilidades* siguen en la
página, pero ya no aparecen como enlaces del menú.

Pulsa **Guardar cambios** y el sitio se actualiza al instante.

### Habilidades por experiencia y asociaciones

- Cada **experiencia** tiene un campo opcional de **habilidades** (etiquetas
  separadas por comas o «·») que se muestran de forma discreta en su tarjeta.
- Las secciones **Reconocimientos**, **Cursos adicionales** y **Voluntariado**
  se muestran después de Habilidades (en ese orden) y comparten el mismo formato
  que Educación.
- Cada **curso** admite un **enlace al certificado** opcional; si lo agregas,
  aparece un enlace “Ver certificado” en su tarjeta.
- **Experiencia, educación, reconocimientos, cursos y voluntariado** pueden
  tener **proyectos** y **publicaciones (posts de LinkedIn)** asociados, que
  aparecen como etiquetas «Related» en su tarjeta. Un proyecto también puede
  tener posts asociados.

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
  experiencia**. Úsalos cuando quieras viñetas o varios párrafos.
- **Markdown en línea** — solo `**negrita**`, `*cursiva*`, `código` y
  `[enlaces](https://…)`. Se aplica al **subtítulo**, la **descripción** del
  encabezado y los textos de **educación**, **habilidades**,
  **reconocimientos**, **cursos adicionales**, **voluntariado** y **contacto**.
  En estos campos, de una sola línea, una lista con `-` no se convierte en
  viñetas.

El texto sin símbolos de Markdown se sigue viendo igual que siempre.

### Proyectos y publicaciones — página «More» (`/en/more`)

Los proyectos y las publicaciones de LinkedIn se muestran juntos en una única
página **solo en inglés**, `/en/more` ("More about me"): primero la sección
**Projects** (`#projects`) y luego **Publications** (`#publications`). En el menú
aparece un solo enlace, **More** (en el sitio en español, **More (EN)**), que
se muestra cuando existe al menos un proyecto o una publicación.

**Proyectos** (pestaña **Projects**, solo inglés): cada proyecto se publica como
página propia tipo blog.

- Campos: título, *slug* (la dirección `/en/projects/…`), fecha, **asociación**
  (un desplegable con tus experiencias, educación, cursos y voluntariado),
  resumen, imagen de portada opcional, contenido en **Markdown**, galería de
  imágenes y enlaces.
- Al asociar un proyecto, aparece como etiqueta dentro de ese elemento del CV en
  inglés. En `/en/more`, los proyectos se agrupan bajo el elemento asociado.
- El **Markdown** admite `# Título`, `**negrita**`, `*cursiva*`, listas,
  `> citas`, `código` y `[enlaces](https://…)`.

**Publicaciones** (pestaña **General** → *Publicaciones*): cada post enlaza al
original en LinkedIn.

- Campos: título, fecha, enlace al post, resumen, **imagen** (pega un enlace o
  súbela) y **asociación** opcional a una experiencia, educación, curso,
  voluntariado o **proyecto**.
- Si asocias un post, aparece como etiqueta «Related» en ese elemento del CV.
  Al abrirlo desde el CV, no salta directo a LinkedIn: lleva a `/en/more` y
  **resalta** ese post. Desde la propia página `/en/more`, el post sí abre
  LinkedIn.

---

## 2. Cómo iniciar sesión

1. Entra a `https://tu-dominio/admin`.
2. Ingresa uno de los correos autorizados y la contraseña.
3. La sesión dura 7 días.

---

## 3. Configuración (variables de entorno)

El login y el guardado usan variables de entorno. **Nunca se guardan en el código.**

| Variable | Para qué sirve | Obligatoria |
| --- | --- | --- |
| `ADMIN_PASSWORD` | Contraseña de acceso a `/admin` | Sí (en producción) |
| `SESSION_SECRET` | Firma las sesiones (cadena aleatoria) | Sí (en producción) |
| `BLOB_READ_WRITE_TOKEN` | Token de Vercel Blob para guardar cambios e imágenes | Sí en Vercel |
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

En local, si no hay `BLOB_READ_WRITE_TOKEN`, los cambios se guardan en
`data/resume.json` y las imágenes en `public/uploads/` (ambos ignorados por git).

---

## 4. Publicar en Vercel

1. **Crea un Blob store**: en tu proyecto de Vercel → pestaña **Storage** →
   *Create Database* → **Blob**. Conéctalo al proyecto. Vercel añadirá
   automáticamente `BLOB_READ_WRITE_TOKEN`.
2. **Añade las variables** en Vercel → *Settings* → *Environment Variables*:
   - `ADMIN_PASSWORD` = la contraseña que quieras.
   - `SESSION_SECRET` = el resultado de `openssl rand -base64 32`.
3. **Vuelve a desplegar** (*Redeploy*) para que tome las variables.

Con `BLOB_READ_WRITE_TOKEN` presente, todo el contenido y las imágenes se
guardan en Vercel Blob y quedan en vivo para todos los visitantes al instante.

> Si algún día quieres cambiar los correos con acceso, define `ADMIN_EMAILS`
> (por ejemplo `correo1@x.cl,correo2@y.cl`) en las variables de entorno.

---

## 5. Notas técnicas

- **Auth**: correo permitido + contraseña compartida, con sesión firmada
  (JWT `jose`) en una cookie `httpOnly`. La comparación de contraseña es de
  tiempo constante. La página `/admin` no se indexa en buscadores.
- **Contenido**: el contenido por defecto vive en `lib/resume-content.ts`
  (semilla). Lo editado se guarda aparte (Blob o archivo) y se fusiona sobre la
  semilla, así nunca se rompe si se agrega un campo nuevo.
- **Almacenamiento**: `lib/resume-store.ts` elige automáticamente Vercel Blob o
  archivo local según exista `BLOB_READ_WRITE_TOKEN`.
- **SEO / conversión**: metadatos por idioma, datos estructurados `Person`
  (JSON-LD), insignia de disponibilidad, foto, y llamados a la acción claros.
- **Responsive**: optimizado para móvil y escritorio, con menú móvil y respeto
  por `prefers-reduced-motion`.
