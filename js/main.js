/* =============================================================
   CARENCIA · orquestación del sitio y animaciones de scroll
   GSAP 3.15 + ScrollTrigger, SplitText y ScrambleTextPlugin.
   Docs: https://gsap.com/docs/v3/
   ============================================================= */

"use strict";

const TOTAL_FRAMES_DESPERTAR = 51;
const RUTA_FRAMES_DESPERTAR = "assets/frames/despertar/";

document.addEventListener("DOMContentLoaded", iniciar);

function iniciar() {
  gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);
  const sonido = crearSonido();
  construirMuroDeCarteles();
  conectarTrailer(sonido);
  prepararVideosDeGameplay();
  reproducirVideosAlVerlos();
  ocultarBarraAlBajar();
  iniciarExpediente();
  iniciarLinterna(sonido);
  iniciarDemoJugable(sonido);
  programarAnimacionesDeScroll(sonido);
}

/* ---------- Muro de carteles ---------- */

/* Posición (% del muro), ancho (vw) y giro de cada cartel; el centro queda libre para la cifra. */
const CARTELES_DEL_MURO = [
  [3, 5, 10, -6], [17, -2, 9, 4], [31, 6, 8, -3], [62, 3, 9, 5], [76, 8, 10, -4], [89, -1, 9, 6],
  [1, 38, 11, 5], [14, 30, 8, -7], [79, 33, 8, 4], [89, 40, 10, -5],
  [4, 70, 10, -4], [18, 64, 9, 6], [31, 76, 9, -2], [60, 74, 9, 4], [73, 66, 10, -6], [87, 73, 10, 3],
];
const CARTEL_DE_MARGARITA = [46, -4, 9, -2];

function construirMuroDeCarteles() {
  const muro = document.querySelector(".muro__carteles");
  CARTELES_DEL_MURO.forEach((datos) => muro.append(crearCartel("assets/img/cartel-desaparecida.png", datos)));
  const margarita = crearCartel("assets/img/cartel-margarita.png", CARTEL_DE_MARGARITA);
  margarita.classList.add("muro__cartel--margarita");
  muro.append(margarita);
}

function crearCartel(src, [x, y, ancho, giro]) {
  const cartel = new Image();
  cartel.src = src;
  cartel.alt = "";
  cartel.loading = "lazy";
  cartel.className = "muro__cartel";
  cartel.style.cssText = `left: ${x}%; top: ${y}%; --ancho: ${ancho}; --giro: ${giro}deg;`;
  return cartel;
}

/* ---------- Tráiler ---------- */

function conectarTrailer(sonido) {
  const cine = document.getElementById("cine");
  const video = document.getElementById("video-trailer");

  document.querySelector("[data-abrir-trailer]").addEventListener("click", () => {
    cine.showModal();
    sonido.silenciarMusica(true);
    /* Si se cierra antes de que el video termine de cargar, play() resuelve tarde: se vuelve a pausar. */
    video.play().then(() => { if (!cine.open) video.pause(); }).catch(() => {});
  });
  document.querySelector("[data-cerrar-trailer]").addEventListener("click", () => cine.close());
  cine.addEventListener("click", (evento) => { if (evento.target === cine) cine.close(); });
  cine.addEventListener("close", () => {
    video.pause();
    sonido.silenciarMusica(false);
  });
  bajarMusicaMientrasSuena(document.getElementById("video-trailer-seccion"), sonido);
}

/* El tráiler trae su propio audio: mientras suena, la música de fondo se silencia. */
function bajarMusicaMientrasSuena(video, sonido) {
  video.addEventListener("play", () => sonido.silenciarMusica(true));
  ["pause", "ended"].forEach((evento) => video.addEventListener(evento, () => sonido.silenciarMusica(false)));
}

/* ---------- Videos ---------- */

/* Un nivel sin archivo de gameplay muestra su captura en duotono con el aviso "muy pronto".
   Los que sí tienen video empiezan silenciados (la música de la página sigue sonando)
   y se pausan al salir de pantalla. */
