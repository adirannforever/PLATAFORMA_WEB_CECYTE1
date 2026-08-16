// components/NetworkStatus.jsx
import { useState, useEffect } from 'react';
import { WifiOff, Loader2 } from 'lucide-react';
import styles from './NetworkStatus.module.css';

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
   
    const handleOnline = () => {
      setIsReconnecting(true);
      setIsOnline(true);
  
      setIsVisible(true);
 
      setTimeout(() => {
        setIsVisible(false);
        setIsReconnecting(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsReconnecting(false);
      setIsVisible(true);
    };

    const target = globalThis;
    target.addEventListener('online', handleOnline);
    target.addEventListener('offline', handleOffline);

    // Verificar estado inicial
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setIsVisible(true);
    }

    return () => {
      try {
        target.removeEventListener('online', handleOnline);
        target.removeEventListener('offline', handleOffline);
      } catch (error) {
        console.warn('Error al limpiar event listeners:', error);
      }
    };
  }, []);

  if (isOnline && !isVisible) return null;

  if (isOnline && isReconnecting) {
    return (
      <div className={`${styles.notification} ${styles.reconnected}`}>
        <div className={styles.iconWrapper}>
          <Loader2 size={20} className={styles.spin} />
        </div>
        <div className={styles.content}>
          <span className={styles.title}>Conexión restablecida</span>
          <span className={styles.message}>La conexión a Internet se ha recuperado.</span>
        </div>
        <button className={styles.closeBtn} onClick={() => setIsVisible(false)}>✕</button>
      </div>
    );
  }

  return (
    <div className={`${styles.notification} ${styles.offline}`}>
      <div className={styles.iconWrapper}>
        <WifiOff size={20} />
      </div>
      <div className={styles.content}>
        <span className={styles.title}>Sin conexión</span>
        <span className={styles.message}>Algunas funciones pueden estar limitadas.</span>
      </div>
      <button className={styles.closeBtn} onClick={() => setIsVisible(false)}>✕</button>
    </div>
  );
}