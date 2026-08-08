import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    authService.me()
      .then((res) => setUsuario(res.usuario)) 
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false));
  }, []);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    setUsuario(res.usuario);  
    return res.usuario;
  };

  const logout = async () => {
    await authService.logout();
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};