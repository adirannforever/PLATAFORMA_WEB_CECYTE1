// src/pages/LandingPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Map } from "lucide-react";
import { useAuth } from '../context/AuthContext';
import logoCecyte from '../assets/logo_cecyte.png';
import styles from './LandingPage.module.css';

// Imágenes para el Carrusel
const slidesData = [
  {
    id: 1,
    img: 'https://scontent.fvsa2-2.fna.fbcdn.net/v/t39.30808-6/733448561_1056790323448797_7761903579686217327_n.jpg?stp=dst-jpg_tt6&cstp=mx1264x842&ctp=s1264x842&_nc_cat=110&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=KTeNSJ4ZZuIQ7kNvwEoVjWA&_nc_oc=Adrzew00Ot1cPsQlhVYq2PEyrPUPTM5omI_-gxoAJ1Hl5p1NpDRdXBSuYpM1MdI0Dd_6wPK426XeP8jycUHjmqk4&_nc_zt=23&_nc_ht=scontent.fvsa2-2.fna&_nc_gid=cMR7SnCZqlasINbDNFDfLw&_nc_ss=79289&oh=00_AQGI0EdUK7NFBiy2dPjRlDN9nDboOwK-KNy9lvnlPG-xog&oe=6A797AF8',
    title: 'Excelencia Académica y Tecnológica',
    subtitle: 'CECyTE Plantel 1 · Poblado Aquiles Serdán, Macuspana'
  },
  {
    id: 2,
    img: 'https://tse3.mm.bing.net/th/id/OIP.tJzIbAJPhldlOqq6tUDlzAHaFj?r=0&rs=1&pid=ImgDetMain&o=7&rm=3',
    title: 'Talleres y Laboratorios Equipados',
    subtitle: 'Prácticas profesionales para el futuro'
  },
  {
    id: 3,
    img: 'https://scontent.fvsa2-1.fna.fbcdn.net/v/t39.30808-6/704528948_967522926025294_279986910300998829_n.jpg?stp=dst-jpg_tt6&cstp=mx1394x2048&ctp=s1394x2048&_nc_cat=105&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=QQg8EIgOInsQ7kNvwFRlfnQ&_nc_oc=AdqUg_aMWS09rJKwV-xqkDOEgHDpQs2e1kFOaOZJwFwaJnuxpPFuF4JfyhjTFAvaCvVWDoT9MsLvUzg775Hz9UEL&_nc_zt=23&_nc_ht=scontent.fvsa2-1.fna&_nc_gid=QGFZaibyPfAqDyb9wg9fEQ&_nc_ss=79289&oh=00_AQFBaP7eBxsIwzZDfgfQJMI1dUYmib3Ef45yPKYuoy82ew&oe=6A7977D6',
    title: 'Comunidad Estudiantil Actitud Lince',
    subtitle: 'Formando a los líderes técnicos del mañana en Tabasco'
  },
  {
    id: 4,
    img: 'https://scontent.fvsa2-2.fna.fbcdn.net/v/t39.30808-6/705423833_967523069358613_125939443562683944_n.jpg?stp=dst-jpg_tt6&cstp=mx2048x1656&ctp=s2048x1656&_nc_cat=100&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=I53ODbh3pLoQ7kNvwHxFa33&_nc_oc=Adpq_bG7dGRke4928kswWWrJhcX8_eVP38-HAxXjtjJY0oulZdNqpC-SOO8xOM6gh6NaWR6fpDdA-EbMdpAXmukH&_nc_zt=23&_nc_ht=scontent.fvsa2-2.fna&_nc_gid=WvhXW8PqRZStEoaZgBkS-g&_nc_ss=79289&oh=00_AQFYU5flaVD3fM281JSyllIlBdwI0ZFuSydJeCPyEDN6-g&oe=6A798560',
    title: 'Infraestructura de Vanguardia',
    subtitle: 'Espacios diseñados para el aprendizaje integral'
  },
  {
    id: 5,
    img: 'https://scontent.fvsa2-1.fna.fbcdn.net/v/t39.30808-6/648101006_964813729313124_8327150096680707883_n.jpg?stp=dst-jpg_tt6&cstp=mx1771x1365&ctp=s1771x1365&_nc_cat=106&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=h-jlZtYImewQ7kNvwHMT9PY&_nc_oc=AdqAsu0Xb59wudtaTI_1700DxQaAKyqOCAOr5K1bKo2rzwWiDS2cQgcVNLPbbqWJUzoH1bP5jdhuVmLAJvvT2Qss&_nc_zt=23&_nc_ht=scontent.fvsa2-1.fna&_nc_gid=kx5knYYt8KuQuZITOsldaA&_nc_ss=79289&oh=00_AQE5GUDaJbGkBlTwjL4zj5ZNnZYUyk7W7xuIOlf59RTi1Q&oe=6A797160',
    title: 'Eventos y Convivencia Escolar',
    subtitle: 'Fomentando la integración y el compañerismo'
  },
  {
    id: 6,
    img: 'https://scontent.fvsa2-1.fna.fbcdn.net/v/t39.30808-6/308422156_200272872433884_1244107136618772619_n.jpg?stp=dst-jpg_tt6&cstp=mx1920x1080&ctp=s1920x1080&_nc_cat=103&ccb=1-7&_nc_sid=536f4a&_nc_ohc=W5oNPYc_i5oQ7kNvwEXcTXK&_nc_oc=AdpfG8TRxLk_i-gtuUymscs8wrwxnpYBOB6h3VGXwttUvNAugoSP7gwrj9DQvp9v_6nikHhXx8VQe5qFacz8-Mh-&_nc_zt=23&_nc_ht=scontent.fvsa2-1.fna&_nc_gid=COAcieab5towRg-zBtOX3Q&_nc_ss=79289&oh=00_AQF-dPUQNIimEI01Eegs_CjfrXOlotaBZPWYiyzJlT0apw&oe=6A7991C8',
    title: 'Orgullo Lince',
    subtitle: 'Celebrando nuestros logros y tradición'
  },
  {
    id: 7,
    img: 'https://scontent.fvsa2-2.fna.fbcdn.net/v/t39.30808-6/733448561_1056790323448797_7761903579686217327_n.jpg?stp=dst-jpg_tt6&cstp=mx1264x842&ctp=s1264x842&_nc_cat=110&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=KTeNSJ4ZZuIQ7kNvwEoVjWA&_nc_oc=Adrzew00Ot1cPsQlhVYq2PEyrPUPTM5omI_-gxoAJ1Hl5p1NpDRdXBSuYpM1MdI0Dd_6wPK426XeP8jycUHjmqk4&_nc_zt=23&_nc_ht=scontent.fvsa2-2.fna&_nc_gid=cMR7SnCZqlasINbDNFDfLw&_nc_ss=79289&oh=00_AQGI0EdUK7NFBiy2dPjRlDN9nDboOwK-KNy9lvnlPG-xog&oe=6A797AF8',
    title: 'Proyectos Colaborativos',
    subtitle: 'Trabajo en equipo y desarrollo de habilidades'
  }
];

