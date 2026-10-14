import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { INSTITUCION } from '../config/institucion';
import { INSTITUCION_LEGAL } from '../config/legal';
import {
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Home,
  BookOpen,
  Info,
  Phone,
  LogIn,
  LogOut,
  GraduationCap,
  Building2,
  Trophy,
  Palette,
  Cpu,
  FlaskConical,
  Users,
  Megaphone,
  HelpCircle,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Loader2,
  Quote,
  Mail,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { publicService } from '../services/api';
import ComunicadoAttachments from '../components/ComunicadoAttachments';
import { relativeDate } from '../utils/format';
import logoCecyte from '../assets/logo_cecyte.png';
import styles from './LandingPage.module.css';

// ============================================================
// DATOS
// ============================================================

const slidesData = [
  {
    id: 1,
    img: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1200&q=80',
    title: 'Excelencia Académica y Tecnológica',
    subtitle: `${INSTITUCION.nombre} · ${INSTITUCION.sede}`,
    badge: 'Orgullo Lince',
  },
  {
    id: 2,
    img: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80',
    title: 'Talleres y Laboratorios Equipados',
    subtitle: 'Prácticas profesionales para el futuro',
    badge: 'Innovación',
  },
  {
    id: 3,
    img: 'https://images.unsplash.com/photo-1523050854058-8df90110c7f1?auto=format&fit=crop&w=1200&q=80',
    title: 'Comunidad Estudiantil Actitud Lince',
    subtitle: 'Formando a los líderes técnicos del mañana en Tabasco',
    badge: 'Comunidad',
  },
  {
    id: 4,
    img: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=1200&q=80',
    title: 'Infraestructura de Vanguardia',
    subtitle: 'Espacios diseñados para el aprendizaje integral',
    badge: 'Infraestructura',
  },
  {
    id: 5,
    img: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80',
    title: 'Eventos y Convivencia Escolar',
    subtitle: 'Fomentando la integración y el compañerismo',
    badge: 'Convivencia',
  },
];

const especialidadesData = [
  {
    id: 'grafico',
    titulo: 'Técnico en Diseño Gráfico Digital',
    badge: 'Creatividad & Multimedia',
    img: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80',
    descripcion:
      'Formación enfocada en la comunicación visual, manejo de software de edición profesional, ilustración digital, animación y diseño publicitario moderno.',
    perfilAspirante:
      'Interés por las artes visuales, la creatividad, la fotografía, el dibujo digital y el dominio de herramientas tecnológicas de diseño.',
    perfilEgresado:
      'Capaz de desarrollar proyectos gráficos para medios impresos y digitales, identidad corporativa, ilustración multimedia y material publicitario para empresas o emprendimientos.',
    icon: Palette,
  },
  {
    id: 'electronica',
    titulo: 'Técnico en Electrónica',
    badge: 'Innovación & Hardware',
    img: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80',
    descripcion:
      'Estudio y aplicación de circuitos eléctricos, sistemas analógicos y digitales, microcontroladores y mantenimiento preventivo/correctivo de equipos electrónicos.',
    perfilAspirante:
      'Gusto por la física, las matemáticas, el armado de circuitos, la lógica computacional y la resolución analítica de problemas técnicos.',
    perfilEgresado:
      'Competente en la instalación, diagnóstico, reparación y automatización de sistemas electrónicos, tarjetas de control y dispositivos tecnológicos industriales.',
    icon: Cpu,
  },
  {
    id: 'alimentos',
    titulo: 'Técnico en Producción Industrial de Alimentos',
    badge: 'Calidad & Procesos',
    img: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=600&q=80',
    descripcion:
      'Procesamiento, conservación, análisis químico-bromatológico y control de calidad en la industria alimentaria bajo estrictas normativas de higiene y seguridad.',
    perfilAspirante:
      'Curiosidad por los procesos químicos de los alimentos, la bioseguridad, la inocuidad alimentaria y el trabajo metódico en laboratorios.',
    perfilEgresado:
      'Preparado para supervisar líneas de producción de alimentos, aplicar normativas de sanidad, realizar controles de calidad y liderar procesos de conservación alimentaria.',
    icon: FlaskConical,
  },
];

// ============================================================
// DATOS AUXILIARES — secciones plataforma (estáticos, sin PII)
// ============================================================

const plataformaRolesData = [
  {
    id: 'aspirante',
    titulo: 'Aspirantes',
    descripcion: 'Tu puerta de entrada: conoce la oferta, sigue los pasos de admisión y mantente al tanto de los avisos.',
    puntos: ['Oferta educativa y perfiles', 'Pasos de admisión 1-2-3-4', 'Avisos públicos del plantel'],
    cta: { etiqueta: 'Ver admisión', href: '#admision' },
  },
  {
    id: 'alumno',
    titulo: 'Alumnos',
    descripcion: 'Tu vida académica en un solo lugar: calificaciones, horarios, pagos, becas y tu expediente.',
    puntos: ['Mis calificaciones y grupos', 'Horarios, pagos y becas', 'Expediente y servicio social'],
    cta: { etiqueta: 'Iniciar sesión', href: '/login' },
  },
  {
    id: 'docente',
    titulo: 'Docentes',
    descripcion: 'Tus clases bajo control: asistencia, calificaciones, incidencias y comunicación con tus grupos.',
    puntos: ['Mis clases y asistencias', 'Calificaciones por parcial', 'Incidencias y comunicados'],
    cta: { etiqueta: 'Entrar al panel', href: '/login' },
  },
];

const admisionPasosData = [
  {
    n: 1,
    titulo: 'Pre-registro',
    texto: 'Haz tu pre-registro en línea (recibes tu folio al instante) y reúne tus documentos: acta, CURP y comprobante de estudios.',
  },
  {
    n: 2,
    titulo: 'Ficha',
    texto: 'Solicita tu ficha de admisión en control escolar dentro de las fechas del ciclo activo.',
  },
  {
    n: 3,
    titulo: 'Examen',
    texto: 'Presenta tu examen de admisión y mantente atento a los avisos de resultados.',
  },
  {
    n: 4,
    titulo: 'Inscripción',
    texto: 'Completa tu inscripción, conoce tu grupo y accede a la plataforma con tu cuenta.',
  },
];

const rolIcons = { aspirante: ClipboardList, alumno: GraduationCap, docente: BookOpen };

const requisitosData = [
  'Acta de nacimiento (original y copia)',
  'CURP vigente',
  'Certificado de secundaria o equivalente',
  '6 fotografías tamaño infantil',
  'Comprobante de domicilio',
];

const faqData = [
  {
    pregunta: '¿Necesito una cuenta para ver los avisos?',
    respuesta: 'No. Los avisos públicos del plantel se muestran en esta página sin iniciar sesión. Tu cuenta la necesitarás una vez que seas alumno, docente o administrador.',
  },
  {
    pregunta: '¿Cómo entro a la plataforma si ya soy alumno o docente?',
    respuesta: 'Usa el botón “Iniciar sesión” con tu correo institucional. Si tienes problemas de acceso, contacta a control escolar o al administrador del plantel.',
  },
  {
    pregunta: '¿Qué puedo hacer dentro de la plataforma?',
    respuesta: 'Alumnos: ver calificaciones, horarios, pagos, becas y expediente. Docentes: pasar asistencia, registrar calificaciones e incidencias de sus clases. Aspirantes: consultar oferta y pasos de admisión desde aquí.',
  },
  {
    pregunta: '¿Dónde veo becas, pagos o servicio social?',
    respuesta: 'Esos módulos viven dentro del panel (requieren sesión). Esta página te muestra el camino; el detalle está tras “Iniciar sesión” según tu rol.',
  },
  {
    pregunta: '¿Cómo hago mi pre-registro y qué es el folio?',
    respuesta: 'En la sección “Admisión” está el formulario “Pre-registro en línea”. Al enviarlo recibes al instante un folio (ej. ASP-123456): guárdalo y acude a Control Escolar para tu ficha de admisión.',
  },
];

// Voces de la comunidad (contenido demo, sin datos personales reales).
const testimoniosData = [
  {
    texto: 'Desde primer semestre reviso mis calificaciones y los avisos del plantel en la plataforma. Todo está en un solo lugar y ya no se me pasan fechas.',
    autor: 'Daniela M.',
    rol: 'Alumna · 6to semestre, Diseño Gráfico Digital',
  },
  {
    texto: 'Los talleres y el apoyo de mis docentes me dieron la base técnica que necesitaba para trabajar desde el primer día como técnico en electrónica.',
    autor: 'Miguel A.',
    rol: 'Egresado · Electrónica',
  },
  {
    texto: 'El proceso de admisión fue claro: hice el pre-registro en línea, obtuve mi folio y en Control Escolar me siguieron paso a paso hasta la inscripción.',
    autor: 'Laura R.',
    rol: 'Madre de familia',
  },
];

// Avisos de respaldo (si el API público no responde, la landing jamás se rompe).
const avisosFallback = [
  {
    id: 'fb-1',
    titulo: 'Bienvenida al ciclo escolar',
    contenido: 'Les damos la bienvenida al nuevo ciclo escolar. Éxito en sus estudios.',
    fecha_publicacion: null,
  },
  {
    id: 'fb-2',
    titulo: 'Fichas de admisión',
    contenido: 'Mantente atento a las fechas de fichas de admisión publicadas por control escolar.',
    fecha_publicacion: null,
  },
  {
    id: 'fb-3',
    titulo: 'Evaluaciones parciales',
    contenido: 'Recuerda revisar el calendario de evaluaciones parciales de cada mes.',
    fecha_publicacion: null,
  },
];

// ============================================================
// COMPONENTES INTERNOS
// ============================================================

const DrawerLink = ({ href, icon: Icon, children, onClick }) => (
  <a href={href} onClick={onClick} className={styles.drawerLink}>
    <Icon size={20} />
    <span>{children}</span>
  </a>
);

// ============================================================
// PÁGINA PRINCIPAL
// ============================================================

export default function LandingPage() {
  const { usuario } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [especialidadSeleccionada, setEspecialidadSeleccionada] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [avisos, setAvisos] = useState([]);
  const [avisosEstado, setAvisosEstado] = useState('cargando'); // cargando | listo | respaldo
  const [resumen, setResumen] = useState(null);
  const [avisosAgotados, setAvisosAgotados] = useState(false);
  const [faqAbierta, setFaqAbierta] = useState(0);
  // Pre-registro público (C): catálogos + estados del formulario
  const [catalogos, setCatalogos] = useState({ especialidades: [], turnos: [] });
  const [catalogosEstado, setCatalogosEstado] = useState('cargando'); // cargando | listo | error
  const [preEstado, setPreEstado] = useState('idle'); // idle | enviando | exito | error
  const [preMensaje, setPreMensaje] = useState('');
  const [preFolio, setPreFolio] = useState('');
  const [preForm, setPreForm] = useState({
    nombre: '',
    apellidos: '',
    curp: '',
    email: '',
    telefono: '',
    especialidad_id: '',
    turno_preferido_id: '',
    website: '',
  });
  const slideIntervalRef = useRef(null);
  const carouselRef = useRef(null);

  const urlMap = 'https://maps.app.goo.gl/u54L7i59feWDZPcEA';

  // ===== Carrusel =====
  const goToSlide = useCallback(
    (index) => {
      if (isTransitioning || index === currentSlide) return;
      setIsTransitioning(true);
      setCurrentSlide(index);
      setTimeout(() => setIsTransitioning(false), 600);
    },
    [isTransitioning, currentSlide]
  );

  const goToNextSlide = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide((prev) => (prev + 1) % slidesData.length);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning]);

  const goToPrevSlide = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide((prev) => (prev - 1 + slidesData.length) % slidesData.length);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning]);

  const startAutoSlide = useCallback(() => {
    if (slideIntervalRef.current) clearInterval(slideIntervalRef.current);
    slideIntervalRef.current = setInterval(goToNextSlide, 6000);
  }, [goToNextSlide]);

  useEffect(() => {
    startAutoSlide();
    return () => clearInterval(slideIntervalRef.current);
  }, [startAutoSlide]);

  const handleMouseEnter = () => {
    clearInterval(slideIntervalRef.current);
  };

  const handleMouseLeave = () => {
    startAutoSlide();
  };

  // ===== Pre-registro público: envío del formulario =====
  const enviarPreRegistro = async (e) => {
    e.preventDefault();
    if (preEstado === 'enviando') return;
    setPreEstado('enviando');
    setPreMensaje('');
    try {
      const res = await publicService.preRegistro({
        ...preForm,
        especialidad_id: Number(preForm.especialidad_id),
        turno_preferido_id: Number(preForm.turno_preferido_id),
      });
      setPreFolio(res?.data?.folio || '');
      setPreEstado('exito');
    } catch (err) {
      setPreMensaje(err.message || 'No se pudo enviar tu pre-registro. Intenta de nuevo.');
      setPreEstado('error');
    }
  };

  // ===== Avisos: ampliar el feed público (máx. 12) =====
  const ampliarAvisos = async () => {
    try {
      const res = await publicService.getAvisos(12);
      const lista = Array.isArray(res?.data) ? res.data : [];
      if (lista.length <= avisos.length) {
        setAvisosAgotados(true);
        return;
      }
      setAvisos(lista);
    } catch {
      setAvisosAgotados(true);
    }
  };

  // ===== Escape para cerrar drawer =====
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && menuAbierto) setMenuAbierto(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [menuAbierto]);

  // ===== Avisos públicos + resumen (B: live data con fallback estático) =====
  useEffect(() => {
    let viva = true;
    const cargar = async () => {
      try {
        const [avisosRes, resumenRes] = await Promise.all([
          publicService.getAvisos(6),
          publicService.getResumen().catch(() => null),
        ]);
        if (!viva) return;
        const lista = Array.isArray(avisosRes?.data) ? avisosRes.data : [];
        setAvisos(lista.length > 0 ? lista : avisosFallback);
        setAvisosEstado(lista.length > 0 ? 'listo' : 'respaldo');
        if (resumenRes?.data) setResumen(resumenRes.data);
      } catch {
        if (!viva) return;
        setAvisos(avisosFallback);
        setAvisosEstado('respaldo');
      }
    };
    cargar();
    return () => { viva = false; };
  }, []);

  // ===== Catálogos públicos del pre-registro (especialidades + turnos) =====
  useEffect(() => {
    let viva = true;
    publicService
      .getCatalogos()
      .then((res) => {
        if (!viva) return;
        setCatalogos({
          especialidades: Array.isArray(res?.data?.especialidades) ? res.data.especialidades : [],
          turnos: Array.isArray(res?.data?.turnos) ? res.data.turnos : [],
        });
        setCatalogosEstado('listo');
      })
      .catch(() => {
        if (!viva) return;
        setCatalogosEstado('error');
      });
    return () => { viva = false; };
  }, []);

  // ===== Cerrar drawer al hacer scroll =====
  useEffect(() => {
    const handleScroll = () => {
      if (menuAbierto) setMenuAbierto(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [menuAbierto]);

  return (
    <div className={styles.pageWrapper}>
      {/* Accesibilidad: salto directo al contenido (teclado) */}
      <a href="#contenido-principal" className={styles.skipLink}>
        Saltar al contenido principal
      </a>

      {/* ===== Botón hamburguesa fijo ===== */}
      <button
        className={styles.fixedHamburger}
        onClick={() => setMenuAbierto(true)}
        aria-label="Abrir menú de navegación"
      >
        <Menu size={24} strokeWidth={2.5} />
      </button>

      {/* ===== Drawer (menú lateral) ===== */}
      {menuAbierto && (
        <div className={styles.drawerOverlay} onClick={() => setMenuAbierto(false)}>
          <nav className={styles.drawerMenu} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <span className={styles.drawerTitle}>Navegación</span>
              <button
                onClick={() => setMenuAbierto(false)}
                className={styles.closeDrawerBtn}
                aria-label="Cerrar menú"
              >
                <X size={24} />
              </button>
            </div>

            <DrawerLink href="#carrusel" icon={Home} onClick={() => setMenuAbierto(false)}>
              Inicio / Galería
            </DrawerLink>
            <DrawerLink href="#oferta" icon={BookOpen} onClick={() => setMenuAbierto(false)}>
              Oferta Educativa
            </DrawerLink>
            <DrawerLink href="#plataforma" icon={Users} onClick={() => setMenuAbierto(false)}>
              La Plataforma
            </DrawerLink>
            <DrawerLink href="#admision" icon={ClipboardList} onClick={() => setMenuAbierto(false)}>
              Admisión
            </DrawerLink>
            <DrawerLink href="#avisos" icon={Megaphone} onClick={() => setMenuAbierto(false)}>
              Avisos
            </DrawerLink>
            <DrawerLink href="#generalidades" icon={Info} onClick={() => setMenuAbierto(false)}>
              Acerca del Plantel
            </DrawerLink>
            <DrawerLink href="#testimonios" icon={Trophy} onClick={() => setMenuAbierto(false)}>
              Testimonios
            </DrawerLink>
            <DrawerLink href="#faq" icon={HelpCircle} onClick={() => setMenuAbierto(false)}>
              Preguntas Frecuentes
            </DrawerLink>
            <DrawerLink href="#contacto" icon={Phone} onClick={() => setMenuAbierto(false)}>
              Contacto
            </DrawerLink>

            <Link
              to={usuario ? '/dashboard' : '/login'}
              className={styles.drawerLoginBtn}
              onClick={() => setMenuAbierto(false)}
            >
              {usuario ? (
                <>
                  <LogOut size={20} />
                  Entrar al Sistema →
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Iniciar Sesión en el Portal
                </>
              )}
            </Link>
          </nav>
        </div>
      )}

      {/* ===== Header ===== */}
      <header className={styles.topHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerBrandInfo}>
            <img
              src={logoCecyte}
              alt="Logo CECyTE"
              className={styles.headerLogoImg}
              loading="lazy"
            />
            <div className={styles.headerTitles}>
              <h1>{INSTITUCION.nombre}</h1>
              <span>{INSTITUCION.ciudad}, {INSTITUCION.estado} · Aquiles Serdán</span>
            </div>
          </div>
          <nav className={styles.topNav} aria-label="Secciones del portal">
            <a href="#carrusel">Inicio</a>
            <a href="#oferta">Oferta</a>
            <a href="#plataforma">Plataforma</a>
            <a href="#admision">Admisión</a>
            <a href="#avisos">Avisos</a>
            <a href="#faq">FAQ</a>
            <a href="#contacto">Contacto</a>
          </nav>
          <div className={styles.headerAction}>
            <Link to={usuario ? '/dashboard' : '/login'} className={styles.headerLoginBtn}>
              {usuario ? (
                <>
                  <LogOut size={18} />
                  Entrar al Sistema →
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Iniciar Sesión
                </>
              )}
            </Link>
          </div>
        </div>
      </header>

      <main id="contenido-principal" className={styles.mainContent}>
      <section
        id="carrusel"
        className={styles.carouselSection}
        ref={carouselRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={styles.carouselContainer}>
          {slidesData.map((slide, index) => (
            <div
              key={slide.id}
              className={`${styles.slideItem} ${index === currentSlide ? styles.slideActive : ''}`}
              style={{
                backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 100%), url(${slide.img})`,
                transform: `translateX(${(index - currentSlide) * 100}%)`,
                transition: 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              }}
            >
              <div className={styles.slideCaption}>
                {slide.badge && <span className={styles.slideBadge}>{slide.badge}</span>}
                <h2>{slide.title}</h2>
                <p>{slide.subtitle}</p>
              </div>
            </div>
          ))}

          <button
            className={`${styles.carouselArrow} ${styles.arrowLeft}`}
            onClick={goToPrevSlide}
            aria-label="Diapositiva anterior"
          >
            <ChevronLeft size={32} strokeWidth={2.5} />
          </button>
          <button
            className={`${styles.carouselArrow} ${styles.arrowRight}`}
            onClick={goToNextSlide}
            aria-label="Diapositiva siguiente"
          >
            <ChevronRight size={32} strokeWidth={2.5} />
          </button>

          <div className={styles.carouselDots}>
            {slidesData.map((_, index) => (
              <button
                key={index}
                className={`${styles.carouselDot} ${index === currentSlide ? styles.carouselDotActive : ''}`}
                onClick={() => goToSlide(index)}
                aria-label={`Ir a diapositiva ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ===== Hero CTA + confianza ===== */}
      <section className={styles.heroCtaBar} aria-label="Acciones rápidas">
        <div className={styles.heroCtaInner}>
          <div className={styles.heroCtaText}>
            <h2>Tu escuela, también en línea</h2>
            <p>
              Avisos públicos, oferta educativa y una plataforma completa para aspirantes,
              alumnos y docentes.
            </p>
          </div>
          <div className={styles.heroCtaActions}>
            <Link to={usuario ? '/dashboard' : '/login'} className={styles.heroCtaPrimary}>
              <LogIn size={18} />
              {usuario ? 'Ir a mi panel' : 'Iniciar sesión'}
            </Link>
            <a href="#admision" className={styles.heroCtaSecondary}>
              <ClipboardList size={18} />
              Proceso de admisión
            </a>
          </div>
        </div>
        <ul className={styles.trustChips} aria-label="Datos del ciclo escolar">
          <li><strong>{resumen?.especialidades ?? '—'}</strong> especialidades</li>
          <li><strong>{resumen?.grupos_activos ?? '—'}</strong> grupos activos</li>
          <li><strong>{resumen?.ciclo_activo ?? '2026-2027'}</strong> ciclo escolar</li>
        </ul>
      </section>

      {/* ===== Avisos públicos (en vivo con respaldo) ===== */}
      <section id="avisos" className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}><Megaphone size={16} /> Avisos</span>
          <h2>Lo último del plantel</h2>
          <p>Publicaciones oficiales visibles para todos, sin necesidad de cuenta.</p>
        </div>

        {avisosEstado === 'cargando' ? (
          <div className={styles.avisosGrid} aria-busy="true" aria-label="Cargando avisos">
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.avisoCardSkeleton}>
                <span className={styles.skeletonBar} style={{ width: '40%' }} />
                <span className={styles.skeletonBar} style={{ width: '80%' }} />
                <span className={styles.skeletonBar} style={{ width: '60%' }} />
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.avisosGrid}>
            {avisos.map((aviso) => (
              <article key={aviso.id} className={styles.avisoCard}>
                <div className={styles.avisoMeta}>
                  <Megaphone size={16} aria-hidden="true" />
                  <time dateTime={aviso.fecha_publicacion || undefined}>
                    {aviso.fecha_publicacion ? relativeDate(aviso.fecha_publicacion) : 'Reciente'}
                  </time>
                </div>
                <h3>{aviso.titulo}</h3>
                <p>{aviso.contenido}</p>
                <ComunicadoAttachments comunicadoId={aviso.id} archivos={aviso.archivos} publico />
              </article>
            ))}
          </div>
        )}
        {avisosEstado === 'listo' && !avisosAgotados && avisos.length >= 6 && (
          <div className={styles.avisosMore}>
            <button type="button" className={styles.avisosMoreBtn} onClick={ampliarAvisos}>
              Ver más avisos
            </button>
          </div>
        )}
        {avisosEstado === 'respaldo' && (
          <p className={styles.avisoNota} role="status">
            Mostrando avisos de referencia — el servicio público no respondió.
          </p>
        )}
      </section>

      {/* ===== Oferta Educativa ===== */}
      <section id="oferta" className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <h2>Nuestra Oferta Educativa</h2>
          <p>Selecciona una especialidad para conocer los detalles, perfil de aspirante y perfil de egreso.</p>
        </div>

        <div className={styles.specialtiesGrid}>
          {especialidadesData.map((esp) => {
            const Icon = esp.icon;
            const isSelected = especialidadSeleccionada?.id === esp.id;
            return (
              <div
                key={esp.id}
                className={`${styles.specialtyCard} ${isSelected ? styles.cardActive : ''}`}
                onClick={() => setEspecialidadSeleccionada(esp)}
              >
                <div className={styles.cardHeaderIndicator} />
                <span className={styles.espBadge}>{esp.badge}</span>
                <Icon size={36} strokeWidth={1.5} className={styles.specialtyIcon} />
                <h3>{esp.titulo}</h3>
                <p>{esp.descripcion.substring(0, 90)}…</p>
                <span className={styles.clickPrompt}>Ver detalles completos →</span>
              </div>
            );
          })}
        </div>

        {/* Modal */}
        {especialidadSeleccionada && (
          <div className={styles.modalOverlay} onClick={() => setEspecialidadSeleccionada(null)}>
            <div className={styles.expandedCardModal} onClick={(e) => e.stopPropagation()}>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setEspecialidadSeleccionada(null)}
                aria-label="Cerrar detalles"
              >
                <X size={24} strokeWidth={2.5} />
              </button>

              <div className={styles.modalHeader}>
                <span className={styles.espBadgeModal}>{especialidadSeleccionada.badge}</span>
                <h2>{especialidadSeleccionada.titulo}</h2>
              </div>

              <div className={styles.modalBodyScroll}>
                <div className={styles.modalContentGrid}>
                  <img
                    src={especialidadSeleccionada.img}
                    alt={especialidadSeleccionada.titulo}
                    className={styles.modalImg}
                    loading="lazy"
                  />
                  <div className={styles.modalTexts}>
                    <div className={styles.infoBlock}>
                      <h4>
                        <BookOpen size={18} className={styles.infoIcon} />
                        Descripción General
                      </h4>
                      <p>{especialidadSeleccionada.descripcion}</p>
                    </div>
                    <div className={styles.infoBlock}>
                      <h4>
                        <GraduationCap size={18} className={styles.infoIcon} />
                        Perfil de Aspirante
                      </h4>
                      <p>{especialidadSeleccionada.perfilAspirante}</p>
                    </div>
                    <div className={styles.infoBlock}>
                      <h4>
                        <Trophy size={18} className={styles.infoIcon} />
                        Perfil de Egresado
                      </h4>
                      <p>{especialidadSeleccionada.perfilEgresado}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ===== Tu plataforma (por rol) ===== */}
      <section id="plataforma" className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}><Users size={16} /> Plataforma</span>
          <h2>Un sistema para toda la comunidad escolar</h2>
          <p>Esto es lo que encontrarás dentro según tu rol:</p>
        </div>

        <div className={styles.rolesGrid}>
          {plataformaRolesData.map((rol) => {
            const Icon = rolIcons[rol.id] ?? Users;
            const esInterno = rol.cta.href.startsWith('#');
            return (
              <div key={rol.id} className={styles.rolCard}>
                <div className={styles.rolIconWrap} aria-hidden="true">
                  <Icon size={28} strokeWidth={1.75} />
                </div>
                <h3>{rol.titulo}</h3>
                <p>{rol.descripcion}</p>
                <ul className={styles.rolPuntos}>
                  {rol.puntos.map((p) => (
                    <li key={p}>
                      <CheckCircle2 size={15} aria-hidden="true" />
                      {p}
                    </li>
                  ))}
                </ul>
                {esInterno ? (
                  <a href={rol.cta.href} className={styles.rolCta}>{rol.cta.etiqueta} →</a>
                ) : (
                  <Link to={rol.cta.href} className={styles.rolCta}>{rol.cta.etiqueta} →</Link>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== Admisión ===== */}
      <section id="admision" className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}><ClipboardList size={16} /> Admisión</span>
          <h2>¿Cómo ingreso? En 4 pasos</h2>
          <p>El proceso completo, de la exploración de especialidades a tu cuenta en la plataforma.</p>
        </div>

        <ol className={styles.pasosGrid}>
          {admisionPasosData.map((paso) => (
            <li key={paso.n} className={styles.pasoCard}>
              <span className={styles.pasoNum} aria-hidden="true">{paso.n}</span>
              <h3>{paso.titulo}</h3>
              <p>{paso.texto}</p>
            </li>
          ))}
        </ol>

        <div className={styles.requisitosBox}>
          <h3>
            <CheckCircle2 size={20} aria-hidden="true" />
            Documentos que necesitas
          </h3>
          <ul>
            {requisitosData.map((doc) => (
              <li key={doc}>{doc}</li>
            ))}
          </ul>
          <a href="#contacto" className={styles.requisitosCta}>
            ¿Dudas? Contáctanos →
          </a>
        </div>

        {/* ===== Pre-registro público (paso 1) ===== */}
        <div className={styles.preRegistroBox} id="pre-registro">
          <div className={styles.preRegistroHead}>
            <h3>
              <ClipboardList size={20} aria-hidden="true" />
              Paso 1 · Pre-registro en línea
            </h3>
            <p>
              Llena tus datos y recibe tu folio al instante. Con él acude a Control Escolar
              para continuar con tu ficha de admisión.
            </p>
          </div>

          {preEstado === 'exito' ? (
            <div className={styles.preExito} role="status">
              <CheckCircle2 size={28} aria-hidden="true" />
              <div>
                <strong>¡Pre-registro recibido!</strong>
                <p>
                  Tu folio es <span className={styles.preFolio}>{preFolio}</span>. Guárdalo:
                  es tu referencia para dar seguimiento en Control Escolar.
                </p>
                <p className={styles.preExitoNota}>
                  Siguiente paso: solicita tu ficha de admisión (paso 2) dentro de las fechas del ciclo activo.
                </p>
              </div>
            </div>
          ) : (
            <form className={styles.preForm} onSubmit={enviarPreRegistro}>
              <div className={styles.preCampo}>
                <label htmlFor="pre-nombre">Nombre(s)</label>
                <input
                  id="pre-nombre"
                  name="nombre"
                  type="text"
                  maxLength={100}
                  autoComplete="given-name"
                  required
                  value={preForm.nombre}
                  onChange={(e) => setPreForm({ ...preForm, nombre: e.target.value })}
                />
              </div>
              <div className={styles.preCampo}>
                <label htmlFor="pre-apellidos">Apellidos</label>
                <input
                  id="pre-apellidos"
                  name="apellidos"
                  type="text"
                  maxLength={150}
                  autoComplete="family-name"
                  required
                  value={preForm.apellidos}
                  onChange={(e) => setPreForm({ ...preForm, apellidos: e.target.value })}
                />
              </div>
              <div className={styles.preCampo}>
                <label htmlFor="pre-curp">CURP</label>
                <input
                  id="pre-curp"
                  name="curp"
                  type="text"
                  minLength={18}
                  maxLength={18}
                  pattern="[A-Za-zÑñ]{4}[0-9]{6}[HM][A-Za-zÑñ]{5}[A-Za-z0-9]{2}"
                  title="Ejemplo: GPAE010101MDFRRR01 (18 caracteres)"
                  required
                  value={preForm.curp}
                  onChange={(e) => setPreForm({ ...preForm, curp: e.target.value.toUpperCase() })}
                />
              </div>
              <div className={styles.preCampo}>
                <label htmlFor="pre-email">Correo electrónico</label>
                <input
                  id="pre-email"
                  name="email"
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  required
                  value={preForm.email}
                  onChange={(e) => setPreForm({ ...preForm, email: e.target.value })}
                />
              </div>
              <div className={styles.preCampo}>
                <label htmlFor="pre-telefono">Teléfono (opcional)</label>
                <input
                  id="pre-telefono"
                  name="telefono"
                  type="tel"
                  maxLength={20}
                  autoComplete="tel"
                  value={preForm.telefono}
                  onChange={(e) => setPreForm({ ...preForm, telefono: e.target.value })}
                />
              </div>
              <div className={styles.preCampo}>
                <label htmlFor="pre-especialidad">Especialidad de interés</label>
                <select
                  id="pre-especialidad"
                  name="especialidad_id"
                  required
                  disabled={catalogosEstado !== 'listo'}
                  value={preForm.especialidad_id}
                  onChange={(e) => setPreForm({ ...preForm, especialidad_id: e.target.value })}
                >
                  <option value="">
                    {catalogosEstado === 'error' ? 'No disponible' : 'Cargando...'}
                  </option>
                  {catalogos.especialidades.map((esp) => (
                    <option key={esp.id} value={esp.id}>
                      {esp.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.preCampo}>
                <label htmlFor="pre-turno">Turno preferido</label>
                <select
                  id="pre-turno"
                  name="turno_preferido_id"
                  required
                  disabled={catalogosEstado !== 'listo'}
                  value={preForm.turno_preferido_id}
                  onChange={(e) => setPreForm({ ...preForm, turno_preferido_id: e.target.value })}
                >
                  <option value="">
                    {catalogosEstado === 'error' ? 'No disponible' : 'Cargando...'}
                  </option>
                  {catalogos.turnos.map((turno) => (
                    <option key={turno.id} value={turno.id}>
                      {turno.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Honeypot anti-bots: invisible para humanos y lectores de pantalla */}
              <div className={styles.preHoneypot} aria-hidden="true">
                <label htmlFor="pre-website">No completar este campo</label>
                <input
                  id="pre-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={preForm.website}
                  onChange={(e) => setPreForm({ ...preForm, website: e.target.value })}
                />
              </div>

              <div className={styles.preAcciones}>
                <button type="submit" className={styles.preSubmit} disabled={preEstado === 'enviando'}>
                  {preEstado === 'enviando' ? (
                    <>
                      <Loader2 size={16} className={styles.preSpinner} aria-hidden="true" />
                      Enviando...
                    </>
                  ) : (
                    'Obtener mi folio'
                  )}
                </button>
                <span className={styles.preNota}>
                  Tus datos se usan exclusivamente para el proceso de admisión.
                </span>
              </div>

              {preEstado === 'error' && (
                <p className={styles.preError} role="alert">{preMensaje}</p>
              )}
              {catalogosEstado === 'error' && (
                <p className={styles.preError} role="alert">
                  No se pudieron cargar las especialidades. Recarga la página o contáctanos para pre-registrarte.
                </p>
              )}
            </form>
          )}
        </div>
      </section>

      {/* ===== Generalidades ===== */}
      <section id="generalidades" className={styles.generalitiesSection}>
        <div className={styles.sectionHeader}>
          <h2>¿Por qué estudiar en el {INSTITUCION.nombre}?</h2>
          <p>Comprometidos con el desarrollo integral de la juventud tabasqueña.</p>
        </div>

        <div className={styles.genGrid}>
          <div className={styles.genCard}>
            <div className={styles.genIcon}>
              <GraduationCap size={36} strokeWidth={1.5} />
            </div>
            <h3>Doble Titulación</h3>
            <p>
              Al concluir tus estudios obtienes tu certificado de bachillerato tecnológico y tu
              título de carrera técnica profesional registrado ante la SEP.
            </p>
          </div>
          <div className={styles.genCard}>
            <div className={styles.genIcon}>
              <Building2 size={36} strokeWidth={1.5} />
            </div>
            <h3>Infraestructura Moderna</h3>
            <p>
              Laboratorios de cómputo avanzados, talleres especializados y conectividad para
              potenciar el aprendizaje práctico.
            </p>
          </div>
          <div className={styles.genCard}>
            <div className={styles.genIcon}>
              <Trophy size={36} strokeWidth={1.5} />
            </div>
            <h3>Actividades Integrales</h3>
            <p>
              Fomento al deporte, cultura, concursos de innovación tecnológica y desarrollo humano.
            </p>
          </div>
        </div>
      </section>

      {/* ===== Testimonios ===== */}
      <section id="testimonios" className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}><Users size={16} /> Testimonios</span>
          <h2>Voces de la comunidad lince</h2>
          <p>Alumnos, egresados y familias comparten su experiencia en el plantel.</p>
        </div>

        <div className={styles.testiGrid}>
          {testimoniosData.map((t) => (
            <figure key={t.autor} className={styles.testiCard}>
              <Quote size={26} aria-hidden="true" className={styles.testiQuote} />
              <blockquote>
                <p>{t.texto}</p>
              </blockquote>
              <figcaption>
                <strong>{t.autor}</strong>
                <span>{t.rol}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ===== Preguntas frecuentes ===== */}
      <section id="faq" className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}><HelpCircle size={16} /> FAQ</span>
          <h2>Preguntas frecuentes</h2>
          <p>Lo que más nos preguntan aspirantes, padres y alumnos.</p>
        </div>

        <div className={styles.faqList}>
          {faqData.map((item, index) => {
            const abierta = faqAbierta === index;
            return (
              <div key={item.pregunta} className={`${styles.faqItem} ${abierta ? styles.faqItemAbierta : ''}`}>
                <button
                  className={styles.faqPregunta}
                  onClick={() => setFaqAbierta(abierta ? -1 : index)}
                  aria-expanded={abierta}
                  aria-controls={`faq-panel-${index}`}
                >
                  <span>{item.pregunta}</span>
                  <ChevronDown size={20} aria-hidden="true" className={styles.faqChevron} />
                </button>
                {abierta && (
                  <div id={`faq-panel-${index}`} className={styles.faqRespuesta}>
                    <p>{item.respuesta}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== Contacto ===== */}
      <section id="contacto" className={styles.contactSection}>
        <div className={styles.contactContainer}>
          <h2>Contáctanos</h2>
          <p>
            ¿Tienes dudas sobre fichas de admisión o inscripciones? Comunícate con nosotros a través
            de nuestros canales oficiales:
          </p>

          <div className={styles.contactGrid}>
            <a className={styles.contactCard} href={`mailto:${INSTITUCION_LEGAL.contactoEmail}`}>
              <Mail size={26} aria-hidden="true" />
              <h3>Correo institucional</h3>
              <p>Dudas sobre admisión, trámites y control escolar.</p>
              <span>{INSTITUCION_LEGAL.contactoEmail}</span>
            </a>

            <a className={styles.contactCard} href={`mailto:${INSTITUCION_LEGAL.soporteEmail}`}>
              <HelpCircle size={26} aria-hidden="true" />
              <h3>Soporte de la plataforma</h3>
              <p>Problemas de acceso, cuentas y uso del portal.</p>
              <span>{INSTITUCION_LEGAL.soporteEmail}</span>
            </a>

            <a
              className={styles.contactCard}
              href={urlMap}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MapPin size={26} aria-hidden="true" />
              <h3>Ubicación del plantel</h3>
              <p>Carretera Benito Juárez - Tepetitan - 20 de Noviembre 85, Macuspana, Tabasco.</p>
              <span>Ver en Google Maps →</span>
            </a>
          </div>
        </div>
      </section>

      </main>

      {/* ===== Footer ===== */}
      <footer className={styles.mainFooter}>
        <nav className={styles.footerLinks} aria-label="Mapa del sitio">
          <a href="#oferta">Oferta Educativa</a>
          <a href="#plataforma">La Plataforma</a>
          <a href="#admision">Admisión</a>
          <a href="#avisos">Avisos</a>
          <a href="#testimonios">Testimonios</a>
          <a href="#faq">Preguntas Frecuentes</a>
          <a href="#contacto">Contacto</a>
        </nav>
        <p>&copy; {new Date().getFullYear()} {INSTITUCION.nombre} · Plataforma educativa (demo). Todos los derechos reservados.</p>
        <div className={styles.footerLinks}>
          <a href="/legal/privacidad">Aviso de Privacidad</a>
          <a href="/legal/terminos">Términos y Condiciones</a>
          <a href="/legal/cookies">Política de Cookies</a>
        </div>
        <button
          className={styles.scrollTopBtn}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Volver arriba"
        >
          ↑
        </button>
      </footer>
    </div>
  );
}