function prepararVideosDeGameplay() {
  const fueraDePantalla = new IntersectionObserver((entradas) => {
    entradas.forEach(({ target: video, isIntersecting }) => { if (!isIntersecting) video.pause(); });
  }, { threshold: 0.25 });

  document.querySelectorAll(".gameplay-video video").forEach((video) => {
    if (!video.getAttribute("src")) {
      video.removeAttribute("controls");
      video.closest(".gameplay-video").classList.add("sin-video");
      return;
    }
    fueraDePantalla.observe(video);
  });
}

/* Los videos en bucle solo cargan y se reproducen cuando están en pantalla. */
function reproducirVideosAlVerlos() {
  if (prefiereMovimientoReducido()) return;
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach(({ target: video, isIntersecting }) => {
      if (isIntersecting) {
        video.preload = "auto";
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, { rootMargin: "200px 0px" });
  document.querySelectorAll("video[data-autoplay]").forEach((video) => observador.observe(video));
}

/* ---------- Utilidades de la página ---------- */

function ocultarBarraAlBajar() {
  const barra = document.querySelector(".barra");
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (scroll) => {
      const bajaLejosDelInicio = scroll.direction === 1 && scroll.scroll() > 300;
      barra.classList.toggle("barra--oculta", bajaLejosDelInicio);
    },
  });
}

function prefiereMovimientoReducido() {
  return !esMovimientoForzado() && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* En el stand, ?movimiento=1 muestra las animaciones aunque el sistema operativo las tenga desactivadas. */
function esMovimientoForzado() {
  return document.documentElement.classList.contains("movimiento-forzado");
}

/* ---------- Animaciones ligadas al scroll ---------- */

function programarAnimacionesDeScroll(sonido) {
  const medios = gsap.matchMedia();
  const condiciones = {
    conMovimiento: esMovimientoForzado() ? "all" : "(prefers-reduced-motion: no-preference)",
    escritorio: "(min-width: 768px)",
  };

  medios.add(condiciones, (contexto) => {
    const { conMovimiento, escritorio } = contexto.conditions;
    const despertar = crearSecuenciaDespertar();
    if (!conMovimiento) {
      despertar.mostrarUltimoFrame();
      return undefined;
    }
    /* ScrollTrigger exige crear los pins en el mismo orden en que aparecen en la página:
       cada uno calcula su inicio sumando el espacio que agregan los pins anteriores. */
    const detenerGlitch = hacerTemblarTitulo();
    animarEntradaDePortada();
    alejarPortadaAlBajar();
    animarImagina(despertar, sonido);
    if (escritorio) animarRecorrido();
    animarMuro();
    animarExpediente();
    if (escritorio) animarGameplayHorizontal();
    animarNotas();
    animarCierre();
    revelarTitulos();
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    return () => {
      detenerGlitch();
      despertar.liberar();
    };
  });
}

/* ---------- Acto 1 · Portada ---------- */

/* Réplica de TituloGlitch.cs: temblores pequeños y, a veces (15 %), una sacudida fuerte. */
function hacerTemblarTitulo() {
  const roja = document.querySelector(".titulo-glitch__capa--roja");
  const azul = document.querySelector(".titulo-glitch__capa--azul");
  const temblorMaximo = 6;
  let llamada;

  function temblar() {
    const esSacudida = Math.random() < 0.15;
    const fuerza = esSacudida ? temblorMaximo : temblorMaximo * 0.3;
    gsap.set(roja, { x: aleatorio(fuerza), y: aleatorio(fuerza * 0.2) });
    gsap.set(azul, { x: aleatorio(fuerza * 0.5), y: aleatorio(fuerza * 0.1) });
    llamada = gsap.delayedCall(esSacudida ? 0.06 : gsap.utils.random(0.12, 0.35), temblar);
  }

  temblar();
  return () => llamada.kill();
}

function aleatorio(fuerza) {
  return gsap.utils.random(-fuerza, fuerza);
}

function animarEntradaDePortada() {
  gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.2 })
    .from(".portada__video", { opacity: 0, duration: 1.6, ease: "power1.out" })
    .from(".titulo-glitch__capa--roja", { x: -60, opacity: 0, duration: 1 }, 0.4)
    .from(".titulo-glitch__capa--azul", { x: 60, opacity: 0, duration: 1 }, 0.4)
    .from(".titulo-glitch__texto", { opacity: 0, duration: 0.8 }, 0.6)
    .from(".portada__lema", { opacity: 0, y: 16, duration: 0.8 }, 1)
    .from(".menu-juego li", { opacity: 0, x: -24, stagger: 0.12, duration: 0.7 }, 1.2);
}