// Datos de las Especialidades
const especialidadesData = [
  {
    id: 'grafico',
    titulo: 'Técnico en Diseño Gráfico Digital',
    badge: 'Creatividad & Multimedia',
    img: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80',
    descripcion: 'Formación enfocada en la comunicación visual, manejo de software de edición profesional, ilustración digital, animación y diseño publicitario moderno.',
    perfilAspirante: 'Interés por las artes visuales, la creatividad, la fotografía, el dibujo digital y el dominio de herramientas tecnológicas de diseño.',
    perfilEgresado: 'Capaz de desarrollar proyectos gráficos para medios impresos y digitales, identidad corporativa, ilustración multimedia y material publicitario para empresas o emprendimientos.'
  },
  {
    id: 'electronica',
    titulo: 'Técnico en Electrónica',
    badge: 'Innovación & Hardware',
    img: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80',
    descripcion: 'Estudio y aplicación de circuitos eléctricos, sistemas analógicos y digitales, microcontroladores y mantenimiento preventivo/correctivo de equipos electrónicos.',
    perfilAspirante: 'Gusto por la física, las matemáticas, el armado de circuitos, la lógica computacional y la resolución analítica de problemas técnicos.',
    perfilEgresado: 'Competente en la instalación, diagnóstico, reparación y automatización de sistemas electrónicos, tarjetas de control y dispositivos tecnológicos industriales.'
  },
  {
    id: 'alimentos',
    titulo: 'Técnico en Producción Industrial de Alimentos',
    badge: 'Calidad & Procesos',
    img: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=600&q=80',
    descripcion: 'Procesamiento, conservación, análisis químico-bromatológico y control de calidad en la industria alimentaria bajo estrictas normativas de higiene y seguridad.',
    perfilAspirante: 'Curiosidad por los procesos químicos de los alimentos, la bioseguridad, la inocuidad alimentaria y el trabajo metódico en laboratorios.',
    perfilEgresado: 'Preparado para supervisar líneas de producción de alimentos, aplicar normativas de sanidad, realizar controles de calidad y liderar procesos de conservación alimentaria.'
  }
];

