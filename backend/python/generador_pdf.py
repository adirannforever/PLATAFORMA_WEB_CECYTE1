# ============================================================
# generador_pdf.py — Boletas y constancias (ReportLab / platypus).
# ============================================================
import io

from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Spacer, Table, TableStyle

import tema as T
from tema import (ESTILOS, P, ANCHO_UTIL, ALTO_PAGINA, ANCHO_PAGINA,
                  MARGEN_LATERAL, MARGEN_SUPERIOR, MARGEN_INFERIOR,
                  VERDE, VERDE_OSCURO, VERDE_MUTE, DORADO, GRIS_200,
                  GRIS_400, GRIS_600, GRIS_800, GRIS_50, ROJO, BLANCO)


def _documento_pdf(buffer, institucion, titulo):
    return SimpleDocTemplate(
        buffer, pagesize=(ANCHO_PAGINA, ALTO_PAGINA),
        leftMargin=MARGEN_LATERAL, rightMargin=MARGEN_LATERAL,
        topMargin=MARGEN_SUPERIOR, bottomMargin=MARGEN_INFERIOR,
        title=titulo, author=institucion.get('nombre', 'CECyTE'),
        subject=institucion.get('sede', ''), creator='Plataforma CECyTE')


def _celda_etiqueta(texto):
    return P(texto.upper(), ESTILOS['etiqueta'])


def _celda_valor(texto):
    return P(str(texto), ESTILOS['valor'])


