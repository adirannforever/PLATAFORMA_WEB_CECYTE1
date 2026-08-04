import React from 'react';
import styles from "./LandingPage.module.css";
import { Link } from 'react-router-dom';

export default function LandingPage () {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>¡CECyTE Plantel 1 - Plataforma Web!</h1>
      <p>La Landing Page ya está conectada correctamente.</p>
      <br />
      <Link 
        to="/login" 
        style={{
          padding: '10px 20px',
          background: '#1d4ed8',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '5px',
          fontWeight: 'bold'
        }}
      >
        Iniciar Sesión
      </Link>
    </div>
  );
};