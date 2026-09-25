import express from 'express';
import * as controller from './menu.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorizeRole from '../../middlewares/authorizeRole.js';
import requireActiveSubscription from '../../middlewares/requireActiveSubscription.js';

const router = express.Router();

router.use(authenticate);

router.get('/', controller.list);
router.post('/', authorizeRole('hotel_admin', 'manager'), requireActiveSubscription, controller.create);
router.put('/:id', authorizeRole('hotel_admin', 'manager'), requireActiveSubscription, controller.update);
router.patch('/:id/toggle-availability', authorizeRole('hotel_admin', 'manager', 'chef'), controller.toggleAvailability);
router.delete('/:id', authorizeRole('hotel_admin', 'manager'), requireActiveSubscription, controller.remove);

export default router;
