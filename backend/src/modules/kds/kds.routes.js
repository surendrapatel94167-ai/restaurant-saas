import express from 'express';
import * as controller from './kds.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorizeRole from '../../middlewares/authorizeRole.js';

const router = express.Router();

router.use(authenticate);
router.patch('/:id/status', authorizeRole('hotel_admin', 'manager', 'chef', 'waiter', 'cashier'), controller.updateStatus);

export default router;
