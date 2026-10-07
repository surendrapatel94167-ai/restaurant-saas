import express from 'express';
import * as controller from './superAdmin.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorizeRole from '../../middlewares/authorizeRole.js';

const router = express.Router();

router.use(authenticate, authorizeRole('super_admin'));

router.get('/tenants', controller.listTenants);
router.get('/tenants/:tenantId', controller.getTenant);
router.get('/admins', controller.listAdmins);
router.get('/overview', controller.overview);
router.delete('/staff/:userId', controller.deleteStaffAccount);
router.post('/tenants', controller.onboardTenant);
router.post('/tenants/multi-branch', controller.onboardMultiBranch);
router.put('/tenants/:tenantId', controller.updateTenant);
router.delete('/tenants/:tenantId', controller.deleteTenant);
router.patch('/tenants/:tenantId/subscription', controller.updateSubscription);
router.patch('/tenants/:tenantId/toggle-active', controller.toggleActive);
router.post('/tenants/:tenantId/approve-subscription', controller.approveSubscription);
router.post('/tenants/:tenantId/reset-admin-password', controller.resetAdminPassword);
router.post('/messages', controller.sendMessage);

export default router;
