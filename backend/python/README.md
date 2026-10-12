# Motor de documentos CECyTE (Python)

Genera los documentos oficiales de la plataforma con estilo
institucional (paleta del frontend + normas del manual de identidad
CECyTE: Montserrat, márgenes 2 cm, membretes y constancias).

| Documento | Módulo | Salida |
|---|---|---|
| Boleta de calificaciones | `generador_pdf.py` (ReportLab) | PDF A4 |
| Constancias (estudios, conducta, beca, trabajo, servicio social, prácticas) | `generador_pdf.py` | PDF A4 |
| Plantilla de horario | `generador_docx.py` (python-docx) | DOCX Carta |
| Listado de alumnos | `generador_excel.py` (openpyxl) | XLSX |
| Estadísticas académicas | `generador_excel.py` | XLSX |
| Asistencias de clase | `generador_excel.py` | XLSX |

## Instalación

```bash
cd backend/python
pip install -r requirements.txt
```

Requiere Python 3.10+. El backend Node invoca este motor mediante
`src/utils/generadorPython.js` (variable `PYTHON_BIN` opcional para
elegir el binario; por defecto `python` en Windows y `python3` en Linux).

> **Despliegue:** el contenedor/servidor de producción necesita Python
> + estas dependencias. Ejemplo (Debian/Ubuntu):
> `apt-get install -y python3 python3-pip && pip3 install -r backend/python/requirements.txt`

## Uso directo (CLI)

```bash
python generador.py boleta < payload.json > boleta.pdf
```

El payload es JSON por stdin; los bytes del archivo van por stdout;
los errores por stderr con código de salida ≠ 0. La estructura exacta
de cada payload se documenta en cada función `generar_*`.

## Previsualización (desarrollo)

```bash
python previsualizar.py   # → previsualizaciones/*.pdf|docx|xlsx (+PNG si hay PyMuPDF)
```

## Design system (`tema.py`)

- **Paleta:** verde `#1A6B35` / `#0F4521` / `#E8F5ED`, dorado `#C8992A`,
  naranja `#F37238`, grises `#F8FAF9…#1E2E27` (idéntica al frontend).
- **Tipografía:** Montserrat (títulos, oficial CECyTE), Inter (datos/UI,
  misma que la plataforma), Merriweather Italic (fechas/cierres).
- **Fuentes TTF** incluidas en `backend/assets/fonts/` (OFL); si no
  existen, se cae a las base-14 de ReportLab.
- **Logo:** `backend/src/assets/logo_cecyte.png` (RGBA, transparente).