def _tarjeta_datos(alumno, ciclo_nombre):
    """Ficha del alumno en tarjeta institucional (4 columnas)."""
    estatus = str(alumno.get('estatus', '') or '').lower()
    activo = estatus == 'activo'
    estilo_estatus = ParagraphStyle(
        'estatus', parent=ESTILOS['valor'], fontName=T.SANS_BD, fontSize=8.5,
        textColor=BLANCO, alignment=1)

    filas = [
        [_celda_etiqueta('Alumno'),
         _celda_valor(f"{alumno.get('apellidos', '')}, {alumno.get('nombre', '')}"),
         _celda_etiqueta('Matrícula'),
         _celda_valor(alumno.get('matricula', '—'))],
        [_celda_etiqueta('Semestre'),
         _celda_valor(f"{alumno.get('semestre_actual', '—')}°"),
         _celda_etiqueta('Grupo'),
         _celda_valor(alumno.get('grupo_nombre') or 'Sin grupo')],
        [_celda_etiqueta('Especialidad'),
         _celda_valor(alumno.get('especialidad_nombre') or 'Sin especialidad'), '', ''],
        [_celda_etiqueta('Ciclo'),
         _celda_valor(ciclo_nombre or 'Sin ciclo'),
         _celda_etiqueta('Estatus'),
         P(estatus.upper() or '—', estilo_estatus)],
    ]
    ancho_etq, ancho_val = 76, 150
    tabla = Table(filas, colWidths=[ancho_etq, ancho_val, ancho_etq,
                                    ANCHO_UTIL - 2 * ancho_etq - ancho_val])
    tabla.setStyle(TableStyle([
        ('SPAN', (1, 2), (3, 2)),
        ('BACKGROUND', (0, 0), (-1, -1), GRIS_50),
        ('BACKGROUND', (3, 3), (3, 3), VERDE if activo else ROJO),
        ('BOX', (0, 0), (-1, -1), 0.9, VERDE),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (3, 3), (3, 3), 0),
        ('RIGHTPADDING', (3, 3), (3, 3), 0),
        ('TOPPADDING', (3, 3), (3, 3), 4),
        ('BOTTOMPADDING', (3, 3), (3, 3), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    return tabla


def _tabla_calificaciones(materias):
    """Tabla de calificaciones con estilos de la plataforma."""
    ancho_mat, ancho_num = 215, 58
    ancho_prom = ANCHO_UTIL - ancho_mat - 3 * ancho_num

    filas = [[P('MATERIA', ESTILOS['th_tabla_izq']),
              P('PARCIAL 1', ESTILOS['th_tabla']),
              P('PARCIAL 2', ESTILOS['th_tabla']),
              P('PARCIAL 3', ESTILOS['th_tabla']),
              P('PROMEDIO', ESTILOS['th_tabla'])]]

    estilo_prom = ParagraphStyle('pr', parent=ESTILOS['td_centro'])
    estilo_prom_malo = ParagraphStyle('prn', parent=ESTILOS['td_centro'],
                                      textColor=ROJO)
    estilo_prom_bien = ParagraphStyle('prok', parent=ESTILOS['td_centro'],
                                      textColor=VERDE, fontName=T.SANS_BD)
    estilo_prom_vacio = ParagraphStyle('pr0', parent=ESTILOS['td_centro'],
                                       textColor=GRIS_400)
    del estilo_prom

    totales = [0.0, 0.0, 0.0]
    suma_promedios = 0.0
    for materia in materias:
        parciales = materia.get('parciales')
        valores = [T.parcial_de(parciales, 1), T.parcial_de(parciales, 2),
                   T.parcial_de(parciales, 3)]
        promedio = materia.get('promedio')
        for i, valor in enumerate(valores):
            if isinstance(valor, (int, float)):
                totales[i] += valor
        if isinstance(promedio, (int, float)):
            suma_promedios += promedio
            estilo = estilo_prom_bien if promedio >= 6 else estilo_prom_malo
            celda_prom = P(T.fmt_calificacion(promedio), estilo)
        else:
            celda_prom = P('—', estilo_prom_vacio)
        filas.append([
            P(str(materia.get('nombre', '—')), ESTILOS['td_tabla']),
            P(T.fmt_calificacion(valores[0]), ESTILOS['td_centro']),
            P(T.fmt_calificacion(valores[1]), ESTILOS['td_centro']),
            P(T.fmt_calificacion(valores[2]), ESTILOS['td_centro']),
            celda_prom,
        ])

    estilo_tot_num = ParagraphStyle('totnum', parent=ESTILOS['td_centro'],
                                    fontName=T.SANS_BD, textColor=BLANCO)
    estilo_tot_txt = ParagraphStyle('tottxt', parent=ESTILOS['td_tabla'],
                                    fontName=T.SANS_BD, textColor=BLANCO)
    filas.append([
        P('TOTALES', estilo_tot_txt),
        P(T.fmt_calificacion(totales[0]), estilo_tot_num),
        P(T.fmt_calificacion(totales[1]), estilo_tot_num),
        P(T.fmt_calificacion(totales[2]), estilo_tot_num),
        P(T.fmt_calificacion(suma_promedios), estilo_tot_num),
    ])

    tabla = Table(filas, colWidths=[ancho_mat, ancho_num, ancho_num,
                                    ancho_num, ancho_prom])
    estilo = [
        ('BACKGROUND', (0, 0), (-1, 0), VERDE),
        ('BACKGROUND', (0, -1), (-1, -1), VERDE_OSCURO),
        ('BOX', (0, 0), (-1, -1), 0.8, VERDE),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LINEBELOW', (0, 1), (-1, -2), 0.4, GRIS_200),
    ]
    for i in range(1, len(filas) - 1):
        if i % 2 == 0:
            estilo.append(('BACKGROUND', (0, i), (-1, i), T.VERDE_FILA))
    tabla.setStyle(TableStyle(estilo))
    return tabla


def _cajas_parciales(promedios):
    """Tres cajas: promedio de cada parcial."""
    cajas = []
    claves = [('PROMEDIO P1', 'p1Prom'), ('PROMEDIO P2', 'p2Prom'),
              ('PROMEDIO P3', 'p3Prom')]
    estilo_valor = ParagraphStyle('statv', parent=ESTILOS['td_centro'],
                                  fontName=T.TITULO, fontSize=13, leading=15,
                                  textColor=VERDE_OSCURO)
    estilo_valor_vacio = ParagraphStyle('statv0', parent=estilo_valor,
                                        textColor=GRIS_400)
    estilo_etiqueta = ParagraphStyle('statl', parent=ESTILOS['etiqueta'],
                                     alignment=1)
    for etiqueta, clave in claves:
        valor = promedios.get(clave)
        hay_valor = isinstance(valor, (int, float))
        cajas.append([
            P(etiqueta, estilo_etiqueta),
            P(T.fmt_calificacion(valor) if hay_valor else '—',
              estilo_valor if hay_valor else estilo_valor_vacio),
        ])
    tabla = Table([cajas], colWidths=[ANCHO_UTIL / 3] * 3)
    tabla.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), VERDE_MUTE),
        ('BOX', (0, 0), (-1, -1), 0.5, GRIS_200),
        ('LINEAFTER', (0, 0), (-2, -1), 0.5, GRIS_200),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    return tabla


def _resumen_general(promedio_general):
    """Destaque del promedio general con insignia de resultado."""
    aprobado = isinstance(promedio_general, (int, float)) and promedio_general >= 6
    hay = isinstance(promedio_general, (int, float))
    color = VERDE if aprobado else ROJO
    estilo_numero = ParagraphStyle('pgnum', parent=ESTILOS['td_centro'],
                                   fontName=T.TITULO, fontSize=24, leading=27,
                                   textColor=color)
    estilo_numero_vacio = ParagraphStyle('pgnum0', parent=estilo_numero,
                                         textColor=GRIS_400, fontSize=18)
    estilo_titulo = ParagraphStyle('pgt', parent=ESTILOS['seccion'], fontSize=10)
    estilo_sub = ParagraphStyle('pgs', parent=ESTILOS['valor_chico'],
                                textColor=GRIS_600)
    estilo_badge = ParagraphStyle(
        'pgbadge', fontName=T.SANS_BD, fontSize=7.5, leading=10,
        textColor=BLANCO, backColor=color if hay else GRIS_400,
        alignment=1, borderPadding=(3, 8, 3, 8))

    badge_txt = ('APROBADO' if aprobado else 'REBAJADO') if hay else 'SIN DATOS'
    contenido_derecha = [
        P('PROMEDIO GENERAL', estilo_titulo),
        P('Calificación final del ciclo escolar', estilo_sub),
        Spacer(1, 5),
        Table([[P(badge_txt, estilo_badge)]], colWidths=[104],
              style=TableStyle([
                  ('LEFTPADDING', (0, 0), (-1, -1), 0),
                  ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                  ('TOPPADDING', (0, 0), (-1, -1), 0),
                  ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
              ])),
    ]
    tabla = Table(
        [[P(T.fmt_calificacion(promedio_general) if hay else '—',
            estilo_numero if hay else estilo_numero_vacio),
          contenido_derecha]],
        colWidths=[120, ANCHO_UTIL - 120])
    tabla.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GRIS_50),
        ('BOX', (0, 0), (-1, -1), 1.0, VERDE),
        ('LINEBEFORE', (1, 0), (1, 0), 0.5, GRIS_200),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (1, 0), (1, 0), 14),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    return tabla


