import { Router } from 'express';
import { verifyToken, requirePermiso } from '../middlewares/auth.js';
import { getAdminDashboard } from '../controllers/dashboard.controller.js';

const router = Router();

// Todo el dashboard requiere sesión válida.
router.use(verifyToken);

// Snapshot agregado para el panel de administración.
// requirePermiso('dashboard.ver'): admin lo tiene vía comodín '*'.
router.get('/admin', requirePermiso('dashboard.ver'), getAdminDashboard);

export default router;
