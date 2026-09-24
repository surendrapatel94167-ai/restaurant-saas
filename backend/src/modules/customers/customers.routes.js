import express from 'express';
import * as controller from './customers.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorizeRole from '../../middlewares/authorizeRole.js';

const router = express.Router();

router.use(authenticate, authorizeRole('hotel_admin', 'manager'));

router.get('/', controller.list);
router.post('/broadcast', controller.broadcast);

export default router;