def _caja_vacia():
    tabla = Table([[
        [P('El alumno no tiene calificaciones registradas en este ciclo.',
           ESTILOS['vacio']),
         Spacer(1, 3),
         P('Verifica el ciclo escolar seleccionado o realiza la captura de '
           'calificaciones desde la plataforma.', ESTILOS['nota'])]
    ]], colWidths=[ANCHO_UTIL])
    tabla.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GRIS_50),
        ('BOX', (0, 0), (-1, -1), 0.6, GRIS_200),
        ('TOPPADDING', (0, 0), (-1, -1), 16),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 16),
    ]))
    return tabla


def _notas_boleta():
    """Pie de información académica bajo el resumen."""
    estilo_nota = ParagraphStyle('nb', parent=ESTILOS['valor_chico'],
                                 fontSize=8, textColor=GRIS_600)
    estilo_nota_der = ParagraphStyle('nbd', parent=estilo_nota, alignment=2)
    tabla = Table([[
        P('Escala de calificación: 5.0 a 10.0 · Mínimo aprobatorio: 6.0',
          estilo_nota),
        P(f'Generado el {T.fecha_larga()} · Plataforma CECyTE', estilo_nota_der),
    ]], colWidths=[ANCHO_UTIL * 0.55, ANCHO_UTIL * 0.45], hAlign='LEFT')
    tabla.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, -1), 0.5, GRIS_200),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    return tabla


