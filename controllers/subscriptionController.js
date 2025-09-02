const { validationResult } = require('express-validator');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const SubscriptionService = require('../services/subscriptionService');

class SubscriptionController {
  constructor() {
    this.subscriptionService = new SubscriptionService();
  }

  async getAvailablePlans(req, res) {
    try {
      const plans = await this.subscriptionService.getAvailablePlans();

      res.json({
        success: true,
        data: {
          plans
        }
      });

    } catch (error) {
      console.error('Get available plans error:', error);
      res.status(500).json({
        error: 'Failed to fetch plans',
        message: 'Internal server error'
      });
    }
  }

  async createSubscription(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = req.user.id;
      const { planId, paymentMethodId } = req.body;

      if (!planId || !paymentMethodId) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Plan ID and payment method ID are required'
        });
      }

      const result = await this.subscriptionService.createSubscription(
        userId,
        planId,
        paymentMethodId
      );

      res.status(201).json({
        success: true,
        message: 'Subscription created successfully',
        data: result
      });

    } catch (error) {
      console.error('Create subscription error:', error);
      
      if (error.message.includes('Invalid or inactive subscription plan')) {
        return res.status(400).json({
          error: 'Invalid plan',
          message: error.message
        });
      }

      if (error.type === 'StripeCardError') {
        return res.status(400).json({
          error: 'Payment failed',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'Subscription creation failed',
        message: 'Internal server error'
      });
    }
  }

  async getUserSubscription(req, res) {
    try {
      const userId = req.user.id;
      const subscription = await this.subscriptionService.getUserSubscription(userId);

      res.json({
        success: true,
        data: {
          subscription
        }
      });

    } catch (error) {
      console.error('Get user subscription error:', error);
      res.status(500).json({
        error: 'Failed to fetch subscription',
        message: 'Internal server error'
      });
    }
  }

  async updateSubscription(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = req.user.id;
      const subscriptionId = req.params.id;
      const { planId } = req.body;

      if (!planId) {
        return res.status(400).json({
          error: 'Missing required field',
          message: 'Plan ID is required'
        });
      }

      const subscription = await this.subscriptionService.updateSubscription(
        userId,
        subscriptionId,
        planId
      );

      res.json({
        success: true,
        message: 'Subscription updated successfully',
        data: {
          subscription
        }
      });

    } catch (error) {
      console.error('Update subscription error:', error);
      
      if (error.message === 'Subscription not found') {
        return res.status(404).json({
          error: 'Subscription not found'
        });
      }

      if (error.message.includes('Invalid or inactive subscription plan')) {
        return res.status(400).json({
          error: 'Invalid plan',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'Subscription update failed',
        message: 'Internal server error'
      });
    }
  }

  async cancelSubscription(req, res) {
    try {
      const userId = req.user.id;
      const subscriptionId = req.params.id;
      const { immediate = false } = req.body;

      const result = await this.subscriptionService.cancelSubscription(
        userId,
        subscriptionId,
        immediate
      );

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Cancel subscription error:', error);
      
      if (error.message === 'Subscription not found') {
        return res.status(404).json({
          error: 'Subscription not found'
        });
      }

      res.status(500).json({
        error: 'Subscription cancellation failed',
        message: 'Internal server error'
      });
    }
  }

  async reactivateSubscription(req, res) {
    try {
      const userId = req.user.id;
      const subscriptionId = req.params.id;

      const result = await this.subscriptionService.reactivateSubscription(
        userId,
        subscriptionId
      );

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Reactivate subscription error:', error);
      
      if (error.message === 'Subscription not found') {
        return res.status(404).json({
          error: 'Subscription not found'
        });
      }

      if (error.message === 'Subscription is not scheduled for cancellation') {
        return res.status(400).json({
          error: 'Invalid operation',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'Subscription reactivation failed',
        message: 'Internal server error'
      });
    }
  }

  async getSubscriptionHistory(req, res) {
    try {
      const userId = req.user.id;
      const options = {
        limit: parseInt(req.query.limit) || 10,
        offset: parseInt(req.query.offset) || 0
      };

      const result = await this.subscriptionService.getSubscriptionHistory(userId, options);

      res.json({
        success: true,
        data: {
          subscriptions: result.rows,
          pagination: {
            total: result.count,
            limit: options.limit,
            offset: options.offset,
            hasMore: (options.offset + options.limit) < result.count
          }
        }
      });

    } catch (error) {
      console.error('Get subscription history error:', error);
      res.status(500).json({
        error: 'Failed to fetch subscription history',
        message: 'Internal server error'
      });
    }
  }

  async createPaymentIntent(req, res) {
    try {
      const { amount, currency = 'usd' } = req.body;

      if (!amount) {
        return res.status(400).json({
          error: 'Missing required field',
          message: 'Amount is required'
        });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        automatic_payment_methods: {
          enabled: true
        },
        metadata: {
          user_id: req.user.id.toString()
        }
      });

      res.json({
        success: true,
        data: {
          client_secret: paymentIntent.client_secret,
          payment_intent_id: paymentIntent.id
        }
      });

    } catch (error) {
      console.error('Create payment intent error:', error);
      res.status(500).json({
        error: 'Payment intent creation failed',
        message: 'Internal server error'
      });
    }
  }

  async handleWebhook(req, res) {
    try {
      const sig = req.headers['stripe-signature'];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      await this.subscriptionService.handleWebhookEvent(event);

      res.json({ received: true });

    } catch (error) {
      console.error('Webhook handling error:', error);
      res.status(500).json({
        error: 'Webhook processing failed',
        message: 'Internal server error'
      });
    }
  }
}

module.exports = SubscriptionController;