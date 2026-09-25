import express from 'express';
import * as controller from './notification.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorizeRole from '../../middlewares/authorizeRole.js';

const router = express.Router();

router.use(authenticate);

router.get('/', authorizeRole('hotel_admin', 'manager'), controller.listMine);
router.get('/super-admin', authorizeRole('super_admin'), controller.listForSuperAdmin);
router.patch('/:id/read', controller.markRead);
router.patch('/mark-all-read', controller.markAllRead);
router.delete('/:id', controller.remove);
router.delete('/', controller.clearAll);

export default router;
