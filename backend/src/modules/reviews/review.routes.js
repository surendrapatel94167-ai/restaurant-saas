import express from 'express';
import * as controller from './review.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorizeRole from '../../middlewares/authorizeRole.js';
import requireActiveSubscription from '../../middlewares/requireActiveSubscription.js';

const router = express.Router();

router.use(authenticate, authorizeRole('hotel_admin', 'manager'), requireActiveSubscription);

router.get('/', controller.listAll);
router.patch('/:id/toggle-approval', controller.toggleApproval);
router.delete('/:id', controller.remove);

export default router;
