import express from 'express';
import * as authController from './auth.controller.js';
import authenticate from '../../middlewares/authenticate.js';

const router = express.Router();

router.post('/login', authController.login);
router.get('/me', authenticate, authController.me);
router.get('/my-branches', authenticate, authController.getMyBranches);
router.post('/switch-branch', authenticate, authController.switchBranch);
router.get('/my-profile', authenticate, authController.getMyProfile);
router.put('/my-profile', authenticate, authController.updateMyProfile);

export default router;
