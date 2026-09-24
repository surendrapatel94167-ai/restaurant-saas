import express from 'express';
import * as controller from './platformSettings.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorizeRole from '../../middlewares/authorizeRole.js';

const router = express.Router();

router.use(authenticate, authorizeRole('super_admin'));

router.get('/', controller.get);
router.put('/', controller.update);

export default router;
