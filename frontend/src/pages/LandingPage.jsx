import React from 'react';
import { Link } from 'react-router-dom';
import logoCecyte from '../assets/logo_cecyte.png'

const LogoCECyTE = () => (
  <img 
    src={logoCecyte} 
    alt="Logo CECyTE" 
    style={{ 
      width: '308px', 
      height: '308px', 
      objectFit: 'cover',
    }} 
  />
);

export default function LandingPage () {
  return (
    <div className="landing-container">
      {/* 1. Header / Navbar */}
      <header className="navbar">
        <div className="logo">
          <h2>CECyTE Plantel 1</h2>
        </div>
        <LogoCECyTE />
        <nav>
          <a href="#carreras">Carreras</a>
          <a href="#contacto">Contacto</a>
          {/* Botón hacia la pantalla de acceso */}
          <Link to="/login" className="btn-login">
            Iniciar Sesión
          </Link>
        </nav>
      </header>

      {/* 2. Hero Section */}
      <section className="hero">
        <h1>Bienvenido a la Plataforma Web del CECyTE Plantel 1</h1>
        <p>Formando técnicos profesionales con excelencia académica y tecnológica.</p>
        <Link to="/login" className="btn-primary">
          Ingresar al Portal Escolar
        </Link>
      </section>

      {/* 3. Secciones Informativas (Carreras, Anuncios, etc.) */}
      <section id="carreras" className="info-section">
        <h2>Nuestra Oferta Educativa</h2>
        <div className="cards-grid">
          <div className="card">
            <h3>Soporte y Mantenimiento de Equipo de Cómputo</h3>
            <p>Aprende arquitectura de computadoras, redes y desarrollo web.</p>
          </div>
          {/* Añade más carreras según tu plantel */}
        </div>
      </section>

      {/* 4. Footer */}
      <footer>
        <p>&copy; {new Date().getFullYear()} CECyTE Plantel 1 — Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};