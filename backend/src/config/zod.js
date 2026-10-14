import { z } from 'zod';

// Config global de zod: mensaje de error unificado con la ruta
z.setErrorMap((issue, ctx) => {
  const path = ctx?.path ?? issue.path ?? [];
  return {
    message: `${path.join('.') || 'value'}: ${issue.message}`,
  };
});

export { z };
