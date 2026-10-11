-- Datos de prueba para la sesión de auditoría
INSERT INTO usuarios (email, password_hash, nombre, apellidos, rol, telefono, activo, fecha_registro)
VALUES (
  'test@test.com',
  '$2a$10$X9LpYrEoT9ZzVJ8WcEyFu.yV6I1zXhNwB2eC4dK3mLnJ9MqRsTu',
  'Test',
  'User',
  'administrador',
  '1234567890',
  TRUE,
  NOW()
)
RETURNING id;