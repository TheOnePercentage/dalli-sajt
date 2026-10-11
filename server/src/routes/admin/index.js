import { Router } from 'express';
import { requireAuth, requireStaff } from '../../lib/rbac.js';
import campaigns from './campaigns.js';
import catalog from './catalog.js';
import customers from './customers.js';
import dashboard from './dashboard.js';
import inventory from './inventory.js';
import orders from './orders.js';
import payments from './payments.js';
import products from './products.js';
import reviews from './reviews.js';
import settings from './settings.js';
import users from './users.js';

const router = Router();

// Every /admin route requires authentication + staff role;
// granular permissions enforced per-route via requirePermission(...)
router.use(requireAuth, requireStaff);

router.use('/', dashboard);
router.use('/', products);
router.use('/', catalog);
router.use('/', inventory);
router.use('/', orders);
router.use('/', customers);
router.use('/', reviews);
router.use('/', users);
router.use('/', settings);
router.use('/', campaigns);
router.use('/', payments);

// Generic 404 for unknown admin endpoints
router.use((req, res) => {
  res.status(404).json({ error: `Unknown admin endpoint: ${req.method} ${req.originalUrl}` });
});

export default router;
