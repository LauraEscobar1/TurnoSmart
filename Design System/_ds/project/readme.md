# Sistema de diseño Industry

Industry es un wireframe: azul acero sobre un fondo técnico claro, encabezados Barlow Condensed sobre Barlow, una cuadrícula modular, y tarjetas, figuras y botones enmarcados como objetos de plano — esquinas cuadradas, borde de línea fina, con marcas de registro "+" en las esquinas. Las tarjetas y figuras permanecen como dibujos transparentes; el botón principal es el único objeto sólido del tablero, un relleno de acento que conserva las esquinas cuadradas y las marcas. La fotografía se convierte en duotono en el acento de acero y los iconos tienen trazo fino.

## Cómo usar esto

- Vincula la única hoja de estilos desde cada página — `<link rel="stylesheet" href="styles.css">` (ajusta la ruta relativa) — y toma cada color, fuente, espaciado, radio y sombra de sus variables (`var(--color-*)`, `var(--font-*)`, `var(--space-*)`, `var(--radius-*)`, `var(--shadow-*)`). Nunca codifiques a mano un hex, un nombre de fuente o un valor px que los tokens ya aporten.
- Construye con las clases de abajo en lugar de inventar paralelas; las páginas de componentes son HTML plano, así que ve el código fuente y copia el marcado.
- `templates/` contiene puntos de partida que un proyecto consumidor puede copiar completos.
- Todo el sistema se derivó de `theme.json`. Para cambiar el aspecto, edita los tokens al principio de `styles.css` — cada página, la miniatura y esta guía leen de ellos — y mantén `theme.json` y la guía escrita al día para que no se separen de lo que realmente hace el CSS.

## Dirección

Diseños de cuadrícula modular — contenido en celdas de igual ancho, fuerte ritmo horizontal y vertical, estructura visible. Las tarjetas, los botones y las secciones principales son objetos de wireframe: esquinas cuadradas, borde fino, con marcas cruzadas en las esquinas `+` (la clase `.blueprint` + cuatro elementos hijos `<i class="corner tl/tr/bl/br">`) — nunca bloques redondeados rellenos y suaves. Las imágenes y figuras reciben el mismo tratamiento: cuadradas, enmarcadas con línea fina y marcadas, nunca redondeadas ni recortadas. Envuelve las imágenes hero e inline en la clase `.duotone` — están desaturadas y lavadas en el acento, como una serigrafía que recolorea con el tema.

## Color

