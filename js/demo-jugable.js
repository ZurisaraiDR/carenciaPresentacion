/* =============================================================
   CARENCIA · demo jugable
   Elaki camina por su baño con W A S D (o flechas) y usa E para
   inspeccionar. Las coordenadas están en píxeles de la imagen
   original del fondo (1024 × 644) y CSS las escala a porcentajes.
   ============================================================= */

"use strict";

const VELOCIDAD_ELAKI = 190; // píxeles de la imagen por segundo
const POSICION_INICIAL = { x: 640, y: 545 };

/* Contorno del piso visible, medido sobre UI_FondoBano.png; los pies de Elaki no salen de aquí. */
const PISO = [
  [380, 522], [610, 410], [680, 440], [780, 470], [990, 476], [660, 640], [480, 595],
];

const PUNTOS_DE_INTERES = [
  {
    nombre: "espejo",
    pies: { x: 850, y: 485 },
    alcance: 95,
    indicador: { x: 900, y: 135 },
    pensamientos: [
      "El gabinete está lleno de pastillas. Hay más frascos que personas en esta casa.",
      "¿Y si Margarita cruzó por aquí?",
      "El espejo sigue abierto. Ella está del otro lado.",
    ],
    alPensar: (indice, escenario, estado) => {
      if (indice === 0) marcarObjetivo("Algo cambió. Vuelve a revisar el espejo.");
      if (indice === 1) {
        abrirPortal(escenario, estado.sonido);
        completarObjetivo();
      }
    },
  },
  {
    nombre: "toallero",
    pies: { x: 715, y: 458 },
    alcance: 70,
    indicador: { x: 805, y: 170 },
    pensamientos: ["Hay una toalla de más. Aquí dicen que solo viven tres."],
  },
  {
    nombre: "cortina",
    pies: { x: 440, y: 525 },
    alcance: 90,
    indicador: { x: 330, y: 250 },
    pensamientos: ["La cortina está cerrada. Prefiero no abrirla… todavía."],
  },
];

/* Vector de movimiento en pantalla → nombre del sprite de esa dirección. */
const DIRECCION_POR_VECTOR = {
  "0,-1": "n", "1,-1": "ne", "1,0": "e", "1,1": "se",
  "0,1": "s", "-1,1": "so", "-1,0": "o", "-1,-1": "no",
};

const TECLAS_DE_MOVIMIENTO = {
  w: [0, -1], arrowup: [0, -1],
  s: [0, 1], arrowdown: [0, 1],
  a: [-1, 0], arrowleft: [-1, 0],
  d: [1, 0], arrowright: [1, 0],
};

/* Las flechas iluminan la misma tecla del mando en pantalla que su letra. */
const TECLA_EN_PANTALLA = { arrowup: "w", arrowdown: "s", arrowleft: "a", arrowright: "d", enter: "e", " ": "e" };

function iniciarDemoJugable(sonido) {
  const escenario = document.getElementById("escenario");
  const estado = {
    posicion: { ...POSICION_INICIAL },
    direccion: "s",
    caminando: false,
    teclas: new Set(),
    cercano: null,
    lecturas: new Map(),
    ultimoTiempo: 0,
    cuadro: 0,
    sonido,
  };
  const dialogo = crearDialogo(escenario, sonido);

  colocarJugador(escenario, estado.posicion);
  conectarTeclado(escenario, estado, dialogo);
  conectarMando(escenario, estado, dialogo);
  const activar = () => escenario.classList.add("esta-activo");
  escenario.addEventListener("click", () => escenario.focus());
  ["focus", "pointerdown", "keydown"].forEach((tipo) => escenario.addEventListener(tipo, activar));
  escenario.addEventListener("blur", () => soltarTodo(estado));
}

/* ---------- Entrada ---------- */

function conectarTeclado(escenario, estado, dialogo) {
  escenario.addEventListener("keydown", (evento) => {
    const tecla = evento.key.toLowerCase();
    if (tecla in TECLAS_DE_MOVIMIENTO) {
      evento.preventDefault();
      presionar(escenario, estado, tecla);
    } else if (tecla === "e" || tecla === "enter" || tecla === " ") {
      evento.preventDefault();
      iluminarTecla(tecla, true);
      interactuar(escenario, estado, dialogo);
    } else if (tecla === "escape") {
      dialogo.cerrar();
    }
  });
  escenario.addEventListener("keyup", (evento) => {
    const tecla = evento.key.toLowerCase();
    soltar(estado, tecla);
    iluminarTecla(tecla, false);
  });
}

