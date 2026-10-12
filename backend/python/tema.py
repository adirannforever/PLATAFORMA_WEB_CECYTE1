# ============================================================
# tema.py — Design system de documentos CECyTE Plantel 1.
# Paleta tomada del frontend (frontend/src/index.css) y del logo:
#   verde institucional + dorado de acento + naranja (logo).
# Tipografía: Montserrat (oficial CECyTE, manual de identidad),
# Inter (UI de la plataforma) y Merriweather Italic (acentos).
# ============================================================
import os

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ---------------- Rutas base ----------------
DIR_PYTHON = os.path.dirname(os.path.abspath(__file__))
DIR_BACKEND = os.path.dirname(DIR_PYTHON)
DIR_FONTS = os.path.join(DIR_BACKEND, 'assets', 'fonts')
RUTA_LOGO = os.path.join(DIR_BACKEND, 'src', 'assets', 'logo_cecyte.png')

# ---------------- Paleta institucional (Tabasco) ----------------
VERDE = colors.HexColor('#1A6B35')        # primario (frontend --color-primary)
VERDE_OSCURO = colors.HexColor('#0F4521')  # bandas / headers de tabla
VERDE_CLARO = colors.HexColor('#2D8A4E')   # hover / detalles
VERDE_MUTE = colors.HexColor('#E8F5ED')    # fondos suaves
VERDE_FILA = colors.HexColor('#F4F9F6')    # bandas de tabla
DORADO = colors.HexColor('#C8992A')        # acento (frontend --color-accent)
DORADO_MUTE = colors.HexColor('#F5E9C8')   # acento suave
NARANJA = colors.HexColor('#F37238')       # lema / alertas del logo
GRIS_50 = colors.HexColor('#F8FAF9')
GRIS_100 = colors.HexColor('#F0F4F2')
GRIS_200 = colors.HexColor('#DCE6E0')
GRIS_400 = colors.HexColor('#94A89D')
GRIS_600 = colors.HexColor('#4A6357')
GRIS_800 = colors.HexColor('#1E2E27')
ROJO = colors.HexColor('#C0392B')
ROJO_MUTE = colors.HexColor('#FDECEA')
BLANCO = colors.white

# ---------------- Fuentes ----------------
_FUENTES = {
    'Inter': 'Inter_400Regular.ttf',
    'Inter-Medium': 'Inter_500Medium.ttf',
    'Inter-SemiBold': 'Inter_600SemiBold.ttf',
    'Inter-Bold': 'Inter_700Bold.ttf',
    'Montserrat': 'Montserrat_400Regular.ttf',
    'Montserrat-SemiBold': 'Montserrat_600SemiBold.ttf',
    'Montserrat-Bold': 'Montserrat_700Bold.ttf',
    'Merriweather': 'Merriweather_400Regular.ttf',
    'Merriweather-Italic': 'Merriweather_400Regular_Italic.ttf',
}

FUENTES_LISTAS = False
try:
    for nombre, archivo in _FUENTES.items():
        ruta = os.path.join(DIR_FONTS, archivo)
        if os.path.exists(ruta):
            pdfmetrics.registerFont(TTFont(nombre, ruta))
    pdfmetrics.registerFontFamily('Inter', normal='Inter', bold='Inter-Bold',
                                  italic='Inter', boldItalic='Inter-Bold')
    pdfmetrics.registerFontFamily('Montserrat', normal='Montserrat',
                                  bold='Montserrat-Bold', italic='Montserrat',
                                  boldItalic='Montserrat-Bold')
    pdfmetrics.registerFontFamily('Merriweather', normal='Merriweather',
                                  bold='Merriweather', italic='Merriweather-Italic',
                                  boldItalic='Merriweather-Italic')
    FUENTES_LISTAS = all(nombre in pdfmetrics.getRegisteredFontNames()
                         for nombre in _FUENTES)
except Exception:
    FUENTES_LISTAS = False

SANS = 'Inter' if FUENTES_LISTAS else 'Helvetica'
SANS_BD = 'Inter-Bold' if FUENTES_LISTAS else 'Helvetica-Bold'
SANS_SB = 'Inter-SemiBold' if FUENTES_LISTAS else 'Helvetica-Bold'
TITULO = 'Montserrat-Bold' if FUENTES_LISTAS else 'Helvetica-Bold'
TITULO_SB = 'Montserrat-SemiBold' if FUENTES_LISTAS else 'Helvetica-Bold'
SERIF_IT = 'Merriweather-Italic' if FUENTES_LISTAS else 'Times-Italic'

