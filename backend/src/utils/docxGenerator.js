import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, AlignmentType, WidthType } from 'docx';

/**
 * Calcula periodos automáticamente a partir de hora de inicio, fin y duración de bloque
 */
const calcularPeriodos = (horaInicio, horaFin, duracionBloque) => {
  const horarios = [];
  const [h1, m1] = horaInicio.split(':').map(Number);
  const [h2, m2] = horaFin.split(':').map(Number);

  let actual = h1 * 60 + m1;
  const limite = h2 * 60 + m2;

  while (actual < limite) {
    const inicioStr = `${String(Math.floor(actual / 60)).padStart(2, '0')}:${String(actual % 60).padStart(2, '0')}`;
    actual += duracionBloque;
    const finStr = `${String(Math.floor(actual / 60)).padStart(2, '0')}:${String(actual % 60).padStart(2, '0')}`;
    horarios.push({ inicio: inicioStr, fin: finStr });
  }

  return horarios;
};

/**
 * Genera una plantilla DOCX de horario
 * @param {Object} data - Datos para la plantilla
 * @param {string} data.tipo - 'grupo', 'maestro' o 'laboratorio'
 * @param {string} data.nombre - Nombre del grupo/maestro/laboratorio
 * @param {string} data.semestre - Semestre (1-6)
 * @param {string} data.ciclo - Nombre del ciclo escolar
 * @param {string} data.especialidad - Especialidad
 * @param {string} data.turno - 'Matutino' o 'Vespertino'
 * @param {string} data.letra - Letra del grupo (A, B, C, D)
 * @param {Array} data.dias - Días de la semana (por defecto: Lunes a Viernes)
 * @param {Array} data.periodos - Array de objetos { inicio, fin, receso: boolean } (opcional)
 * @param {string} data.hora_inicio - Hora de inicio (solo si no se usa 'periodos')
 * @param {string} data.hora_fin - Hora de fin (solo si no se usa 'periodos')
 * @param {number} data.duracion_bloque - Duración de cada bloque en minutos (solo si no se usa 'periodos')
 */
export const generarPlantillaHorarioDOCX = async (data) => {
  const {
    tipo = 'grupo',
    nombre = '',
    semestre = '',
    ciclo = '',
    especialidad = '',
    turno = 'Matutino',
    letra = '',
    dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
    periodos = null,
    hora_inicio = '07:00',
    hora_fin = '14:10',
    duracion_bloque = 50,
  } = data;

  
  let horarios = [];
  if (periodos && Array.isArray(periodos) && periodos.length > 0) {
    horarios = periodos;
  } else {
    horarios = calcularPeriodos(hora_inicio, hora_fin, duracion_bloque);
    
    if (horarios.length === 0) {
      let inicio = 7 * 60;
      for (let i = 0; i < 7; i++) {
        const inicioStr = `${String(Math.floor(inicio / 60)).padStart(2, '0')}:${String(inicio % 60).padStart(2, '0')}`;
        inicio += duracion_bloque;
        const finStr = `${String(Math.floor(inicio / 60)).padStart(2, '0')}:${String(inicio % 60).padStart(2, '0')}`;
        horarios.push({ inicio: inicioStr, fin: finStr, receso: false });
      }
    } else {
      
      horarios = horarios.map(h => ({ ...h, receso: false }));
    }
  }

  
  const titulos = {
    grupo: `HORARIO DE GRUPO - ${nombre}`,
    maestro: `HORARIO DE MAESTRO - ${nombre}`,
    laboratorio: `HORARIO DE LABORATORIO - ${nombre}`,
  };

  const subtitulo = `Semestre: ${semestre}° · Ciclo: ${ciclo} · Especialidad: ${especialidad} · Turno: ${turno} · Grupo: ${nombre}`;

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          
          new Paragraph({
            children: [
              new TextRun({
                text: titulos[tipo] || titulos.grupo,
                bold: true,
                size: 28,
                color: "1A6B35",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          
          new Paragraph({
            children: [
              new TextRun({
                text: subtitulo,
                size: 20,
                color: "64748b",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
          }),
          
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
              insideVertical: { style: BorderStyle.SINGLE, size: 1 },
            },
            rows: [
              
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Hora",
                            bold: true,
                            size: 20,
                            color: "FFFFFF",
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    shading: { fill: "1A6B35" },
                    width: { size: 12, type: WidthType.PERCENTAGE },
                  }),
                  ...dias.map((dia) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: dia,
                              bold: true,
                              size: 20,
                              color: "FFFFFF",
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      shading: { fill: "1A6B35" },
                      width: { size: 17.6, type: WidthType.PERCENTAGE },
                    })
                  ),
                ],
              }),
              
              ...horarios.map((periodo, idx) => {
                const horaTexto = `${periodo.inicio} - ${periodo.fin}`;
                const esReceso = periodo.receso === true;

                return new TableRow({
                  children: [
                    
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: horaTexto,
                              size: 18,
                              bold: idx === 0 || esReceso,
                              color: esReceso ? "b91c1c" : "000000",
                            }),
                          ],
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                      shading: { fill: idx % 2 === 0 ? "F8FAFC" : "FFFFFF" },
                      width: { size: 12, type: WidthType.PERCENTAGE },
                    }),
                    
                    ...dias.map(() => {
                      let contenido = "";
                      let estilo = { size: 18, color: "000000" };

                      if (esReceso) {
                        contenido = "RECESO";
                        estilo = { size: 18, color: "b91c1c", bold: true };
                      }

                      return new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: contenido,
                                ...estilo,
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                        ],
                        shading: { fill: esReceso ? "FEE2E2" : (idx % 2 === 0 ? "F8FAFC" : "FFFFFF") },
                        width: { size: 17.6, type: WidthType.PERCENTAGE },
                      });
                    }),
                  ],
                });
              }),
            ],
          }),
          
          new Paragraph({
            children: [
              new TextRun({
                text: "",
                size: 10,
              }),
            ],
            spacing: { before: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Notas:",
                bold: true,
                size: 18,
                color: "1A6B35",
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "1. Este horario es de carácter informativo y puede estar sujeto a cambios.",
                size: 16,
                color: "64748b",
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "2. Para cualquier modificación, favor de dirigirse a la Coordinación Académica.",
                size: 16,
                color: "64748b",
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `3. Generado: ${new Date().toLocaleString('es-MX')}`,
                size: 14,
                color: "94a3b8",
              }),
            ],
            spacing: { before: 200 },
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
};