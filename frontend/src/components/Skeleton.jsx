import React from 'react';
import styles from './Skeleton.module.css';

export default function Skeleton({ 
  width = '100%', 
  height = '20px', 
  variant = 'rectangular', 
  style = {},
  className = ''
}) {
  return (
    <div
      className={`${styles.skeleton} ${styles[variant]} ${className}`}
      style={{
        width,
        height,
        ...style
      }}
    />
  );
}