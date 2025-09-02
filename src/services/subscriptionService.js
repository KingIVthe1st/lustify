const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { UserSubscription, SubscriptionPlan, User } = require('../models');
const CreditService = require('./creditService');

class SubscriptionService {
  constructor() {
    this.creditService = new CreditService();
  }

  async createSubscription(userId, planId, paymentMethodId) {
    try {
      // Get the subscription plan
      const plan = await SubscriptionPlan.findByPk(planId);
      if (!plan || !plan.active) {
        throw new Error('Invalid or inactive subscription plan');
      }

      // Get user information
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Create or get Stripe customer
      let customer;
      if (user.stripe_customer_id) {
        customer = await stripe.customers.retrieve(user.stripe_customer_id);
      } else {
        customer = await stripe.customers.create({
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
          metadata: {
            user_id: userId.toString()
          }
        });

        // Update user with Stripe customer ID
        await user.update({ stripe_customer_id: customer.id });
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id
      });

      // Set as default payment method
      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });

      // Create Stripe subscription
      const stripeSubscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: plan.stripe_price_id }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          user_id: userId.toString(),
          plan_id: planId.toString()
        }
      });

      // Cancel existing active subscription if any
      const existingSubscription = await UserSubscription.findOne({
        where: {
          user_id: userId,
          status: 'active'
        }
      });

      if (existingSubscription) {
        await this.cancelSubscription(userId, existingSubscription.id, false);
      }

      // Create subscription record in our database
      const subscription = await UserSubscription.create({
        user_id: userId,
        subscription_plan_id: planId,
        stripe_subscription_id: stripeSubscription.id,
        status: stripeSubscription.status === 'active' ? 'active' : 'pending',
        current_period_start: new Date(stripeSubscription.current_period_start * 1000),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000),
        cancel_at_period_end: false
      });

      // If subscription is active, add credits immediately
      if (stripeSubscription.status === 'active') {
        await this.creditService.handleSubscriptionRenewal(userId, plan, {
          subscription_id: subscription.id,
          stripe_subscription_id: stripeSubscription.id
        });
      }

      return {
        subscription,
        payment_intent: stripeSubscription.latest_invoice.payment_intent,
        client_secret: stripeSubscription.latest_invoice.payment_intent.client_secret
      };

    } catch (error) {
      console.error('Subscription creation error:', error);
      throw error;
    }
  }

  async updateSubscription(userId, subscriptionId, newPlanId) {
    try {
      // Get current subscription
      const subscription = await UserSubscription.findOne({
        where: {
          id: subscriptionId,
          user_id: userId
        },
        include: [{ model: SubscriptionPlan, as: 'plan' }]
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Get new plan
      const newPlan = await SubscriptionPlan.findByPk(newPlanId);
      if (!newPlan || !newPlan.active) {
        throw new Error('Invalid or inactive subscription plan');
      }

      // Update Stripe subscription
      const stripeSubscription = await stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        {
          items: [{
            id: subscription.stripe_subscription_id,
            price: newPlan.stripe_price_id
          }],
          proration_behavior: 'create_prorations'
        }
      );

      // Update subscription in our database
      await subscription.update({
        subscription_plan_id: newPlanId,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000)
      });

      return await this.getUserSubscription(userId);

    } catch (error) {
      console.error('Subscription update error:', error);
      throw error;
    }
  }

  async cancelSubscription(userId, subscriptionId, cancelImmediately = false) {
    try {
      const subscription = await UserSubscription.findOne({
        where: {
          id: subscriptionId,
          user_id: userId
        }
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (cancelImmediately) {
        // Cancel immediately
        await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
        await subscription.update({
          status: 'cancelled',
          cancelled_at: new Date()
        });
      } else {
        // Cancel at period end
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          cancel_at_period_end: true
        });
        await subscription.update({
          cancel_at_period_end: true
        });
      }

      return {
        success: true,
        message: cancelImmediately 
          ? 'Subscription cancelled immediately'
          : 'Subscription will be cancelled at the end of the current billing period'
      };

    } catch (error) {
      console.error('Subscription cancellation error:', error);
      throw error;
    }
  }

  async reactivateSubscription(userId, subscriptionId) {
    try {
      const subscription = await UserSubscription.findOne({
        where: {
          id: subscriptionId,
          user_id: userId
        }
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (!subscription.cancel_at_period_end) {
        throw new Error('Subscription is not scheduled for cancellation');
      }

      // Reactivate in Stripe
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: false
      });

      // Update in our database
      await subscription.update({
        cancel_at_period_end: false
      });

      return {
        success: true,
        message: 'Subscription reactivated successfully'
      };

    } catch (error) {
      console.error('Subscription reactivation error:', error);
      throw error;
    }
  }

  async getUserSubscription(userId) {
    try {
      const subscription = await UserSubscription.findOne({
        where: {
          user_id: userId,
          status: ['active', 'pending', 'past_due']
        },
        include: [
          {
            model: SubscriptionPlan,
            as: 'plan'
          }
        ],
        order: [['created_at', 'DESC']]
      });

      return subscription;
    } catch (error) {
      console.error('Error getting user subscription:', error);
      throw error;
    }
  }

  async getAvailablePlans() {
    try {
      const plans = await SubscriptionPlan.findAll({
        where: { active: true },
        order: [['price_monthly', 'ASC']]
      });

      return plans;
    } catch (error) {
      console.error('Error getting available plans:', error);
      throw error;
    }
  }

  async handleWebhookEvent(event) {
    try {
      switch (event.type) {
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;

        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      console.error('Webhook handling error:', error);
      throw error;
    }
  }

  async handleSubscriptionUpdated(stripeSubscription) {
    try {
      const subscription = await UserSubscription.findOne({
        where: { stripe_subscription_id: stripeSubscription.id }
      });

      if (subscription) {
        await subscription.update({
          status: stripeSubscription.status,
          current_period_start: new Date(stripeSubscription.current_period_start * 1000),
          current_period_end: new Date(stripeSubscription.current_period_end * 1000),
          cancel_at_period_end: stripeSubscription.cancel_at_period_end
        });
      }
    } catch (error) {
      console.error('Error handling subscription updated:', error);
      throw error;
    }
  }

  async handleSubscriptionDeleted(stripeSubscription) {
    try {
      const subscription = await UserSubscription.findOne({
        where: { stripe_subscription_id: stripeSubscription.id }
      });

      if (subscription) {
        await subscription.update({
          status: 'cancelled',
          cancelled_at: new Date()
        });
      }
    } catch (error) {
      console.error('Error handling subscription deleted:', error);
      throw error;
    }
  }

  async handlePaymentSucceeded(invoice) {
    try {
      if (invoice.billing_reason === 'subscription_cycle') {
        // This is a recurring payment - add credits
        const subscription = await UserSubscription.findOne({
          where: { stripe_subscription_id: invoice.subscription },
          include: [{ model: SubscriptionPlan, as: 'plan' }]
        });

        if (subscription) {
          await this.creditService.handleSubscriptionRenewal(
            subscription.user_id,
            subscription.plan,
            {
              subscription_id: subscription.id,
              stripe_invoice_id: invoice.id
            }
          );
        }
      }
    } catch (error) {
      console.error('Error handling payment succeeded:', error);
      throw error;
    }
  }

  async handlePaymentFailed(invoice) {
    try {
      const subscription = await UserSubscription.findOne({
        where: { stripe_subscription_id: invoice.subscription }
      });

      if (subscription) {
        await subscription.update({
          status: 'past_due'
        });
      }
    } catch (error) {
      console.error('Error handling payment failed:', error);
      throw error;
    }
  }

  async getSubscriptionHistory(userId, options = {}) {
    try {
      const { limit = 10, offset = 0 } = options;

      const subscriptions = await UserSubscription.findAndCountAll({
        where: { user_id: userId },
        include: [
          {
            model: SubscriptionPlan,
            as: 'plan'
          }
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      return subscriptions;
    } catch (error) {
      console.error('Error getting subscription history:', error);
      throw error;
    }
  }
}

module.exports = SubscriptionService;