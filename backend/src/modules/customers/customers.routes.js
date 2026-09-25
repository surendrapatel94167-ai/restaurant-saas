import express from 'express';
import * as controller from './customers.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorizeRole from '../../middlewares/authorizeRole.js';
import requireActiveSubscription from '../../middlewares/requireActiveSubscription.js';

const router = express.Router();

router.use(authenticate, authorizeRole('hotel_admin', 'manager'), requireActiveSubscription);

router.get('/', controller.list);
router.post('/broadcast', controller.broadcast);

export default router;
