# ============================================================
# previsualizar.py — Genera muestras de todos los documentos
# con datos de ejemplo (uso de desarrollo, no forma parte del
# runtime del backend).
#
#   cd backend/python
#   python previsualizar.py
#
# Salida: backend/python/previsualizaciones/*.{pdf,docx,xlsx}
# Si PyMuPDF está instalado, además renderiza los PDF a PNG
# para revisión visual rápida.
# ============================================================
import os
import sys

import generador_pdf
import generador_docx
import generador_excel

INSTITUCION = {
    'nombre': 'CECyTE Plantel 1',
    'estado': 'Tabasco',
    'sede': 'Poblado Aquiles Serdán, Macuspana',
    'ciudad': 'Macuspana',
    'lema': 'Orgullo Lince',
}

ALUMNO = {
    'apellidos': 'Pérez López',
    'nombre': 'Juan Carlos',
    'matricula': '2024010001',
    'semestre_actual': 3,
    'grupo_nombre': '3° A',
    'especialidad_nombre': 'Programación',
    'ciclo_nombre': '2024-2025',
    'estatus': 'activo',
}

MATERIAS = [
    {'nombre': 'Matemáticas', 'parciales': [None, 8, 9, 7], 'promedio': 8.0},
    {'nombre': 'Programación', 'parciales': [None, 9, 9, 10], 'promedio': 9.3},
    {'nombre': 'Inglés', 'parciales': {'1': 7, '2': 8, '3': 8}, 'promedio': 7.7},
]

SALIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                      'previsualizaciones')


def main():
    os.makedirs(SALIDA, exist_ok=True)
    archivos = {}

    def guardar(nombre, datos):
        ruta = os.path.join(SALIDA, nombre)
        with open(ruta, 'wb') as f:
            f.write(datos)
        archivos[nombre] = ruta
        print(f'  ✔ {nombre} ({len(datos) // 1024} KB)')

    guardar('boleta.pdf', generador_pdf.generar_boleta({
        'institucion': INSTITUCION, 'alumno': ALUMNO, 'materias': MATERIAS,
        'promedioGeneral': 8.5,
        'promediosParciales': {'p1Prom': 8, 'p2Prom': 9, 'p3Prom': 8},
    }))
    for tipo in ('estudios', 'conducta', 'beca'):
        guardar(f'constancia_{tipo}.pdf', generador_pdf.generar_constancia({
            'institucion': INSTITUCION, 'alumno': ALUMNO, 'tipo': tipo,
            'becaData': ({'nombre_beca': 'Beca FE Tabasco', 'monto': 1500,
                          'estatus': 'activa'} if tipo == 'beca' else None),
        }))
    guardar('horario.docx', generador_docx.generar_horario({
        'institucion': INSTITUCION,
        'data': {'tipo': 'grupo', 'nombre': '3° A', 'semestre': 3,
                 'ciclo': '2024-2025', 'especialidad': 'Programación',
                 'turno': 'Matutino'},
    }))
    guardar('listado.xlsx', generador_excel.generar_listado({
        'institucion': INSTITUCION, 'alumnos': [ALUMNO],
    }))
    guardar('estadisticas.xlsx', generador_excel.generar_estadisticas({
        'institucion': INSTITUCION,
        'stats': [{'grupo_nombre': '3° A', 'grupo_letra': 'A',
                   'materia_nombre': 'Matemáticas', 'total_alumnos': 10,
                   'promedio_materia': 8.2, 'aprobados': 9, 'reprobados': 1}],
    }))
    guardar('asistencias.xlsx', generador_excel.generar_asistencias({
        'institucion': INSTITUCION,
        'info': {'materia_nombre': 'Programación', 'grupo_nombre': '3° A',
                 'grupo_letra': 'A', 'ciclo_nombre': '2024-2025',
                 'fecha': '2026-10-11'},
        'asistencias': [{'apellidos': 'Pérez López', 'nombre': 'Juan Carlos',
                         'matricula': '2024010001', 'estado': 'presente'}],
    }))

    try:
        import pymupdf
        for nombre, ruta in archivos.items():
            if nombre.endswith('.pdf'):
                doc = pymupdf.open(ruta)
                pix = doc[0].get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5))
                png = ruta.rsplit('.', 1)[0] + '.png'
                pix.save(png)
                print(f'  ✔ {os.path.basename(png)} (render)')
    except ImportError:
        print('  ℹ PyMuPDF no instalado → sin renders PNG '
              '(pip install pymupdf)')

    print(f'\nListos en: {SALIDA}')


if __name__ == '__main__':
    sys.exit(main())