/* Al bajar, el título se aleja y el video se acerca: la cámara entra a la casa. */
function alejarPortadaAlBajar() {
  const enLaPortada = { trigger: ".portada", start: "top top", end: "bottom top", scrub: true };
  gsap.to(".portada__contenido", { yPercent: -25, opacity: 0, ease: "none", scrollTrigger: enLaPortada });
  gsap.to(".portada__video video", { scale: 1.15, ease: "none", scrollTrigger: enLaPortada });
}

/* ---------- Títulos de sección ---------- */

/* Cada título sube línea por línea desde una máscara y su párrafo aparece después. */
function revelarTitulos() {
  gsap.utils.toArray("[data-revelar]").forEach((titulo) => {
    const parrafo = titulo.nextElementSibling;
    SplitText.create(titulo, {
      type: "lines",
      mask: "lines",
      autoSplit: true,
      onSplit: (division) => gsap.timeline({ scrollTrigger: { trigger: titulo, start: "top 82%" } })
        .from(division.lines, { yPercent: 110, duration: 0.9, stagger: 0.1, ease: "power4.out" })
        .from(parrafo, { opacity: 0, y: 20, duration: 0.8 }, "-=0.5"),
    });
  });
}

/* ---------- Acto 2 · Imagina: Elaki abre los ojos mientras se cuenta el desayuno ---------- */

function animarImagina(despertar, sonido) {
  const lineas = gsap.utils.toArray(".imagina .linea");
  const nombre = document.querySelector(".nombre-corrupto");
  const destello = document.querySelector(".imagina__destello");
  const fotograma = { indice: 0 };

  const relato = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: { trigger: ".imagina", start: "top top", end: "+=450%", pin: true, scrub: 0.6 },
  });

  relato.to(fotograma, {
    indice: TOTAL_FRAMES_DESPERTAR - 1,
    duration: 4,
    onUpdate: () => despertar.dibujar(Math.round(fotograma.indice)),
  }, 0);

  lineas.forEach((linea, posicion) => {
    const entrada = posicion * 1.2;
    relato.fromTo(linea, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4 }, entrada);
    const esUltima = posicion === lineas.length - 1;
    if (!esUltima) relato.to(linea, { opacity: 0, y: -30, duration: 0.4 }, entrada + 0.9);
  });

  relato.call(() => sonido.reproducir("glitch", 0.5), null, 2.6);
  relato.to(nombre, { scrambleText: { text: "M░rg▓r█ta", chars: "░▒▓█¿?", speed: 0.4 }, duration: 0.5 }, 2.6);
  relato.to(destello, { opacity: 0.55, duration: 0.15 }, 3.7);
  relato.to(destello, { opacity: 0, duration: 0.5 }, 3.85);
}

/* Secuencia de imágenes dibujada en <canvas>: el scroll elige qué frame se ve. */
function crearSecuenciaDespertar() {
  const lienzo = document.getElementById("lienzo-despertar");
  const pincel = lienzo.getContext("2d");
  const frames = cargarFramesDespertar();
  let ultimoIndice = 0;

  function dibujar(indice) {
    ultimoIndice = indice;
    const imagen = frames[indice];
    if (!imagen.complete || imagen.naturalWidth === 0) return;
    dibujarCubriendo(pincel, imagen, lienzo);
  }

  /* El tamaño del lienzo solo se mide al cargar y al redimensionar, no en cada frame de scroll. */
  function redibujar() {
    ajustarLienzoAPantalla(lienzo);
    dibujar(ultimoIndice);
  }

  ajustarLienzoAPantalla(lienzo);
  frames[0].addEventListener("load", redibujar, { once: true });
  window.addEventListener("resize", redibujar);

  return {
    dibujar,
    mostrarUltimoFrame: () => {
      const ultimo = frames[frames.length - 1];
      ultimo.addEventListener("load", () => dibujar(frames.length - 1), { once: true });
      dibujar(frames.length - 1);
    },
    liberar: () => window.removeEventListener("resize", redibujar),
  };
}