# ------------------------------------------------------------
def generar_boleta(payload):
    """Boleta de calificaciones (A4). Devuelve bytes PDF."""
    inst = payload.get('institucion') or {}
    alumno = payload.get('alumno') or {}
    materias = payload.get('materias') or []
    promedio_general = payload.get('promedioGeneral')
    promedios = payload.get('promediosParciales') or {}
    ciclo_nombre = alumno.get('ciclo_nombre')

    buffer = io.BytesIO()
    doc = _documento_pdf(buffer, inst, 'Boleta de calificaciones')
    decor = T.decoracion_pagina(inst)

    story = [
        T.encabezado_institucional(inst),
        Spacer(1, 8),
        T.banda_titulo('Boleta de calificaciones', ciclo_nombre),
        T.regla_acento(),
        Spacer(1, 12),
        _tarjeta_datos(alumno, ciclo_nombre),
        Spacer(1, 12),
    ]

    if materias:
        story += [
            T.chip_seccion('Reporte de calificaciones'),
            Spacer(1, 6),
            _tabla_calificaciones(materias),
            Spacer(1, 10),
            _cajas_parciales(promedios),
            Spacer(1, 10),
            _resumen_general(promedio_general),
            Spacer(1, 14),
            _notas_boleta(),
        ]
    else:
        story += [
            T.chip_seccion('Reporte de calificaciones'),
            Spacer(1, 6),
            _caja_vacia(),
            Spacer(1, 14),
            _notas_boleta(),
        ]

    story += [Spacer(1, 34)]
    story += T.bloque_firma(inst)
    story += [Spacer(1, 18),
              P('Este documento es un comprobante interno del '
                f"{inst.get('nombre', 'CECyTE Plantel 1')} y está sujeto a "
                'verificación en el sistema académico.', ESTILOS['nota'])]

    doc.build(story, onFirstPage=decor, onLaterPages=decor,
              canvasmaker=T.PaginasNumeradas)
    return buffer.getvalue()


# ------------------------------------------------------------
# Constancias
# ------------------------------------------------------------
TITULOS_CONSTANCIA = {
    'estudios': 'Constancia de estudios',
    'conducta': 'Constancia de buena conducta',
    'beca': 'Constancia de beca',
    'trabajo': 'Constancia de trabajo',
    'servicio_social': 'Constancia de servicio social',
    'practicas': 'Constancia de prácticas profesionales',
}

TEXTOS_INTRO = {
    'estudios': 'La Dirección del {inst} certifica que el siguiente alumno '
                'se encuentra inscrito en este ciclo escolar:',
    'conducta': 'La Dirección del {inst} certifica que el siguiente alumno '
                'cuenta con buena conducta:',
    'beca': 'La Dirección del {inst} certifica que el siguiente alumno '
            'cuenta con una beca asignada:',
    'trabajo': 'La Dirección del {inst} expide la presente constancia de '
               'trabajo a:',
    'servicio_social': 'La Dirección del {inst} certifica que el siguiente '
                       'alumno ha cumplido con el Servicio Social:',
    'practicas': 'La Dirección del {inst} certifica que el siguiente alumno '
                 'ha realizado Prácticas Profesionales:',
}

TEXTOS_FIN = {
    'estudios': 'Se expide la presente constancia para los fines legales e '
                'institucionales que al interesado convengan.',
    'conducta': 'Se expide la presente constancia de buena conducta para los '
                'fines que el interesado estime convenientes.',
    'beca': 'Se expide la presente constancia de beca para los fines que el '
            'interesado estime convenientes.',
    'trabajo': 'Se expide la presente constancia de trabajo para los fines '
               'que el interesado estime convenientes.',
    'servicio_social': 'Se expide la presente constancia de Servicio Social '
                       'para los fines que el interesado estime convenientes.',
    'practicas': 'Se expide la presente constancia de Prácticas '
                 'Profesionales para los fines que el interesado estime '
                 'convenientes.',
}


