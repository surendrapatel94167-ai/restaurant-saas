import express from 'express';
import * as controller from './hr.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import authorizeRole from '../../middlewares/authorizeRole.js';

const router = express.Router();

router.use(authenticate);

router.post('/punch-in', controller.punchIn);
router.post('/punch-out', controller.punchOut);
router.post('/self/half-day', controller.selfMarkHalfDay);
router.post('/self/leave', controller.selfApplyLeave);
router.post('/leave', authorizeRole('hotel_admin', 'manager'), controller.markLeave);
router.post('/attendance/mark', authorizeRole('hotel_admin', 'manager'), controller.markAttendance);
router.get('/attendance', controller.listAttendance);
router.get('/salary/:userId/:year/:month', authorizeRole('hotel_admin', 'manager'), controller.calculateSalary);

export default router;