export default function LandingPage() {
  const { usuario } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [especialidadSeleccionada, setEspecialidadSeleccionada] = useState(null);
  const urlMap = "https://maps.app.goo.gl/u54L7i59feWDZPcEA";

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slidesData.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slidesData.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slidesData.length) % slidesData.length);
  };

  return (
    <div className={styles.pageWrapper}>
      {/* Hamburguesa fija */}
      <button
        className={styles.fixedHamburger}
        onClick={() => setMenuAbierto(true)}
        aria-label="Abrir menú de navegación"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      {/* Drawer */}
      {menuAbierto && (
        <div className={styles.drawerOverlay} onClick={() => setMenuAbierto(false)}>
          <nav className={styles.drawerMenu} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <span className={styles.drawerTitle}>Navegación</span>
              <button onClick={() => setMenuAbierto(false)} className={styles.closeDrawerBtn}>&times;</button>
            </div>
            <a href="#carrusel" onClick={() => setMenuAbierto(false)}>Inicio / Galería</a>
            <a href="#oferta" onClick={() => setMenuAbierto(false)}>Oferta Educativa</a>
            <a href="#generalidades" onClick={() => setMenuAbierto(false)}>Acerca del Plantel</a>
            <a href="#contacto" onClick={() => setMenuAbierto(false)}>Contacto</a>
            <Link
              to={usuario ? "/dashboard" : "/login"}
              className={styles.drawerLoginBtn}
              onClick={() => setMenuAbierto(false)}
            >
              {usuario ? "Entrar al Sistema →" : "Iniciar Sesión en el Portal"}
            </Link>
          </nav>
        </div>
      )}

      {/* Header */}
      <header className={styles.topHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerBrandInfo}>
            <img src={logoCecyte} alt="Logo CECyTE" className={styles.headerLogoImg} />
            <div className={styles.headerTitles}>
              <h1>CECyTE Plantel 1</h1>
              <span>Macuspana, Tabasco · Aquiles Serdán</span>
            </div>
          </div>
          <div className={styles.headerAction}>
            <Link
              to={usuario ? "/dashboard" : "/login"}
              className={styles.headerLoginBtn}
            >
              {usuario ? "Entrar al Sistema →" : "Iniciar Sesión"}
            </Link>
          </div>
        </div>
      </header>

      {/* Carrusel */}
      <section id="carrusel" className={styles.carouselSection}>
        <div className={styles.carouselContainer}>
          {slidesData.map((slide, index) => (
            <div
              key={slide.id}
              className={`${styles.slideItem} ${index === currentSlide ? styles.slideActive : ''}`}
              style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.65)), url(${slide.img})` }}
            >
              <div className={styles.slideCaption}>
                <span className={styles.slideBadge}>Plantel Oficial</span>
                <h2>{slide.title}</h2>
                <p>{slide.subtitle}</p>
              </div>
            </div>
          ))}

          <button className={`${styles.carouselArrow} ${styles.arrowLeft}`} onClick={prevSlide} aria-label="Anterior">
            &#10094;
          </button>
          <button className={`${styles.carouselArrow} ${styles.arrowRight}`} onClick={nextSlide} aria-label="Siguiente">
            &#10095;
          </button>
        </div>
      </section>

      {/* Oferta Educativa */}
      <section id="oferta" className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <h2>Nuestra Oferta Educativa</h2>
          <p>Selecciona una especialidad para conocer los detalles, perfil de aspirante y perfil de egreso.</p>
        </div>

        <div className={styles.specialtiesGrid}>
          {especialidadesData.map((esp) => (
            <div
              key={esp.id}
              className={`${styles.specialtyCard} ${especialidadSeleccionada?.id === esp.id ? styles.cardActive : ''}`}
              onClick={() => setEspecialidadSeleccionada(esp)}
            >
              <div className={styles.cardHeaderIndicator}></div>
              <span className={styles.espBadge}>{esp.badge}</span>
              <h3>{esp.titulo}</h3>
              <p>{esp.descripcion.substring(0, 90)}...</p>
              <span className={styles.clickPrompt}>Ver detalles completos &rarr;</span>
            </div>
          ))}
        </div>

        {/* Modal */}
        {especialidadSeleccionada && (
          <div className={styles.modalOverlay} onClick={() => setEspecialidadSeleccionada(null)}>
            <div className={styles.expandedCardModal} onClick={(e) => e.stopPropagation()}>
              <button className={styles.modalCloseBtn} onClick={() => setEspecialidadSeleccionada(null)}>&times;</button>

              <div className={styles.modalHeader}>
                <span className={styles.espBadgeModal}>{especialidadSeleccionada.badge}</span>
                <h2>{especialidadSeleccionada.titulo}</h2>
              </div>

              <div className={styles.modalBodyScroll}>
                <div className={styles.modalContentGrid}>
                  <img src={especialidadSeleccionada.img} alt={especialidadSeleccionada.titulo} className={styles.modalImg} />
                  <div className={styles.modalTexts}>
                    <div className={styles.infoBlock}>
                      <h4>Descripción General</h4>
                      <p>{especialidadSeleccionada.descripcion}</p>
                    </div>
                    <div className={styles.infoBlock}>
                      <h4>Perfil de Aspirante</h4>
                      <p>{especialidadSeleccionada.perfilAspirante}</p>
                    </div>
                    <div className={styles.infoBlock}>
                      <h4>Perfil de Egresado</h4>
                      <p>{especialidadSeleccionada.perfilEgresado}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Generalidades */}
      <section id="generalidades" className={styles.generalitiesSection}>
        <div className={styles.sectionHeader}>
          <h2>¿Por qué estudiar en el CECyTE Plantel 1?</h2>
          <p>Comprometidos con el desarrollo integral de la juventud tabasqueña.</p>
        </div>

        <div className={styles.genGrid}>
          <div className={styles.genCard}>
            <div className={styles.genIcon}></div>
            <h3>Doble Titulación</h3>
            <p>Al concluir tus estudios obtienes tu certificado de bachillerato tecnológico y tu título de carrera técnica profesional registrado ante la SEP.</p>
          </div>
          <div className={styles.genCard}>
            <div className={styles.genIcon}>️</div>
            <h3>Infraestructura Moderna</h3>
            <p>Laboratorios de cómputo avanzados, talleres especializados y conectividad para potenciar el aprendizaje práctico.</p>
          </div>
          <div className={styles.genCard}>
            <div className={styles.genIcon}></div>
            <h3>Actividades Integrales</h3>
            <p>Fomento al deporte, cultura, concursos de innovación tecnológica y desarrollo humano.</p>
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" className={styles.contactSection}>
        <div className={styles.contactContainer}>
          <h2>Contáctanos</h2>
          <p>¿Tienes dudas sobre fichas de admisión o inscripciones? Comunícate con nosotros a través de nuestros canales oficiales:</p>

          <div className={styles.socialIconsCentered}>
            <a
              href="https://www.facebook.com/people/Cecyte-Tabasco-Plantel-1-Aquiles-Serd%C3%A1n-Macuspana/100064800004242/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialBtn}
              aria-label="Facebook Oficial"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>Facebook Oficial</span>
            </a>

            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=contacto.dirpla01@cecytab.edu.mx&su=Consulta+sobre+Inscripciones+y+Fichas"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialBtn}
              aria-label="Correo Electrónico Gmail"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12.713l-11.985-7.713h23.97l-11.985 7.713zm11.985-5.713l-11.985 7.713-11.985-7.713v10h23.985v-10z"/>
              </svg>
              <span>Correo Electrónico</span>
            </a>
          </div>

          <a
            href={urlMap}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.mapIconLink}
            aria-label="Ver ubicación de la institución en Google Maps"
            title="Abrir ubicación en Google Maps"
          >
            <span className={styles.locationSubtext}>
              <Map size={20} style={{ verticalAlign: "middle", marginRight: "6px" }} />
              Ubicación: Carretera Benito Juárez - Tepetitan - 20 de Noviembre 85 Macuspana, Tabasco
            </span>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.mainFooter}>
        <p>&copy; {new Date().getFullYear()} CECyTE Plantel 1 — Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}