function cargarFramesDespertar() {
  return Array.from({ length: TOTAL_FRAMES_DESPERTAR }, (_, indice) => {
    const imagen = new Image();
    imagen.src = `${RUTA_FRAMES_DESPERTAR}${String(indice).padStart(3, "0")}.jpg`;
    return imagen;
  });
}

function ajustarLienzoAPantalla(lienzo) {
  const escala = Math.min(window.devicePixelRatio || 1, 2);
  const ancho = Math.round(lienzo.clientWidth * escala);
  const alto = Math.round(lienzo.clientHeight * escala);
  if (lienzo.width !== ancho || lienzo.height !== alto) {
    lienzo.width = ancho;
    lienzo.height = alto;
  }
}

/* Equivalente a object-fit: cover dentro del canvas. */
function dibujarCubriendo(pincel, imagen, lienzo) {
  const escala = Math.max(lienzo.width / imagen.naturalWidth, lienzo.height / imagen.naturalHeight);
  const ancho = imagen.naturalWidth * escala;
  const alto = imagen.naturalHeight * escala;
  pincel.drawImage(imagen, (lienzo.width - ancho) / 2, (lienzo.height - alto) / 2, ancho, alto);
}

/* ---------- Acto 2 · Concepto: Elaki camina por las tres acciones ---------- */

function animarRecorrido() {
  const elaki = document.getElementById("elaki-caminante");
  const piso = document.querySelector(".recorrido__piso");
  const paradas = gsap.utils.toArray(".parada");
  let detener;

  const caminata = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: "#recorrido",
      start: "center center",
      end: "+=160%",
      pin: true,
      scrub: 0.8,
      invalidateOnRefresh: true,
      onUpdate: (scroll) => {
        elaki.classList.add("esta-caminando");
        elaki.classList.toggle("mira-izquierda", scroll.direction === -1);
        detener?.kill();
        detener = gsap.delayedCall(0.15, () => elaki.classList.remove("esta-caminando"));
      },
    },
  });

  caminata.to(elaki, { x: () => piso.clientWidth - elaki.clientWidth, duration: 1 }, 0);
  paradas.forEach((parada, posicion) => {
    caminata.fromTo(parada, { opacity: 0.15, y: 20 }, { opacity: 1, y: 0, duration: 0.1 }, 0.05 + posicion * 0.33);
  });
}

/* ---------- Acto 2 · Cifra ---------- */

/* Mientras la cifra sube, el muro se llena de carteles: cada uno cae como si lo pegaran. */
/* No depende del scroll: al llegar a la sección, la animación corre sola de principio a fin, una vez. */
function animarMuro() {
  const numero = document.querySelector("[data-contar]");
  const contador = { valor: 0 };
  const formato = new Intl.NumberFormat("es-MX");
  const carteles = gsap.utils.toArray(".muro__cartel");
  const duracion = 5;
  numero.textContent = "0"; // el HTML trae la cifra completa para quien ve la página sin animaciones

  gsap.timeline({ scrollTrigger: { trigger: ".muro", start: "top 55%", once: true } })
    .to(contador, {
      valor: Number(numero.dataset.contar),
      duration: duracion,
      ease: "power2.out",
      onUpdate: () => { numero.textContent = formato.format(Math.round(contador.valor)); },
    }, 0)
    .from(".muro__titulo", { opacity: 0, y: 20, duration: 0.8 }, 0.3)
    .from(carteles, {
      opacity: 0,
      scale: 1.6,
      rotation: (indice) => (indice % 2 ? 18 : -18),
      duration: 0.5,
      stagger: (duracion - 0.8) / carteles.length,
      ease: "power3.in",
    }, 0.3)
    .from(".muro__remate", { opacity: 0, y: 20, duration: 0.9 }, duracion);
}