def _tabla_campos(alumno):
    """Listado etiqueta/valor con separadores suaves."""
    campos = [
        ('Nombre del alumno', f"{alumno.get('apellidos', '')}, {alumno.get('nombre', '')}"),
        ('Número de matrícula', alumno.get('matricula', '—')),
        ('Semestre actual', f"{alumno.get('semestre_actual', '—')}° Semestre"),
        ('Especialidad técnica', alumno.get('especialidad_nombre') or 'Sin especialidad'),
        ('Grupo asignado', alumno.get('grupo_nombre') or 'Sin grupo'),
    ]
    estilo_etq = ParagraphStyle('cetq', parent=ESTILOS['etiqueta'], fontSize=7.5)
    estilo_val = ParagraphStyle('cval', parent=ESTILOS['valor'], fontSize=10)
    filas = [[P(etq.upper(), estilo_etq), P(str(val), estilo_val)]
             for etq, val in campos]
    ancho_etq = 132
    tabla = Table(filas, colWidths=[ancho_etq, ANCHO_UTIL - ancho_etq],
                  hAlign='CENTER')
    estilo = [
        ('BACKGROUND', (0, 0), (-1, -1), GRIS_50),
        ('BOX', (0, 0), (-1, -1), 0.6, GRIS_200),
        ('LINEBELOW', (0, 0), (-1, -2), 0.4, GRIS_200),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    tabla.setStyle(TableStyle(estilo))
    return tabla


def _bloque_beca(beca):
    """Resaltado dorado con detalles de la beca."""
    monto = beca.get('monto')
    try:
        monto_txt = f"${float(monto):,.2f} MXN"
    except (TypeError, ValueError):
        monto_txt = '$0.00 MXN'
    estatus = str(beca.get('estatus', '') or '').upper()
    estilo_etq = ParagraphStyle('betq', parent=ESTILOS['etiqueta'],
                                textColor=DORADO, fontSize=7.5)
    estilo_val = ParagraphStyle('bval', parent=ESTILOS['valor'], fontSize=10)
    filas = [
        [P('BECA ASIGNADA', estilo_etq),
         P(str(beca.get('nombre_beca', '—')), estilo_val)],
        [P('MONTO ASIGNADO', estilo_etq), P(monto_txt, estilo_val)],
        [P('ESTATUS ACTUAL', estilo_etq), P(estatus or '—', estilo_val)],
    ]
    ancho_etq = 132
    tabla = Table(filas, colWidths=[ancho_etq, ANCHO_UTIL - ancho_etq],
                  hAlign='CENTER')
    tabla.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), T.DORADO_MUTE),
        ('BOX', (0, 0), (-1, -1), 0.7, DORADO),
        ('LINEBELOW', (0, 0), (-1, -2), 0.4, DORADO),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    return tabla


def generar_constancia(payload):
    """Constancia institucional (A4). Devuelve bytes PDF."""
    inst = payload.get('institucion') or {}
    alumno = payload.get('alumno') or {}
    tipo = payload.get('tipo') or 'estudios'
    beca = payload.get('becaData')
    nombre_inst = inst.get('nombre', 'CECyTE Plantel 1')

    titulo = TITULOS_CONSTANCIA.get(tipo, TITULOS_CONSTANCIA['estudios'])
    intro = TEXTOS_INTRO.get(tipo, TEXTOS_INTRO['estudios']).format(inst=nombre_inst)
    cierre = TEXTOS_FIN.get(tipo, TEXTOS_FIN['estudios'])

    estilo_intro = ParagraphStyle('cintro', parent=ESTILOS['cuerpo_constancia'],
                                  alignment=1, fontSize=10.5)

    buffer = io.BytesIO()
    doc = _documento_pdf(buffer, inst, titulo)
    decor = T.decoracion_pagina(inst)

    story = [
        T.encabezado_institucional(inst),
        Spacer(1, 8),
        T.banda_titulo(titulo, inst.get('sede')),
        T.regla_acento(),
        Spacer(1, 18),
        P(intro, estilo_intro),
        Spacer(1, 16),
        P(f"{alumno.get('apellidos', '')}, {alumno.get('nombre', '')}",
          ESTILOS['nombre_alumno_grande']),
        Spacer(1, 4),
        P('ALUMNO(A) QUE SE CERTIFICA', ParagraphStyle(
            'acert', parent=ESTILOS['etiqueta'], alignment=1)),
        Spacer(1, 12),
        _tabla_campos(alumno),
    ]

    if tipo == 'beca' and beca:
        story += [Spacer(1, 12), _bloque_beca(beca)]

    story += [
        Spacer(1, 18),
        P(cierre, ESTILOS['cierre_constancia']),
        Spacer(1, 58),
    ]
    story += T.bloque_firma(inst)
    story += [Spacer(1, 14),
              P('Este documento es un comprobante interno del '
                f'{nombre_inst} y está sujeto a verificación en el sistema '
                'académico.', ESTILOS['nota'])]

    doc.build(story, onFirstPage=decor, onLaterPages=decor,
              canvasmaker=T.PaginasNumeradas)
    return buffer.getvalue()