# ---------------- Geometría (A4) ----------------
ANCHO_PAGINA, ALTO_PAGINA = 595.27, 841.89   # pt (A4)
MARGEN_LATERAL = 54                            # ~1.9 cm (norma membretada: 2 cm)
MARGEN_SUPERIOR = 50
MARGEN_INFERIOR = 58
ANCHO_UTIL = ANCHO_PAGINA - 2 * MARGEN_LATERAL

# ---------------- Estilos de texto ----------------
def _estilos():
    s = {}
    s['titulo_documento'] = ParagraphStyle(
        'titulo_documento', fontName=TITULO, fontSize=13, leading=16,
        textColor=BLANCO, alignment=TA_LEFT)
    s['ciclo'] = ParagraphStyle(
        'ciclo', fontName=SANS, fontSize=8.5, leading=11,
        textColor=colors.HexColor('#CFE3D6'), alignment=TA_RIGHT)
    s['nombre_institucion'] = ParagraphStyle(
        'nombre_institucion', fontName=TITULO, fontSize=14.5, leading=17,
        textColor=VERDE, alignment=TA_LEFT)
    s['sede'] = ParagraphStyle(
        'sede', fontName=SANS, fontSize=8.5, leading=11,
        textColor=GRIS_600, alignment=TA_LEFT)
    s['lema'] = ParagraphStyle(
        'lema', fontName=TITULO_SB, fontSize=7.5, leading=10,
        textColor=NARANJA, alignment=TA_LEFT)
    s['etiqueta'] = ParagraphStyle(
        'etiqueta', fontName=SANS_SB, fontSize=7, leading=9,
        textColor=VERDE, alignment=TA_LEFT)
    s['valor'] = ParagraphStyle(
        'valor', fontName=SANS, fontSize=9.5, leading=12,
        textColor=GRIS_800, alignment=TA_LEFT)
    s['valor_chico'] = ParagraphStyle(
        'valor_chico', fontName=SANS, fontSize=8.5, leading=11,
        textColor=GRIS_800, alignment=TA_LEFT)
    s['seccion'] = ParagraphStyle(
        'seccion', fontName=TITULO_SB, fontSize=9, leading=12,
        textColor=VERDE_OSCURO, alignment=TA_LEFT)
    s['th_tabla'] = ParagraphStyle(
        'th_tabla', fontName=SANS_BD, fontSize=8, leading=10,
        textColor=BLANCO, alignment=TA_CENTER)
    s['th_tabla_izq'] = ParagraphStyle(
        'th_tabla_izq', fontName=SANS_BD, fontSize=8, leading=10,
        textColor=BLANCO, alignment=TA_LEFT)
    s['td_tabla'] = ParagraphStyle(
        'td_tabla', fontName=SANS, fontSize=9, leading=11,
        textColor=GRIS_800, alignment=TA_LEFT)
    s['td_centro'] = ParagraphStyle(
        'td_centro', fontName=SANS, fontSize=9, leading=11,
        textColor=GRIS_800, alignment=TA_CENTER)
    s['nota'] = ParagraphStyle(
        'nota', fontName=SANS, fontSize=7, leading=9,
        textColor=GRIS_400, alignment=TA_CENTER)
    s['firma_pie'] = ParagraphStyle(
        'firma_pie', fontName=SANS_SB, fontSize=7.5, leading=10,
        textColor=GRIS_600, alignment=TA_CENTER)
    s['fecha'] = ParagraphStyle(
        'fecha', fontName=SERIF_IT, fontSize=9.5, leading=13,
        textColor=GRIS_600, alignment=TA_CENTER)
    s['cuerpo_constancia'] = ParagraphStyle(
        'cuerpo_constancia', fontName=SANS, fontSize=10.5, leading=16,
        textColor=GRIS_800, alignment=TA_JUSTIFY)
    s['cierre_constancia'] = ParagraphStyle(
        'cierre_constancia', fontName=SERIF_IT, fontSize=10, leading=15,
        textColor=GRIS_600, alignment=TA_CENTER)
    s['vacio'] = ParagraphStyle(
        'vacio', fontName=SANS, fontSize=10, leading=14,
        textColor=GRIS_600, alignment=TA_CENTER)
    s['titulo_constancia'] = ParagraphStyle(
        'titulo_constancia', fontName=TITULO, fontSize=22, leading=26,
        textColor=VERDE, alignment=TA_CENTER)
    s['nombre_alumno_grande'] = ParagraphStyle(
        'nombre_alumno_grande', fontName=TITULO, fontSize=16, leading=20,
        textColor=VERDE_OSCURO, alignment=TA_CENTER)
    return s


