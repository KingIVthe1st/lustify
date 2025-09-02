const express = require('express');
const { body, param } = require('express-validator');
const { authenticateToken, requireEmailVerification } = require('../middleware/auth');
const SubscriptionController = require('../controllers/subscriptionController');

const router = express.Router();
const subscriptionController = new SubscriptionController();

// Subscription creation validation
const createSubscriptionValidation = [
  body('planId')
    .isUUID()
    .withMessage('Plan ID must be a valid UUID'),
  body('paymentMethodId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Payment method ID is required')
];

// Subscription update validation
const updateSubscriptionValidation = [
  param('id').isUUID().withMessage('Invalid subscription ID format'),
  body('planId')
    .isUUID()
    .withMessage('Plan ID must be a valid UUID')
];

// Subscription ID validation
const subscriptionIdValidation = [
  param('id').isUUID().withMessage('Invalid subscription ID format')
];

// Payment intent validation
const createPaymentIntentValidation = [
  body('amount')
    .isNumeric()
    .isFloat({ min: 0.50 })
    .withMessage('Amount must be a number greater than or equal to 0.50'),
  body('currency')
    .optional()
    .isIn(['usd', 'eur', 'gbp'])
    .withMessage('Currency must be usd, eur, or gbp')
];

// Public routes (no authentication required)
router.get('/plans', subscriptionController.getAvailablePlans.bind(subscriptionController));

// Webhook endpoint (raw body needed for Stripe signature verification)
router.post('/webhook', express.raw({ type: 'application/json' }), subscriptionController.handleWebhook.bind(subscriptionController));

// Protected routes
router.use(authenticateToken);
router.use(requireEmailVerification);

// GET /api/subscriptions - Get current user subscription
router.get('/', subscriptionController.getUserSubscription.bind(subscriptionController));

// POST /api/subscriptions - Create new subscription
router.post('/', createSubscriptionValidation, subscriptionController.createSubscription.bind(subscriptionController));

// GET /api/subscriptions/history - Get subscription history
router.get('/history', subscriptionController.getSubscriptionHistory.bind(subscriptionController));

// PUT /api/subscriptions/:id - Update subscription plan
router.put('/:id', updateSubscriptionValidation, subscriptionController.updateSubscription.bind(subscriptionController));

// POST /api/subscriptions/:id/cancel - Cancel subscription
router.post('/:id/cancel', subscriptionIdValidation, subscriptionController.cancelSubscription.bind(subscriptionController));

// POST /api/subscriptions/:id/reactivate - Reactivate subscription
router.post('/:id/reactivate', subscriptionIdValidation, subscriptionController.reactivateSubscription.bind(subscriptionController));

// POST /api/subscriptions/payment-intent - Create payment intent for one-time payments
router.post('/payment-intent', createPaymentIntentValidation, subscriptionController.createPaymentIntent.bind(subscriptionController));

module.exports = router;