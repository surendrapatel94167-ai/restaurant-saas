import express from 'express';
import * as controller from './tables.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorizeRole from '../../middlewares/authorizeRole.js';
import requireActiveSubscription from '../../middlewares/requireActiveSubscription.js';

const router = express.Router();

router.use(authenticate, authorizeRole('hotel_admin', 'manager'), requireActiveSubscription);

router.get('/', controller.list);
router.post('/', controller.create);
router.post('/:id/regenerate', controller.regenerate);
router.post('/bulk-delete', controller.bulkRemove);
router.delete('/:id', controller.remove);

export default router;
