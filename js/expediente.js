/* =============================================================
   CARENCIA · personajes
   Expediente familiar (pestañas accesibles, patrón WAI-ARIA APG:
   https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) y la linterna
   que revela a las entidades.
   ============================================================= */

"use strict";

/* ---------- Expediente familiar ---------- */

function iniciarExpediente() {
  const pestanas = Array.from(document.querySelectorAll("#expediente [role='tab']"));

  pestanas.forEach((pestana, posicion) => {
    pestana.addEventListener("click", () => mostrarFicha(pestanas, pestana));
    pestana.addEventListener("keydown", (evento) => {
      const destino = pestanaSegunTecla(pestanas, posicion, evento.key);
      if (!destino) return;
      evento.preventDefault();
      destino.focus();
      mostrarFicha(pestanas, destino);
    });
  });
}

function pestanaSegunTecla(pestanas, posicion, tecla) {
  const ultima = pestanas.length - 1;
  const destinos = {
    ArrowRight: posicion === ultima ? 0 : posicion + 1,
    ArrowDown: posicion === ultima ? 0 : posicion + 1,
    ArrowLeft: posicion === 0 ? ultima : posicion - 1,
    ArrowUp: posicion === 0 ? ultima : posicion - 1,
    Home: 0,
    End: ultima,
  };
  return tecla in destinos ? pestanas[destinos[tecla]] : null;
}

function mostrarFicha(pestanas, elegida) {
  if (elegida.getAttribute("aria-selected") === "true") return;
  pestanas.forEach((pestana) => {
    const esElegida = pestana === elegida;
    pestana.setAttribute("aria-selected", String(esElegida));
    pestana.tabIndex = esElegida ? 0 : -1;
    document.getElementById(pestana.getAttribute("aria-controls")).hidden = !esElegida;
  });
  animarFichaNueva(document.getElementById(elegida.getAttribute("aria-controls")));
}

/* El personaje entra con un pequeño temblor, como una imagen que cuesta recordar. */
function animarFichaNueva(ficha) {
  if (prefiereMovimientoReducido()) return;
  const escena = ficha.querySelector(".ficha__escena");
  const textos = ficha.querySelectorAll(".ficha__texto > *");
  gsap.timeline({ defaults: { ease: "power3.out" } })
    .fromTo(escena, { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: 0.5 })
    .to(escena, { x: 6, duration: 0.05, repeat: 3, yoyo: true, ease: "none" }, 0.1)
    .fromTo(textos, { opacity: 0, y: 16 }, { opacity: 1, y: 0, stagger: 0.07, duration: 0.5 }, 0.1);
}

/* ---------- Linterna ---------- */

function iniciarLinterna(sonido) {
  const oscuridad = document.getElementById("oscuridad");
  const boton = document.getElementById("boton-luz");
  const deambular = hacerDeambularLaLuz(oscuridad);
  let yaSeVieron = false;

  function apuntar(evento) {
    deambular?.kill();
    const caja = oscuridad.getBoundingClientRect();
    gsap.to(oscuridad, {
      "--x": `${evento.clientX - caja.left}px`,
      "--y": `${evento.clientY - caja.top}px`,
      duration: 0.25,
      ease: "power2.out",
      overwrite: "auto",
    });
  }

  oscuridad.addEventListener("pointermove", apuntar);
  oscuridad.addEventListener("pointerdown", apuntar);

  boton.addEventListener("click", () => {
    const encender = !oscuridad.classList.contains("esta-iluminada");
    oscuridad.classList.toggle("esta-iluminada", encender);
    boton.setAttribute("aria-pressed", String(encender));
    boton.textContent = encender ? "Apagar la luz" : "Encender la luz";
    if (encender && !yaSeVieron) sonido.reproducir("chillido", 0.4);
    yaSeVieron = yaSeVieron || encender;
  });
}

/* Antes de que la persona mueva el puntero, la luz se pasea sola para sugerir que se puede mover. */
function hacerDeambularLaLuz(oscuridad) {
  if (prefiereMovimientoReducido()) return null;
  return gsap.timeline({ repeat: -1, yoyo: true, defaults: { duration: 2.4, ease: "sine.inOut" } })
    .fromTo(oscuridad, { "--x": "22%", "--y": "40%" }, { "--x": "50%", "--y": "55%" })
    .to(oscuridad, { "--x": "78%", "--y": "38%" });
}
