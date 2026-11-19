"""Copia y optimiza para la web los assets del repositorio de Unity de Carencia.

Uso:
    python tools/preparar_assets.py <repo CARENCIA> <PDF oficial> [ruta a ffmpeg]

Requiere Pillow y PyMuPDF, además de un ffmpeg con libx264
(si no se indica la ruta, se usa el "ffmpeg" del PATH).
Los videos salen en H.264/MP4 porque es el único formato que reproducen
todos los navegadores, incluido Safari en iPhone.
"""

import io
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw, ImageFont

SITIO = Path(__file__).resolve().parent.parent
ASSETS = SITIO / "assets"
ANCHO, ALTO, FPS = 960, 540, 24
CALIDAD_X264 = "28"  # CRF: más alto = archivo más ligero

IMAGENES_UI = {
    "UI/Sprites/Menu/UI_FondoBano.png": "fondo-bano.png",
    "UI/Sprites/Menu/UI_CartelDesaparecida.png": "cartel-desaparecida.png",
    "UI/Sprites/Menu/UI_HojaOpciones.png": "hoja.png",
    "UI/Sprites/Menu/UI_Rasguno.png": "rasguno.png",
}

# Imágenes grandes que se convierten a WebP para bajar su peso.
IMAGENES_A_WEBP = {
    "Sprites/periodico.png": "periodico.webp",
}

# Hojas de sprites: cada una es una tira horizontal de frames del mismo ancho.
SPRITES = {
    "Sprites/Personajes/Elaki/SPR_PJ_Elaki_Caminar_SE_R.png": "elaki-caminar.png",
    "Sprites/Personajes/Padres/SPR_PJ_Madre_Parpadear_SE_R.png": "madre-parpadear.png",
    "Sprites/Personajes/Padres/SPR_PJ_Padre_Periodico_SE_R.png": "padre-periodico.png",
    "Sprites/Enemigos/Hermana/SPR_ENE_Hermana_Ataque_S_R.png": "manifestacion-ataque.png",
    "Sprites/Enemigos/PerroHumanoide/SPR_ENE_PerroHumanoide_Ataque_S_R.png": "criatura-ataque.png",
}

# Elaki en las 8 direcciones del juego, para la demo jugable de la web.
DIRECCIONES = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"]
ANIMACIONES_ELAKI = {"Caminar": "caminar", "Espera": "espera"}

# Capturas de cada etapa incluidas en el documento oficial: (página, índice de imagen).
ESCENAS_DEL_PDF = {
    "prologo.webp": (21, 1),
    "nivel-1.webp": (22, 1),
    "nivel-2.webp": (22, 2),
    "nivel-3.webp": (23, 1),
    "ut-cancun.webp": (1, 1),
}

# Cinemáticas en bucle, sin spoilers del desenlace: (archivo, segundo inicial, duración).
CINEMATICAS = {
    "portal-espejo.mp4": ("VID_PRO_PortalEspejo.mp4", 0, 12),
}

# Fondo de la portada: solo fragmentos de cinemáticas, sin tarjetas de texto ni audio.
GUION_LOOP_PORTADA = [
    ("VID_PRO_Despertar.mp4", 0, 4.2),
    ("VID_PRO_PortalEspejo.mp4", 2, 4),
    ("VID_PRO_Portal.mp4", 4, 4),
    ("VID_N2_Monitor.mp4", 30, 6),
    ("VID_N3_ParedOjos.mp4", 0, 3),
    ("VID_N3_BanoFinal.mp4", 3, 5),
]

# Guion del teaser: tarjetas de texto y fragmentos (archivo, inicio, duración).
GUION_TEASER = [
    ("texto", "Nadie recuerda que tuviste una…"),
    ("video", ("VID_PRO_Despertar.mp4", 0, 4.2)),
    ("texto", "«Hijo… tú nunca tuviste hermana»"),
    ("video", ("VID_PRO_PortalEspejo.mp4", 2, 4)),
    ("video", ("VID_PRO_Portal.mp4", 4, 4)),
    ("texto", "Cada vez que cruzas, la casa se deforma"),
    ("video", ("VID_N2_Monitor.mp4", 30, 6)),
    ("video", ("VID_N3_ParedOjos.mp4", 0, 3)),
    ("texto", "¿Encontrarás a Margarita… o la verdad?"),
    ("video", ("VID_N3_BanoFinal.mp4", 3, 5)),
    ("titulo", "CARENCIA"),
]
DURACION_TARJETA = 2.6
SONIDO_TEASER = ("VID_N2_Monitor.mp4", 30)  # el audio del monitor acompaña su fragmento

