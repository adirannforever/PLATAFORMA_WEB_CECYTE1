# ============================================================
# generador.py — Punto de entrada del motor de documentos.
# Uso (invocado por backend/src/utils/generadorPython.js):
#   python generador.py <documento>  < datos.json  > salida.bin
#   documentos: boleta | constancia | horario | listado |
#               estadisticas | asistencias
# Los bytes del documento se escriben en stdout; errores en stderr.
# ============================================================
import sys
import json
import traceback

import importlib


def _generador(nombre):
    return importlib.import_module(nombre)


def _configurar_stderr():
    try:
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass


def _leer_payload():
    return json.load(sys.stdin.buffer)


def main():
    _configurar_stderr()
    if len(sys.argv) != 2:
        print('Uso: python generador.py <documento>', file=sys.stderr)
        sys.exit(2)

    documento = sys.argv[1]
    try:
        payload = _leer_payload()

        if documento == 'boleta':
            salida = _generador('generador_pdf').generar_boleta(payload)
        elif documento == 'constancia':
            salida = _generador('generador_pdf').generar_constancia(payload)
        elif documento == 'horario':
            salida = _generador('generador_docx').generar_horario(payload)
        elif documento == 'listado':
            salida = _generador('generador_excel').generar_listado(payload)
        elif documento == 'estadisticas':
            salida = _generador('generador_excel').generar_estadisticas(payload)
        elif documento == 'asistencias':
            salida = _generador('generador_excel').generar_asistencias(payload)
        else:
            print(f'Documento desconocido: {documento}', file=sys.stderr)
            sys.exit(2)

        sys.stdout.buffer.write(salida)
        sys.stdout.buffer.flush()
    except SystemExit:
        raise
    except Exception:
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