/* ---------- Acto 3 · Expediente y entidades ---------- */

function animarExpediente() {
  gsap.from(".pestana", {
    opacity: 0,
    x: -30,
    stagger: 0.08,
    duration: 0.7,
    ease: "power3.out",
    scrollTrigger: { trigger: "#expediente", start: "top 75%" },
  });
  gsap.from("#expediente .ficha:not([hidden])", {
    opacity: 0,
    y: 40,
    duration: 1,
    ease: "power3.out",
    scrollTrigger: { trigger: "#expediente", start: "top 75%" },
  });
  gsap.from(".entidad", {
    opacity: 0,
    y: 60,
    stagger: 0.2,
    duration: 1.2,
    ease: "power3.out",
    clearProps: "transform", // un transform crea un stacking context que hundiría los nombres bajo la oscuridad
    scrollTrigger: { trigger: "#oscuridad", start: "top 75%" },
  });
}

/* ---------- Acto 4 · Gameplay: el scroll vertical recorre la casa en horizontal ---------- */

function animarGameplayHorizontal() {
  const seccion = document.querySelector(".gameplay");
  const pista = document.getElementById("gameplay-pista");
  const niveles = gsap.utils.toArray(".nivel");
  const distancia = () => Math.max(0, pista.scrollWidth - seccion.clientWidth);

  const recorrido = gsap.to(pista, {
    x: () => -distancia(),
    ease: "none",
    scrollTrigger: {
      trigger: seccion,
      start: "top top",
      end: () => `+=${distancia()}`,
      pin: true,
      scrub: 1,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      snap: { snapTo: 1 / (niveles.length - 1), duration: { min: 0.2, max: 0.6 }, delay: 0.1, ease: "power2.inOut" },
    },
  });

  niveles.slice(1).forEach((nivel) => {
    const enEsteNivel = { trigger: nivel, containerAnimation: recorrido, scrub: true };
    const letras = SplitText.create(nivel.querySelector(".nivel__titulo"), { type: "chars", mask: "chars" }).chars;
    gsap.from(letras, {
      yPercent: 110,
      stagger: 0.04,
      ease: "none",
      scrollTrigger: { ...enEsteNivel, start: "left 75%", end: "left 20%" },
    });
    gsap.from(nivel.querySelector(".gameplay-video"), {
      scale: 0.85,
      opacity: 0.2,
      ease: "none",
      scrollTrigger: { ...enEsteNivel, start: "left 85%", end: "left 25%" },
    });
    gsap.from(nivel.querySelector(".nivel__texto"), {
      x: 120,
      opacity: 0,
      ease: "none",
      scrollTrigger: { ...enEsteNivel, start: "left 70%", end: "left 15%" },
    });
  });
}

/* ---------- El demo en notas ---------- */

/* Las notas caen una tras otra, como si alguien las pegara en la pared. */
function animarNotas() {
  gsap.from(".nota", {
    opacity: 0,
    y: -90,
    rotation: (indice) => (indice % 2 ? 14 : -14),
    stagger: 0.12,
    duration: 0.9,
    ease: "back.out(1.6)",
    clearProps: "transform",
    scrollTrigger: { trigger: ".trailer__contenido", start: "top 80%" },
  });
}

/* ---------- Acto 5 · Cierre: entrar al espejo ---------- */

function animarCierre() {
  const contenido = gsap.utils.toArray(".cierre__contenido > *");
  gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: { trigger: ".cierre", start: "top top", end: "+=180%", pin: true, scrub: 0.8 },
  })
    .fromTo(".cierre__espejo", { scale: 0.55 }, { scale: 2.6, duration: 1 }, 0)
    .fromTo(".cierre__aviso", { opacity: 0 }, { opacity: 1, duration: 0.15 }, 0)
    .to(".cierre__aviso", { opacity: 0, y: -40, duration: 0.15 }, 0.35)
    .from(contenido, { opacity: 0, y: 30, stagger: 0.06, duration: 0.2 }, 0.6);
}