/* Las teclas en pantalla también se pueden presionar con clic o toque.
   preventDefault en pointerdown evita que roben el foco al escenario. */
function conectarMando(escenario, estado, dialogo) {
  document.querySelectorAll(".mando [data-tecla]").forEach((boton) => {
    const tecla = boton.dataset.tecla;
    boton.addEventListener("pointerdown", (evento) => {
      evento.preventDefault();
      escenario.classList.add("esta-activo");
      if (tecla === "e") interactuar(escenario, estado, dialogo);
      else presionar(escenario, estado, tecla);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((tipo) => {
      boton.addEventListener(tipo, () => soltar(estado, tecla));
    });
  });
}

function presionar(escenario, estado, tecla) {
  estado.teclas.add(tecla);
  iluminarTecla(tecla, true);
  if (estado.cuadro) return;
  estado.ultimoTiempo = performance.now();
  estado.cuadro = requestAnimationFrame((tiempo) => avanzar(escenario, estado, tiempo));
}

function soltar(estado, tecla) {
  estado.teclas.delete(tecla);
  iluminarTecla(tecla, false);
}

function soltarTodo(estado) {
  estado.teclas.forEach((tecla) => iluminarTecla(tecla, false));
  estado.teclas.clear();
}

function iluminarTecla(tecla, encendida) {
  const letra = TECLA_EN_PANTALLA[tecla] ?? tecla;
  document.querySelector(`.mando [data-tecla="${letra}"]`)?.classList.toggle("esta-presionada", encendida);
}

/* ---------- Movimiento ---------- */

/* Un cuadro de animación: solo corre mientras hay teclas presionadas. */
function avanzar(escenario, estado, tiempo) {
  const segundos = Math.min((tiempo - estado.ultimoTiempo) / 1000, 0.05);
  estado.ultimoTiempo = tiempo;
  const vector = vectorDeTeclas(estado.teclas);

  if (!vector) {
    estado.cuadro = 0;
    cambiarAnimacion(escenario, estado, estado.direccion, false);
    return;
  }

  estado.posicion = siguientePosicion(estado.posicion, vector, segundos);
  colocarJugador(escenario, estado.posicion);
  cambiarAnimacion(escenario, estado, DIRECCION_POR_VECTOR[`${vector[0]},${vector[1]}`], true);
  actualizarPuntoCercano(escenario, estado);
  estado.cuadro = requestAnimationFrame((siguiente) => avanzar(escenario, estado, siguiente));
}

function vectorDeTeclas(teclas) {
  let x = 0;
  let y = 0;
  teclas.forEach((tecla) => {
    const [dx, dy] = TECLAS_DE_MOVIMIENTO[tecla] ?? [0, 0];
    x += dx;
    y += dy;
  });
  x = Math.sign(x);
  y = Math.sign(y);
  return x === 0 && y === 0 ? null : [x, y];
}

/* Como en el juego, la diagonal va a la misma velocidad que un solo eje.
   Si choca con el borde del piso, intenta deslizarse por un solo eje. */
function siguientePosicion(posicion, [x, y], segundos) {
  const paso = (VELOCIDAD_ELAKI * segundos) / Math.hypot(x, y);
  const candidatos = [
    { x: posicion.x + x * paso, y: posicion.y + y * paso },
    { x: posicion.x + x * paso, y: posicion.y },
    { x: posicion.x, y: posicion.y + y * paso },
  ];
  return candidatos.find(estaSobreElPiso) ?? posicion;
}

/* Prueba de punto en polígono por lanzamiento de rayo (regla par-impar). */
function estaSobreElPiso({ x, y }) {
  let adentro = false;
  for (let i = 0, j = PISO.length - 1; i < PISO.length; j = i++) {
    const [xi, yi] = PISO[i];
    const [xj, yj] = PISO[j];
    const cruza = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (cruza) adentro = !adentro;
  }
  return adentro;
}

function colocarJugador(escenario, { x, y }) {
  escenario.style.setProperty("--x", x.toFixed(1));
  escenario.style.setProperty("--y", y.toFixed(1));
}

function cambiarAnimacion(escenario, estado, direccion, caminando) {
  if (estado.direccion === direccion && estado.caminando === caminando) return;
  estado.direccion = direccion;
  estado.caminando = caminando;
  const sprite = escenario.querySelector(".jugador__sprite");
  sprite.querySelector("img").src = `assets/sprites/elaki/${caminando ? "caminar" : "espera"}-${direccion}.png`;
  sprite.style.setProperty("--frames", caminando ? "12" : "4");
  sprite.style.setProperty("--duracion", caminando ? "0.9s" : "1.4s");
}

/* ---------- Interacción ---------- */

function actualizarPuntoCercano(escenario, estado) {
  const cercano = PUNTOS_DE_INTERES.find((punto) =>
    Math.hypot(punto.pies.x - estado.posicion.x, punto.pies.y - estado.posicion.y) < punto.alcance) ?? null;
  if (cercano === estado.cercano) return;
  estado.cercano = cercano;
  mostrarIndicador(escenario, cercano);
}

function mostrarIndicador(escenario, punto) {
  const indicador = escenario.querySelector(".escenario__indicador");
  gsap.killTweensOf(indicador);
  if (!punto) {
    gsap.to(indicador, { opacity: 0, duration: 0.2 });
    return;
  }
  indicador.style.left = `${(punto.indicador.x / 1024) * 100}%`;
  indicador.style.top = `${(punto.indicador.y / 644) * 100}%`;
  gsap.to(indicador, { opacity: 1, duration: 0.2 });
  if (!prefiereMovimientoReducido()) {
    gsap.fromTo(indicador, { y: 0 }, { y: -6, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut" });
  }
}

function interactuar(escenario, estado, dialogo) {
  if (dialogo.estaEscribiendo()) {
    dialogo.completar();
    return;
  }
  if (dialogo.estaAbierto()) {
    dialogo.cerrar();
    return;
  }
  const punto = estado.cercano;
  if (!punto) return;
  const indice = Math.min(estado.lecturas.get(punto.nombre) ?? 0, punto.pensamientos.length - 1);
  estado.lecturas.set(punto.nombre, indice + 1);
  dialogo.escribir(punto.pensamientos[indice]);
  punto.alPensar?.(indice, escenario, estado);
}

/* ---------- Objetivo ---------- */

function marcarObjetivo(texto) {
  document.getElementById("objetivo").textContent = texto;
}

/* Al abrir el portal, la demo invita a seguir del otro lado: el juego completo. */
function completarObjetivo() {
  marcarObjetivo("Lo abriste. Margarita está del otro lado.");
  const enlace = document.querySelector(".objetivo__enlace");
  enlace.hidden = false;
  if (!prefiereMovimientoReducido()) gsap.from(enlace, { opacity: 0, y: 10, duration: 0.6, delay: 0.6 });
}

/* Caja de diálogo del juego: negra translúcida, texto letra por letra con sonido de máquina. */
function crearDialogo(escenario, sonido) {
  const caja = escenario.querySelector(".dialogo");
  const texto = caja.querySelector(".dialogo__texto");
  let escritura = null;

  function escribir(frase) {
    caja.hidden = false;
    escritura?.kill();
    const letras = { cantidad: 0 };
    sonido.reproducir("escritura", 0.35);
    escritura = gsap.to(letras, {
      cantidad: frase.length,
      duration: frase.length * 0.03,
      ease: "none",
      onUpdate: () => { texto.textContent = frase.slice(0, Math.round(letras.cantidad)); },
      onComplete: () => sonido.detener("escritura"),
    });
  }

  return {
    escribir,
    completar: () => escritura?.progress(1),
    cerrar: () => {
      escritura?.kill();
      sonido.detener("escritura");
      caja.hidden = true;
    },
    estaEscribiendo: () => Boolean(escritura?.isActive()),
    estaAbierto: () => !caja.hidden,
  };
}

/* Igual que en el prólogo: al cerrar el gabinete, el espejo se vuelve un portal. */
function abrirPortal(escenario, sonido) {
  sonido.reproducir("portal", 0.5);
  const espejo = escenario.querySelector(".escenario__espejo");
  espejo.querySelector("video").play().catch(() => {});
  gsap.to(espejo, { opacity: 1, duration: 1.2, ease: "power2.in" });
  if (prefiereMovimientoReducido()) return;
  gsap.fromTo(escenario, { x: -4 }, { x: 4, duration: 0.05, repeat: 9, yoyo: true, ease: "none", clearProps: "x" });
}
