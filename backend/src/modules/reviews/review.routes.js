import express from 'express';
import * as controller from './review.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorizeRole from '../../middlewares/authorizeRole.js';

const router = express.Router();

router.use(authenticate, authorizeRole('hotel_admin', 'manager'));

router.get('/', controller.listAll);
router.patch('/:id/toggle-approval', controller.toggleApproval);
router.delete('/:id', controller.remove);

export default router;
