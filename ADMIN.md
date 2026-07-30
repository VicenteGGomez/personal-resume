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

Cada sección (destacados, experiencia, educación, habilidades) permite
**añadir, eliminar y reordenar** elementos con los botones `↑` `↓` y *Eliminar*.
La insignia verde ("Disponible para prácticas…") también es editable; déjala
vacía para ocultarla.

Pulsa **Guardar cambios** y el sitio se actualiza al instante.

### Proyectos (`/en/projects`)

En la pestaña **Projects** publicas tus proyectos como páginas propias, tipo
blog. Es una sección **solo en inglés**.

- Cada proyecto tiene: título, *slug* (la dirección `/en/projects/…`), fecha,
  **experiencia asociada** (un desplegable con tus experiencias), resumen,
  imagen de portada opcional, contenido en **Markdown** y enlaces.
- Al asociar un proyecto a una experiencia, aparece como enlace dentro de esa
  experiencia en el CV en inglés. Una experiencia puede tener 0 o más proyectos.
- El índice `/en/projects` agrupa los proyectos por experiencia. El enlace
  **Projects** del menú aparece solo cuando hay al menos un proyecto.
- El **Markdown** admite `# Título`, `**negrita**`, `*cursiva*`, listas,
  `> citas`, `código` y `[enlaces](https://…)`.

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