Un fondo claro (`--color-bg` #f2f2f3) con `--color-text` #1d1f20 y un único acento #5980a6 (este es un esquema mono: no se eligió un segundo acento — las variables `--color-accent-2-*` llevan un sustituto derivado por máquina mantenido solo para que ambos conjuntos resuelvan; trátalos como un solo rol). Cada rol lleva una escala tonal 100–900 (`--color-neutral-100` … `--color-accent-2-900`) generada en OKLCH en una escala de luminosidad perceptual compartida, de modo que el mismo paso de cualquier escala tenga el mismo peso visual. Usa los pasos claros (100–300) para rellenos tintados, hover y bordes sutiles, 500 como base del rol, y los pasos oscuros (700–900) para texto sobre rellenos tintados y para estados presionados; prefiera los pasos de escala frente a un `color-mix()` ad hoc. Para la elevación usa `--shadow-sm/md/lg` (ya ajustados al fondo) en lugar de box-shadows ad hoc.

## Tipo

Barlow Condensed para encabezados sobre Barlow para texto del cuerpo, cargados como `--font-heading` / `--font-body`. La densidad 0.85× y el radio 4px ya están integrados en las escalas `--space-*` / `--radius-*` — usa las variables, no números sin procesar.

## Iconos

Usa iconos Lucide (https://lucide.dev), con stroke-width 1.5 para un aspecto más ligero y técnico en toda la interfaz.

## Estados de interacción

Los estados interactivos están tematizados, nunca son los valores predeterminados del navegador: da a cada elemento interactivo un tinte en `:hover` y un estado presionado desde la escala del acento (un paso por encima de la base — `--color-accent-600` sobre un fondo claro, `--color-accent-400` sobre uno oscuro, o un tinte `color-mix()` para variantes outlined/ghost), y estiliza el foco del teclado con `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }` — nunca dejes el anillo de foco azul predeterminado.

## Componentes

| Class | Qué es | Se muestra en |
| --- | --- | --- |
| `.btn` con `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-icon`, `.btn-block` | Acciones — la primara es un relleno sólido de acento | components/buttons.html |
| `.tag` con `.tag-accent`, `.tag-accent-2`, `.tag-neutral`, `.tag-outline` | Etiquetas pequeñas tintadas desde las escalas (paleta mono: accent-2 lee igual que accent) | components/buttons.html |
| `.field` + `label`, `.input`, `.radio` + `.dot`, `.seg` + `.seg-opt` | Campos de formulario y opciones en elementos nativos — sin script | components/forms.html |
| `.card` con `.card-kicker`, `.card-title`, `.card-body`, `.card-meta`; `.elev-sm/md/lg` | Tarjetas transparentes con borde fino y marcas de registro en las esquinas | components/cards.html |
| `.nav` + `.nav-brand` | La barra de encabezado | components/navigation.html |
| `.table` | Tablas de datos con cabecera temática y reglas de filas | components/table.html |
| `.dialog-backdrop` + `.dialog` (+ `.dialog-title/-body/-actions`) | Un modal en la elevación superior | components/dialog.html |
| `.hr` | Una regla horizontal — presente, pero este sistema prefiere el espacio en blanco; evítala | — |
| `.blueprint` + cuatro hijos `<i class="corner tl/tr/bl/br">` | El marco de wireframe que llevan cada tarjeta, figura y botón principal | components/cards.html |
| `.duotone` | El contenedor de imagen — cada fotografía de contenido pasa por él | foundations/image.html |

Los estados están integrados: hover y estados presionados provienen de la escala del acento, el foco del teclado es el anillo `:focus-visible` de 2px en acento, `::selection` es un tinte de acento, y los controles deshabilitados bajan a 45% de opacidad. No los rediseñes por página. El par acento-fondo está ajustado a al menos 3:1 — suficiente para iconos, texto grande y chrome de interfaz, no para texto del cuerpo — así que para texto de tamaño de párrafo en acento usa un paso profundo de la escala (`--color-accent-700` sobre este fondo) en lugar del acento en sí.

## Haz

- Enmarca tarjetas, figuras y botones principales como objetos de plano: la clase `.blueprint` más cuatro marcas `<i class="corner …">`.
- Mantén la cuadrícula visible — celdas iguales, fuerte ritmo horizontal y vertical.
- Condensa los encabezados (Barlow Condensed) y mantén el texto del cuerpo en Barlow.
- Duotona las fotografías con el contenedor `.duotone` para que adopten el acento.

## No

- No redondees tarjetas, figuras ni botones, y no des a las tarjetas ni a las figuras un relleno superficial — son dibujos de línea (el botón primario sólido de acento es la única excepción deliberada).
- No elimines las marcas de registro de un elemento enmarcado.
- No uses golpes gruesos en los iconos; el conjunto es Lucide a 1.5.
- No añadas color decorativo más allá del acento de acero. El propio paso profundo del acento (`--color-accent-900`) puede llevar un campo completo donde los separadores de sección de la cubierta lo usan — acero como fondo, tipo invertido a papel. (Los números de la portada se sitúan sobre una placa de hoja de especificaciones dibujada sobre el fondo de papel en su lugar — su propia gramática, no un campo.)

## Archivos

- `styles.css` — la única hoja de estilos: la hoja de tokens (`:root` variables, escalas, tipo base) más la capa de componentes. Enlázala desde cada página.
- `readme.md` — esta guía.
- `theme.json` — los parámetros a partir de los cuales se derivaron estos archivos (un registro legible por máquina del tema).
- `thumbnail.html` — la portada del proyecto (marca + muestras de color).
- `foundations/type.html` — la escala tipográfica y la combinación de encabezado/cuerpo a tamaños reales.
- `foundations/color.html` — roles de color y las escalas tonales 100-900, con notas de uso.
- `foundations/layout.html` — la escala de espaciado, la cuadrícula y cómo se dibujan los bordes.
- `foundations/icons.html` — el conjunto de iconos en tamaños de interfaz, en línea y en botones.
- `foundations/image.html` — cómo se tratan las fotografías y las figuras.
- `components/buttons.html` — botones, botones con icono y etiquetas en cada variante y estado.
- `components/forms.html` — campos de texto, radios y el control segmentado en elementos nativos.
- `components/cards.html` — tarjetas de contenido y los pasos de elevación.
- `components/navigation.html` — el patrón de la barra de encabezado.
- `components/table.html` — una tabla de datos con la cabecera temática y las reglas de filas.
- `components/dialog.html` — un modal sobre su fondo en la elevación superior.
- `theme.html` — los parámetros del tema representados como hoja de referencia.
- `templates/landing/` — una página inicial que consume el sistema de la manera prevista (`index.html`, su cargador `ds-base.js` y el `image-slot.js` empotrado que monta la fotografía).
- `assets/photo.jpg` — la fotografía de referencia que trata la página de imágenes.
