/* =============================================================
   CARENCIA · sonido
   Música del menú y efectos del juego. Nada suena hasta que la
   persona activa el sonido (los navegadores lo exigen).
   ============================================================= */

"use strict";

const VOLUMEN_MUSICA = 0.35;

function crearSonido() {
  const musica = document.getElementById("musica");
  const boton = document.getElementById("boton-sonido");
  const efectos = {
    glitch: document.getElementById("sfx-glitch"),
    escritura: document.getElementById("sfx-escritura"),
    chillido: document.getElementById("sfx-chillido"),
    portal: document.getElementById("sfx-portal"),
  };
  let estaActivo = false;

  function encender() {
    estaActivo = true;
    boton.setAttribute("aria-pressed", "true");
    musica.play().catch(() => apagar());
    gsap.to(musica, { volume: VOLUMEN_MUSICA, duration: 1.5 });
  }

  function apagar() {
    estaActivo = false;
    boton.setAttribute("aria-pressed", "false");
    gsap.to(musica, { volume: 0, duration: 0.6, onComplete: () => musica.pause() });
    Object.values(efectos).forEach((efecto) => efecto.pause());
  }

  function alternar() {
    if (estaActivo) apagar();
    else encender();
  }

  function reproducir(nombre, volumen = 0.6) {
    if (!estaActivo) return;
    const efecto = efectos[nombre];
    efecto.currentTime = 0;
    efecto.volume = volumen;
    efecto.play().catch(() => {});
  }

  function detener(nombre) {
    efectos[nombre].pause();
  }

  /* Baja la música mientras suena algo con audio propio, como el tráiler. */
  function silenciarMusica(silenciar) {
    if (!estaActivo) return;
    gsap.to(musica, { volume: silenciar ? 0 : VOLUMEN_MUSICA, duration: 0.8 });
  }

  musica.volume = 0;
  boton.addEventListener("click", alternar);
  return { reproducir, detener, silenciarMusica, estaActivo: () => estaActivo };
}