AUDIO = {
    "Audio/Musica/MUS_Menu.mp3": "musica-menu.mp3",
    "Audio/Efectos/SFX_DES_GlitchNombre.mp3": "glitch-nombre.mp3",
    "Audio/Efectos/SFX_Dialogo_Escritura.mp3": "escritura.mp3",
    "Audio/Efectos/SFX_N2_Chillido.mp3": "chillido.mp3",
    "Audio/Efectos/SFX_Portal1_Zumbido.mp3": "portal.mp3",
}


def main(repo: Path, pdf: Path, ffmpeg: str) -> None:
    carencia = repo / "Assets" / "_Carencia"
    videos = carencia / "Videos"
    copiar_archivos(carencia, IMAGENES_UI, ASSETS / "img")
    convertir_a_webp(carencia, IMAGENES_A_WEBP, ASSETS / "img")
    copiar_archivos(carencia, SPRITES, ASSETS / "sprites")
    copiar_archivos(carencia, mapa_sprites_elaki(), ASSETS / "sprites" / "elaki")
    recortar_margenes(sorted((ASSETS / "sprites" / "elaki").glob("*.png")) + [ASSETS / "sprites" / "elaki-caminar.png"])
    recortar_margenes([ASSETS / "sprites" / "criatura-ataque.png"])
    recortar_margenes([ASSETS / "sprites" / "manifestacion-ataque.png"])
    copiar_archivos(carencia, AUDIO, ASSETS / "audio")
    extraer_escenas(pdf)
    exportar_frames_despertar(ffmpeg, videos / "VID_PRO_Despertar.mp4")
    for destino, (origen, inicio, duracion) in CINEMATICAS.items():
        exportar_bucle(ffmpeg, videos / origen, ASSETS / "video" / destino, inicio, duracion)
    exportar_teaser(ffmpeg, videos, carencia / "Audio/Musica/MUS_Menu.mp3")
    exportar_loop_portada(ffmpeg, videos)
    print("Assets listos en", ASSETS)


def mapa_sprites_elaki() -> dict:
    return {
        f"Sprites/Personajes/Elaki/SPR_PJ_Elaki_{animacion}_{direccion}_R.png": f"{nombre}-{direccion.lower()}.png"
        for animacion, nombre in ANIMACIONES_ELAKI.items()
        for direccion in DIRECCIONES
    }


def copiar_archivos(origen: Path, mapa: dict, destino: Path) -> None:
    destino.mkdir(parents=True, exist_ok=True)
    for relativo, nombre in mapa.items():
        shutil.copyfile(origen / relativo, destino / nombre)


def recortar_margenes(tiras: list) -> None:
    """Quita el espacio transparente de cada frame (los sprites del juego son cuadros de 315 px
    con el personaje al centro). Usa una sola caja para todo el grupo, así los pies quedan
    alineados entre animaciones y direcciones. Imprime la proporción para el CSS."""
    imagenes = [Image.open(tira).convert("RGBA") for tira in tiras]
    caja = caja_comun(imagenes)
    ancho, alto = caja[2] - caja[0], caja[3] - caja[1]
    for tira, imagen in zip(tiras, imagenes):
        lado = imagen.height
        frames = imagen.width // lado
        recortada = Image.new("RGBA", (ancho * frames, alto))
        for indice in range(frames):
            x = indice * lado
            recortada.paste(imagen.crop((x + caja[0], caja[1], x + caja[2], caja[3])), (indice * ancho, 0))
        recortada.save(tira)
    print(f"{tiras[0].parent.name}/{tiras[0].stem}…: frame {ancho}x{alto}, --proporcion: {ancho} / {alto}")