ESTILOS = _estilos()

# ---------------- Utilidades de texto ----------------
MESES = ('enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
         'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre')


def fecha_larga(fecha=None):
    from datetime import date
    f = fecha or date.today()
    return f'{f.day} de {MESES[f.month - 1]} de {f.year}'


def fmt_calificacion(valor):
    if valor is None:
        return '—'
    try:
        return f'{float(valor):.1f}'
    except (TypeError, ValueError):
        return '—'


def parcial_de(parciales, n):
    """Soporta parciales como lista ([null,8,9,7]) u objeto ({1:8,...})."""
    if parciales is None:
        return None
    try:
        if isinstance(parciales, dict):
            valor = parciales.get(str(n), parciales_get(parciales, n))
        else:
            valor = parciales[n] if n < len(parciales) else None
    except (TypeError, IndexError, KeyError):
        return None
    return valor if isinstance(valor, (int, float)) else None


def parciales_get(parciales, n):
    try:
        return parciales.get(n)
    except AttributeError:
        return None


def P(texto, estilo):
    from reportlab.platypus import Paragraph
    return Paragraph(texto, estilo)


# ---------------- Componentes de layout ----------------
def encabezado_institucional(institucion):
    """Logo + bloque de identidad institucional (fila superior)."""
    from reportlab.platypus import Image, Table, TableStyle
    from reportlab.lib.utils import ImageReader

    nombre = institucion.get('nombre', 'CECyTE')
    sede = f"{institucion.get('sede', '')} · {institucion.get('estado', 'Tabasco')}"
    lema = institucion.get('lema', '')

    imagen = None
    if os.path.exists(RUTA_LOGO):
        try:
            ImageReader(RUTA_LOGO)  # valida decodificación
            imagen = Image(RUTA_LOGO, width=52, height=52)
        except Exception:
            imagen = None

    celda_logo = imagen if imagen else ''
    tabla = Table(
        [[celda_logo,
          [P(nombre, ESTILOS['nombre_institucion']),
           P(sede, ESTILOS['sede']),
           P(lema.upper(), ESTILOS['lema'])]]],
        colWidths=[60, ANCHO_UTIL - 60])
    tabla.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (1, 0), (1, 0), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    return tabla


def banda_titulo(titulo, subtitulo=None):
    """Banda verde oscura con el título del documento (y subtítulo a la derecha)."""
    from reportlab.platypus import Table, TableStyle

    derecha = P(subtitulo, ESTILOS['ciclo']) if subtitulo else ''
    tabla = Table([[P(titulo.upper(), ESTILOS['titulo_documento']), derecha]],
                  colWidths=[ANCHO_UTIL * 0.62, ANCHO_UTIL * 0.38])
    tabla.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), VERDE_OSCURO),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (0, 0), 12),
        ('RIGHTPADDING', (1, 0), (1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
    ]))
    return tabla


def regla_acento(parte_verde=0.78):
    """Regla segmentada verde + dorado debajo de la banda."""
    from reportlab.platypus import Table, TableStyle

    tabla = Table([['', '']], colWidths=[ANCHO_UTIL * parte_verde,
                                         ANCHO_UTIL * (1 - parte_verde)],
                  rowHeights=[4], hAlign='LEFT')
    tabla.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), VERDE),
        ('BACKGROUND', (1, 0), (1, 0), DORADO),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    return tabla


