# Carencia · Presentación web

Presentación web interactiva de **Carencia**, un videojuego 2D en pixel art de terror psicológico con horror corporal y exploración point and click. Elaki, un joven de 17 años, busca a su hermana Margarita mientras su familia insiste en que nunca existió.

La página se recorre con el scroll y cuenta el juego en cinco actos: tráiler, premisa, personajes, gameplay de cada nivel y una invitación a jugar. Incluye una mini demo jugable en el navegador.

Proyecto de **Integradora III · IDYGS101**, Ingeniería en Desarrollo y Gestión de Software, Universidad Tecnológica de Cancún.

**Ver la presentación en línea:** https://zurisaraidr.github.io/carenciaPresentacion/
Con todas las animaciones activas: https://zurisaraidr.github.io/carenciaPresentacion/?movimiento=1

Demo del juego: https://ideny-lr.itch.io/carencia

---

## Qué necesitas

| Para | Necesitas |
|---|---|
| Ver la presentación | Un navegador actualizado: Google Chrome, Microsoft Edge, Firefox o Safari |
| Servirla localmente (recomendado) | Python 3, **o** Node.js, **o** Visual Studio Code con la extensión Live Server |
| Regenerar los assets (opcional) | Python 3, Pillow, PyMuPDF y ffmpeg con libx264 |

No hace falta instalar dependencias ni compilar nada: es HTML, CSS y JavaScript. GSAP, las fuentes, los videos y el audio ya vienen dentro de `assets/`, así que **funciona sin internet**.

---

## Cómo ejecutarla

### 1. Descargar el proyecto

Con Git:

```bash
git clone https://github.com/ZurisaraiDR/carenciaPresentacion.git
cd carenciaPresentacion
```

O desde GitHub: botón **Code > Download ZIP**, y descomprime la carpeta.

### 2. Abrirla con un servidor local (recomendado)

Usa **una** de estas opciones desde la carpeta del proyecto:

**Con Python 3**

```bash
python -m http.server 5173
```

En macOS o Linux puede ser `python3 -m http.server 5173`.

**Con Node.js**

```bash
npx serve -l 5173
```

**Con Visual Studio Code**

Instala la extensión *Live Server*, abre la carpeta, haz clic derecho en `index.html` y elige **Open with Live Server**.

Después abre en el navegador:

```
http://localhost:5173
```

Para detener el servidor, presiona `Ctrl + C` en la terminal.

### 3. Opción rápida sin servidor

También puedes abrir `index.html` con doble clic. Si algo no carga bien (videos, fuentes o animaciones), usa el servidor local del paso 2.

---

## Para presentarla (stand o exposición)

1. Abre la página en **Chrome** y ponla en pantalla completa con `F11`.
2. Si la computadora tiene desactivadas las animaciones del sistema, la página muestra una versión sin movimiento. Para verla animada de todos modos, agrega `?movimiento=1` al final de la dirección:

   ```
   http://localhost:5173/?movimiento=1
   ```

   En Windows esa opción está en *Configuración > Accesibilidad > Efectos visuales > Efectos de animación*.
3. Activa el sonido con las barras de la esquina superior derecha. La música del juego sigue sonando mientras corren los gameplays.
4. Recorre la página con la rueda del mouse a ritmo normal: las animaciones avanzan con el scroll.

### Controles de la demo "Abre el espejo"

| Tecla | Acción |
|---|---|
| `W` `A` `S` `D` o flechas | Caminar |
| `E` | Inspeccionar |
| `Esc` | Cerrar el diálogo |

Primero haz clic en la escena. En pantallas táctiles se usan las teclas que aparecen junto al baño.

---

## Secuencia de la presentación

1. **Tráiler de impacto:** el loop de cinemáticas de fondo y el tráiler con sonido.
2. **Concepto y premisa:** el primer desayuno mientras Elaki abre los ojos, qué es el juego y por qué existe.
3. **Personajes:** el expediente familiar y "Lo que acecha", con una linterna que sigue al puntero.
4. **Gameplay:** un panel por nivel con su nombre, el miedo que representa y su video, y la demo jugable.
5. **Cierre:** el tráiler junto a los datos del demo, y la invitación a jugar.

---

## Estructura del proyecto

```
carenciaPresentacion/
├── index.html              Contenido y secuencia de la presentación
├── css/
│   └── styles.css          Paleta oficial del juego y estilos por sección
├── js/
│   ├── sonido.js           Música y efectos de sonido
│   ├── expediente.js       Pestañas de personajes y linterna
│   ├── demo-jugable.js     Demo "Abre el espejo"
│   └── main.js             Tráiler, videos y animaciones de scroll
├── assets/
│   ├── vendor/             GSAP 3.15.1 (ScrollTrigger, SplitText, ScrambleText)
│   ├── fonts/              Barrio (títulos) y Special Elite (texto)
│   ├── img/                Escenas, carteles y elementos del menú
│   ├── sprites/            Sprites de los personajes
│   ├── frames/             Secuencia del despertar de Elaki
│   ├── video/              Tráiler, cinemáticas y gameplay de cada nivel
│   └── audio/              Música del menú y efectos
└── tools/
    └── preparar_assets.py  Regenera los assets desde el proyecto de Unity
```

---

## Cambiar o agregar videos de gameplay

Los videos de cada nivel están en `assets/video/` con estos nombres:

```
gameplay-prologo.mp4
gameplay-nivel-1.mp4
gameplay-nivel-2.mp4
gameplay-nivel-3.mp4
```

Para reemplazar uno, conviértelo a MP4 (H.264) de 720p y guárdalo con el mismo nombre:

```bash
ffmpeg -i video-original.mp4 -vf scale=1280:-2 -c:v libx264 -crf 27 -preset medium -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart assets/video/gameplay-nivel-1.mp4
```

El video del nivel 3 está cortado en 1:00.5 con un fundido (`-t 60.5`), porque después empieza el desenlace del juego y la presentación no lo revela.

Si un `<video>` de nivel no tiene `src`, la página muestra su imagen en rojo con el aviso "Gameplay muy pronto".

---

## Regenerar los assets (opcional)

Solo hace falta si cambian los sprites, videos o audios en el proyecto de Unity. Instala las herramientas:

```bash
pip install pillow pymupdf
```

Instala también ffmpeg desde https://ffmpeg.org/download.html y ejecuta:

```bash
python tools/preparar_assets.py <ruta al repo de Unity de Carencia> <ruta al PDF de la integradora> <ruta a ffmpeg>
```

El script copia y recorta los sprites, extrae las escenas del PDF y comprime las cinemáticas, el tráiler y el loop de la portada. El cartel de Margarita (`assets/img/cartel-margarita.png`) y los videos de gameplay no vienen del repo de Unity: se agregan a mano.

---

## Tecnologías

- HTML, CSS y JavaScript, sin frameworks ni compilación.
- [GSAP 3.15.1](https://gsap.com/docs/v3/) con ScrollTrigger, SplitText y ScrambleTextPlugin para las animaciones.
- Tipografías [Barrio](https://fonts.google.com/specimen/Barrio) y [Special Elite](https://fonts.google.com/specimen/Special+Elite) de Google Fonts.
- Arte, sprites, música, efectos y cinemáticas del videojuego Carencia, hechos por el equipo.

---

## Equipo

- Arellano Díaz Yareny Alexandra
- Balam Salaya Armando
- Delgado Rodríguez Zurisarai
- López Rodríguez Ideny
- Ojeda Cauich Melchor Emmanuel
- Palma Gongora Wendy Kristal
