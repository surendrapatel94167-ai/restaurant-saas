import express from 'express';
import * as controller from './customer.controller.js';
import tenantScope from '../../middlewares/tenantScope.js';

const router = express.Router({ mergeParams: true });

router.get('/:tenantSlug/landing', tenantScope, controller.getLanding);
router.get('/:tenantSlug/menu', tenantScope, controller.getMenu);
router.get('/:tenantSlug/menu/:itemId', tenantScope, controller.getMenuItemDetail);
router.get('/:tenantSlug/push-public-key', tenantScope, controller.getPushPublicKey);
router.post('/:tenantSlug/push-subscribe', tenantScope, controller.subscribePush);
router.get('/:tenantSlug/loyalty', tenantScope, controller.getLoyaltyBalance);
router.get('/:tenantSlug/visits', tenantScope, controller.getVisits);
router.get('/:tenantSlug/coupons/validate', tenantScope, controller.validateCoupon);
router.get('/:tenantSlug/last-order', tenantScope, controller.getLastOrder);
router.get('/:tenantSlug/reviews', tenantScope, controller.getPublicReviews);
router.post('/:tenantSlug/reviews', tenantScope, controller.submitReview);
router.post('/:tenantSlug/orders', tenantScope, controller.placeOrder);
router.post('/:tenantSlug/orders/:orderId/payment', tenantScope, controller.createPayment);
router.post('/:tenantSlug/orders/:orderId/payment/confirm', tenantScope, controller.confirmPayment);
router.get('/:tenantSlug/orders/:orderId', tenantScope, controller.trackOrder);
router.post('/:tenantSlug/orders/:orderId/assistance', tenantScope, controller.requestAssistance);

export default router;
