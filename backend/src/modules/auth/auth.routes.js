import express from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from './auth.controller.js';
import authenticate from '../../middlewares/authenticate.js';

const router = express.Router();

// Brute-force protection on login specifically — 10 attempts per 15 min per
// IP is plenty for a real person who mistyped a password a few times, but
// makes password-guessing impractically slow. Successful logins don't count.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many login attempts — please wait 15 minutes and try again.' },
});

router.post('/login', loginLimiter, authController.login);
router.get('/me', authenticate, authController.me);
router.get('/my-branches', authenticate, authController.getMyBranches);
router.post('/switch-branch', authenticate, authController.switchBranch);
router.get('/my-profile', authenticate, authController.getMyProfile);
router.put('/my-profile', authenticate, authController.updateMyProfile);
router.post('/my-profile/verify-otp', authenticate, authController.verifyProfileOtp);
router.post('/my-profile/reject', authenticate, authController.rejectProfileChange);
router.get('/deletion-request', authenticate, authController.getDeletionRequestInfo);
router.post('/deletion-request', authenticate, authController.requestAccountDeletion);
router.get('/push-public-key', authenticate, authController.getPushKey);
router.post('/push-subscribe', authenticate, authController.savePushSubscription);

export default router;
