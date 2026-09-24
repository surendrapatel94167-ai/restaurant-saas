import express from 'express';
import * as controller from './coupons.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorizeRole from '../../middlewares/authorizeRole.js';

const router = express.Router();

router.use(authenticate, authorizeRole('hotel_admin', 'manager'));

router.get('/', controller.list);
router.post('/', controller.create);
router.patch('/:id/toggle-active', controller.toggleActive);
router.delete('/:id', controller.remove);

export default router;
