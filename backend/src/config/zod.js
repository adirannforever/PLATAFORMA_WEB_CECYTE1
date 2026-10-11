import { z } from 'zod';

// Config global de zod: mensaje de error unificado con la ruta
z.setErrorMap((issue, ctx) => {
  return {
    message: `${ctx.path.join('.') || 'value'}: ${issue.message}`,
  };
});

export { z };