def caja_comun(imagenes: list) -> tuple:
    cajas = []
    for imagen in imagenes:
        lado = imagen.height
        for indice in range(imagen.width // lado):
            caja = imagen.crop((indice * lado, 0, (indice + 1) * lado, lado)).getbbox()
            if caja:
                cajas.append(caja)
    return (min(c[0] for c in cajas), min(c[1] for c in cajas),
            max(c[2] for c in cajas), max(c[3] for c in cajas))


def convertir_a_webp(origen: Path, mapa: dict, destino: Path) -> None:
    for relativo, nombre in mapa.items():
        Image.open(origen / relativo).save(destino / nombre, quality=80)


def extraer_escenas(pdf: Path) -> None:
    documento = pymupdf.open(pdf)
    for nombre, (pagina, indice) in ESCENAS_DEL_PDF.items():
        referencia = documento[pagina - 1].get_images(full=True)[indice][0]
        datos = documento.extract_image(referencia)["image"]
        Image.open(io.BytesIO(datos)).convert("RGB").save(ASSETS / "img" / nombre, quality=82)


def exportar_frames_despertar(ffmpeg: str, video: Path) -> None:
    """Frames JPG para dibujar en <canvas>, sincronizados con el scroll."""
    carpeta = ASSETS / "frames" / "despertar"
    carpeta.mkdir(parents=True, exist_ok=True)
    ejecutar(ffmpeg, "-i", video, "-vf", f"fps=12,scale={ANCHO}:-2", "-q:v", "5",
             "-start_number", "0", carpeta / "%03d.jpg")


def exportar_bucle(ffmpeg: str, video: Path, destino: Path, inicio: float, duracion: float) -> None:
    destino.parent.mkdir(parents=True, exist_ok=True)
    ejecutar(ffmpeg, "-ss", inicio, "-t", duracion, "-i", video,
             "-vf", f"scale={ANCHO}:-2,fps={FPS}", "-an", *opciones_h264(), destino)
    ejecutar(ffmpeg, "-ss", inicio + duracion / 2, "-i", video, "-frames:v", "1",
             "-vf", f"scale={ANCHO}:-2", "-q:v", "4", destino.with_suffix(".jpg"))


def exportar_teaser(ffmpeg: str, videos: Path, musica: Path) -> None:
    """Une tarjetas y fragmentos, y les pone la música del menú más el audio del monitor."""
    with tempfile.TemporaryDirectory() as temporal:
        carpeta = Path(temporal)
        segmentos = [crear_segmento(ffmpeg, carpeta, numero, tipo, contenido, videos)
                     for numero, (tipo, contenido) in enumerate(GUION_TEASER)]
        imagen = carpeta / "imagen.mp4"
        unir_segmentos(ffmpeg, carpeta, segmentos, imagen)
        mezclar_audio_teaser(ffmpeg, imagen, videos, musica)
    ejecutar(ffmpeg, "-ss", 5, "-i", ASSETS / "video" / "teaser.mp4", "-frames:v", "1",
             "-q:v", "4", ASSETS / "video" / "teaser.jpg")


def exportar_loop_portada(ffmpeg: str, videos: Path) -> None:
    with tempfile.TemporaryDirectory() as temporal:
        carpeta = Path(temporal)
        segmentos = [crear_segmento(ffmpeg, carpeta, numero, "video", fragmento, videos)
                     for numero, fragmento in enumerate(GUION_LOOP_PORTADA)]
        unir_segmentos(ffmpeg, carpeta, segmentos, ASSETS / "video" / "portada.mp4")
    ejecutar(ffmpeg, "-ss", 1, "-i", ASSETS / "video" / "portada.mp4", "-frames:v", "1",
             "-q:v", "4", ASSETS / "video" / "portada.jpg")


def unir_segmentos(ffmpeg: str, carpeta: Path, segmentos: list, destino: Path) -> None:
    lista = carpeta / "lista.txt"
    lista.write_text("".join(f"file '{segmento.as_posix()}'\n" for segmento in segmentos))
    ejecutar(ffmpeg, "-f", "concat", "-safe", "0", "-i", lista, "-c", "copy", destino)


def crear_segmento(ffmpeg, carpeta, numero, tipo, contenido, videos) -> Path:
    destino = carpeta / f"segmento-{numero:02d}.mp4"
    if tipo == "video":
        origen, inicio, duracion = contenido
        entrada = ["-ss", inicio, "-t", duracion, "-i", videos / origen]
    else:
        duracion = DURACION_TARJETA + (1 if tipo == "titulo" else 0)
        tarjeta = dibujar_tarjeta(carpeta / f"tarjeta-{numero:02d}.png", contenido, tipo == "titulo")
        entrada = ["-loop", "1", "-t", duracion, "-i", tarjeta]
    fundidos = f"fade=t=in:st=0:d=0.3,fade=t=out:st={duracion - 0.3}:d=0.3"
    ejecutar(ffmpeg, *entrada, "-vf", f"scale={ANCHO}:{ALTO},fps={FPS},setsar=1,{fundidos}",
             "-an", *opciones_h264(), destino)
    return destino


def dibujar_tarjeta(destino: Path, texto: str, es_titulo: bool) -> Path:
    lienzo = Image.new("RGB", (ANCHO, ALTO), (8, 10, 14))
    dibujo = ImageDraw.Draw(lienzo)
    nombre_fuente = "Barrio-Regular.ttf" if es_titulo else "SpecialElite-Regular.ttf"
    fuente = ImageFont.truetype(str(ASSETS / "fonts" / nombre_fuente), 150 if es_titulo else 40)
    x, y = ANCHO / 2, ALTO / 2
    if es_titulo:
        dibujo.text((x + 9, y), texto, font=fuente, fill=(194, 26, 31), anchor="mm")
        dibujo.text((x - 3, y), texto, font=fuente, fill=(95, 168, 200), anchor="mm")
    dibujo.text((x, y), texto, font=fuente, fill=(236, 230, 216), anchor="mm")
    lienzo.save(destino)
    return destino


def mezclar_audio_teaser(ffmpeg: str, imagen: Path, videos: Path, musica: Path) -> None:
    duracion = duracion_del_guion()
    origen, inicio = SONIDO_TEASER
    retraso_ms = int(inicio_del_fragmento(origen) * 1000)
    mezcla = (
        f"[1:a]atrim=0:{duracion},volume=0.7,afade=t=out:st={duracion - 2}:d=2[musica];"
        f"[2:a]atrim=0:6,volume=0.9,adelay={retraso_ms}|{retraso_ms}[monitor];"
        "[musica][monitor]amix=inputs=2:duration=first:normalize=0[audio]"
    )
    ejecutar(ffmpeg, "-i", imagen, "-i", musica, "-ss", inicio, "-i", videos / origen,
             "-filter_complex", mezcla, "-map", "0:v", "-map", "[audio]",
             "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-shortest",
             "-movflags", "+faststart", ASSETS / "video" / "teaser.mp4")


def duracion_del_guion() -> float:
    return sum(duracion_de(tipo, contenido) for tipo, contenido in GUION_TEASER)


def inicio_del_fragmento(origen_buscado: str) -> float:
    transcurrido = 0.0
    for tipo, contenido in GUION_TEASER:
        if tipo == "video" and contenido[0] == origen_buscado:
            return transcurrido
        transcurrido += duracion_de(tipo, contenido)
    raise ValueError(f"{origen_buscado} no está en el guion del teaser")


def duracion_de(tipo: str, contenido) -> float:
    if tipo == "video":
        return contenido[2]
    return DURACION_TARJETA + (1 if tipo == "titulo" else 0)


def opciones_h264() -> list:
    return ["-c:v", "libx264", "-crf", CALIDAD_X264, "-preset", "slow",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart"]


def ejecutar(ffmpeg: str, *argumentos) -> None:
    comando = [ffmpeg, "-y", "-hide_banner", "-loglevel", "error", *map(str, argumentos)]
    subprocess.run(comando, check=True)


if __name__ == "__main__":
    ruta_ffmpeg = sys.argv[3] if len(sys.argv) > 3 else "ffmpeg"
    main(Path(sys.argv[1]), Path(sys.argv[2]), ruta_ffmpeg)