def chip_seccion(texto):
    """Barra de sección: barra verde + fondo verde suave."""
    from reportlab.platypus import Table, TableStyle

    tabla = Table([['', P(texto.upper(), ESTILOS['seccion'])]],
                  colWidths=[4, ANCHO_UTIL - 4])
    tabla.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), VERDE),
        ('BACKGROUND', (1, 0), (1, 0), VERDE_MUTE),
        ('LEFTPADDING', (1, 0), (1, 0), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    return tabla


def bloque_firma(institucion, fecha_texto=None):
    """Fecha + línea de firma centrada con pie institucional."""
    from reportlab.platypus import Spacer, Table, TableStyle

    fecha = fecha_texto or f"Macuspana, {institucion.get('estado', 'Tabasco')} a {fecha_larga()}"
    linea = Table([['']], colWidths=[220], rowHeights=[1])
    linea.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, -1), 0.9, GRIS_800),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    bloque = [
        P(fecha, ESTILOS['fecha']),
        Spacer(1, 26),
        Table([[linea]], style=TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ])),
        Spacer(1, 4),
        P('FIRMA Y SELLO DE LA DIRECCIÓN', ESTILOS['firma_pie']),
    ]
    return bloque


# ---------------- Decoración de página (canvas) ----------------
def marco_pagina(canvas, doc=None):
    """Marco institucional: filete verde exterior + pínstora dorada interior."""
    canvas.saveState()
    w, h = ANCHO_PAGINA, ALTO_PAGINA
    canvas.setStrokeColor(VERDE)
    canvas.setLineWidth(1.1)
    canvas.rect(18, 18, w - 36, h - 36)
    canvas.setStrokeColor(DORADO)
    canvas.setLineWidth(0.5)
    canvas.rect(22.5, 22.5, w - 45, h - 45)
    canvas.restoreState()


def marca_de_agua(canvas, doc=None):
    """Logotipo central con opacidad mínima (verificación visual sutil)."""
    if not os.path.exists(RUTA_LOGO):
        return
    canvas.saveState()
    try:
        from reportlab.lib.utils import ImageReader
        canvas.setFillAlpha(0.035)
        canvas.drawImage(ImageReader(RUTA_LOGO),
                         (ANCHO_PAGINA - 260) / 2, (ALTO_PAGINA - 260) / 2,
                         width=260, height=260, mask='auto')
    except Exception:
        pass
    finally:
        canvas.restoreState()


def pie_pagina(canvas, doc, institucion=None):
    """Filete + datos institucionales a la izquierda (paginación: NumberedCanvas)."""
    inst = institucion or {}
    canvas.saveState()
    canvas.setStrokeColor(GRIS_200)
    canvas.setLineWidth(0.6)
    canvas.line(MARGEN_LATERAL, 42, ANCHO_PAGINA - MARGEN_LATERAL, 42)
    canvas.setFont(SANS, 7)
    canvas.setFillColor(GRIS_400)
    izq = (f"{inst.get('nombre', 'CECyTE Plantel 1')} · "
           f"{inst.get('sede', 'Poblado Aquiles Serdán, Macuspana')}")
    canvas.drawString(MARGEN_LATERAL, 31, izq)
    canvas.restoreState()


def decoracion_pagina(institucion):
    """onPage que combina marca de agua, marco y pie."""
    def _decor(canvas, doc):
        marca_de_agua(canvas, doc)
        marco_pagina(canvas, doc)
        pie_pagina(canvas, doc, institucion)
    return _decor


class PaginasNumeradas:
    """Agrega 'Página X de Y' al pie derecho (requiere canvasmaker)."""

    def __new__(cls, *args, **kwargs):
        from reportlab.pdfgen import canvas as canvas_mod
        base = canvas_mod.Canvas

        class _PaginasNumeradas(base):
            def __init__(self, *a, **k):
                super().__init__(*a, **k)
                self._paginas = []

            def showPage(self):
                self._paginas.append(dict(self.__dict__))
                self._startPage()

            def save(self):
                total = len(self._paginas)
                for estado in self._paginas:
                    self.__dict__.update(estado)
                    self._paginar(total)
                    base.showPage(self)
                base.save(self)

            def _paginar(self, total):
                self.setFont(SANS, 7)
                self.setFillColor(GRIS_400)
                self.drawRightString(ANCHO_PAGINA - MARGEN_LATERAL, 31,
                                     f'Página {self._pageNumber} de {total}')

        return _PaginasNumeradas(*args, **kwargs)



