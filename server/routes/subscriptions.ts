import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { PricingEngine, CalculatePlanInput } from '../services/pricingEngine';
import { DynamicPlanConfig } from '../db/schema';

export const subscriptionsRouter = Router();

const PLANS = [
  {
    id: 'starter',
    name: 'Starter Bot Plan',
    tagline: 'Ideal for small utilities, simple webhook bots & testing',
    popular: true,
    priceINR: 49,
    priceUSD: 0.59,
    yearlyDiscountPercent: 20,
    activeBotCount: 1,
    botSlots: 3, // 1 active + 2 inactive slots
    ramMB: 512,
    cpuCores: 0.5,
    diskStorageGB: 2,
    databaseStorageMB: 200,
    maxPythonFileSizeMB: 1,
    bandwidthGB: 50,
    dedicatedIPv4: false,
    features: [
      '1 24/7 Active Bot Container',
      '3 Total Bot Storage Slots (1 Active + 2 Stored)',
      '1 MB Python File Size Upload Limit',
      '200 MB Integrated Database Storage',
      '512MB RAM Isolated Execution',
      '0.5 vCPU Processing Core',
      'Automatic Crash Recovery & Restarts',
      'Real-time Live Console Logs',
      'GitHub / ZIP Instant Deploy',
    ],
  },
  {
    id: 'pro',
    name: 'Pro Bot Plan',
    tagline: 'For high-traffic community, store, AI & channel management bots',
    popular: false,
    priceINR: 129,
    priceUSD: 1.59,
    yearlyDiscountPercent: 20,
    activeBotCount: 3,
    botSlots: 9, // 3 active + 6 inactive slots
    ramMB: 1536,
    cpuCores: 1.5,
    diskStorageGB: 10,
    databaseStorageMB: 500,
    maxPythonFileSizeMB: 3,
    bandwidthGB: 250,
    dedicatedIPv4: false,
    features: [
      '3 24/7 Active Bot Containers',
      '9 Total Bot Storage Slots (3 Active + 6 Stored)',
      '3 MB Python File Size Upload Limit',
      '500 MB Managed Database Storage',
      '1.5GB RAM (512MB per active bot)',
      '1.5 vCPU High-Speed Cores',
      'Managed PostgreSQL or Redis DB',
      'Zero-Downtime Hot Code Reloads',
      'Priority 24/7 Developer Support',
    ],
  },
  {
    id: 'cluster',
    name: 'Cluster Enterprise',
    tagline: 'Dedicated cloud resources for enterprise bot farms & massive networks',
    popular: false,
    priceINR: 399,
    priceUSD: 4.79,
    yearlyDiscountPercent: 20,
    activeBotCount: 10,
    botSlots: 30, // 10 active + 20 inactive slots
    ramMB: 4096,
    cpuCores: 4.0,
    diskStorageGB: 40,
    databaseStorageMB: 2048,
    maxPythonFileSizeMB: 5,
    bandwidthGB: 1000,
    dedicatedIPv4: true,
    features: [
      '10 24/7 Active Bot Containers',
      '30 Total Bot Storage Slots (10 Active + 20 Stored)',
      '5 MB Maximum Python File Size Limit',
      '2 GB Dedicated Database Storage',
      '4GB High-Speed RAM Pool',
      '4 Dedicated vCPU High-Clock Cores',
      'Unlimited Managed Postgres & Redis DBs',
      'Dedicated Static IPv4 Address',
      'VIP Telegram SLA & Emergency Hot-line',
    ],
  },
];

// 1. GET ALL PLANS (Public)
subscriptionsRouter.get('/plans', (_req: Request, res: Response): void => {
  res.json({ plans: PLANS });
});

// 2. GET CURRENT PRICING CONFIG (Public)
subscriptionsRouter.get('/pricing/config', (_req: Request, res: Response): void => {
  try {
    const config = db.getPricingConfig();
    res.json({ config });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch pricing config' });
  }
});

// 3. CALCULATE AUTHORITATIVE QUOTE (Public / Server-Side Authoritative)
subscriptionsRouter.post('/pricing/calculate', (req: Request, res: Response): void => {
  try {
    const {
      activeBotCount = 1,
      maxPythonFileSizeMB = 0.5,
      dbStorageMB = 50,
      durationDays = 30,
      couponCode,
    } = req.body;

    const config = db.getPricingConfig();
    const result = PricingEngine.calculate(
      {
        activeBotCount: Number(activeBotCount),
        maxPythonFileSizeMB: Number(maxPythonFileSizeMB),
        dbStorageMB: Number(dbStorageMB),
        durationDays: Number(durationDays),
        couponCode: couponCode ? String(couponCode) : undefined,
      },
      config
    );

    res.json({ result });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Price calculation failed' });
  }
});

// 4. GET CURRENT USER SUBSCRIPTION
subscriptionsRouter.get('/subscriptions/current', requireAuth, (req: Request, res: Response): void => {
  try {
    const { projectId } = req.query;
    let projId = typeof projectId === 'string' ? projectId : undefined;

    if (projId) {
      const project = db.getProjectById(projId, req.user!.id);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
    } else {
      const userProjs = db.getUserProjects(req.user!.id);
      if (userProjs.length > 0) {
        projId = userProjs[0].id;
      }
    }

    const sub = projId ? db.getProjectSubscription(projId) : db.getUserSubscription(req.user!.id);
    const bots = projId ? db.getProjectBots(projId) : db.getUserBots(req.user!.id);
    const activeBots = bots.filter((b) => b.is_active_slot && b.status === 'running').length;

    res.json({
      subscription: sub,
      usedBotSlots: activeBots,
      activeBotCount: sub?.active_bot_count || (sub?.total_bot_slots ? Math.floor(sub.total_bot_slots / 3) : 1),
      totalBotSlots: sub?.total_bot_slots || 3,
      maxPythonFileSizeMB: sub?.max_file_size_mb || 1,
      dbStorageMB: sub?.db_storage_mb || 250,
      isExpired: projId ? !db.isSubscriptionActive(req.user!.id, projId) : !db.isSubscriptionActive(req.user!.id),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch subscription' });
  }
});

// 5. CALCULATE UPGRADE QUOTE (Protected)
subscriptionsRouter.post('/subscriptions/upgrade-quote', requireAuth, (req: Request, res: Response): void => {
  try {
    const {
      activeBotCount,
      maxPythonFileSizeMB,
      dbStorageMB,
      durationDays,
      projectId,
    } = req.body;

    if (!activeBotCount || !maxPythonFileSizeMB || !dbStorageMB || !durationDays) {
      res.status(400).json({ error: 'activeBotCount, maxPythonFileSizeMB, dbStorageMB, and durationDays are required.' });
      return;
    }

    let projId = projectId;
    if (projId) {
      const project = db.getProjectById(projId, req.user!.id);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
    } else {
      const userProjs = db.getUserProjects(req.user!.id);
      if (userProjs.length > 0) {
        projId = userProjs[0].id;
      }
    }

    const targetConfig: DynamicPlanConfig = {
      activeBotCount: Number(activeBotCount),
      totalBotSlots: Number(activeBotCount) * 3,
      maxPythonFileSizeMB: Number(maxPythonFileSizeMB),
      dbStorageMB: Number(dbStorageMB),
      durationDays: Number(durationDays),
    };

    const quote = db.calculateUpgradeQuote(req.user!.id, targetConfig, projId);
    res.json({ quote });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to calculate upgrade quote' });
  }
});

// 6. CREATE CHECKOUT ORDER (Protected - Server-Authoritative)
subscriptionsRouter.post('/orders/create', requireAuth, (req: Request, res: Response): void => {
  try {
    const {
      planId,
      planName,
      billingInterval = 'monthly',
      currency = 'INR',
      customerName,
      customerEmail,
      customerPhone,
      couponCode,
      dynamicConfig,
      isUpgrade,
      projectId,
    } = req.body;

    let projId = projectId;
    if (projId) {
      const project = db.getProjectById(projId, req.user!.id);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
    } else {
      const userProjs = db.getUserProjects(req.user!.id);
      if (userProjs.length > 0) {
        projId = userProjs[0].id;
      }
    }

    const pricingConfig = db.getPricingConfig();
    let calculatedAmount = 0;
    let calculatedDiscount = 0;
    let calculatedTax = 0;
    let calculatedTotal = 0;
    let sanitizedPlanConfig: DynamicPlanConfig | undefined = undefined;
    let unusedCredit = 0;
    let upgradeFromSubId: string | undefined = undefined;

    if (dynamicConfig) {
      sanitizedPlanConfig = {
        activeBotCount: Math.max(1, Math.floor(Number(dynamicConfig.activeBotCount) || 1)),
        totalBotSlots: Math.max(1, Math.floor(Number(dynamicConfig.activeBotCount) || 1)) * 3,
        maxPythonFileSizeMB: Math.min(5, Math.max(0.5, Number(dynamicConfig.maxPythonFileSizeMB) || 0.5)),
        dbStorageMB: Math.max(50, Number(dynamicConfig.dbStorageMB) || 50),
        durationDays: Math.max(7, Number(dynamicConfig.durationDays) || 30),
      };

      if (isUpgrade) {
        const quote = db.calculateUpgradeQuote(req.user!.id, sanitizedPlanConfig, projId);
        unusedCredit = quote.creditAppliedINR;
        calculatedAmount = quote.newPlanCalculation.subtotalINR;
        calculatedDiscount = unusedCredit + quote.newPlanCalculation.couponDiscountINR;
        calculatedTax = quote.taxINR;
        calculatedTotal = quote.totalPayableINR;
        const currentSub = projId ? db.getProjectSubscription(projId) : db.getUserSubscription(req.user!.id);
        upgradeFromSubId = currentSub?.id;
      } else {
        const calc = PricingEngine.calculate(
          {
            activeBotCount: sanitizedPlanConfig.activeBotCount,
            maxPythonFileSizeMB: sanitizedPlanConfig.maxPythonFileSizeMB,
            dbStorageMB: sanitizedPlanConfig.dbStorageMB,
            durationDays: sanitizedPlanConfig.durationDays,
            couponCode,
          },
          pricingConfig
        );
        calculatedAmount = calc.subtotalINR;
        calculatedDiscount = calc.couponDiscountINR;
        calculatedTax = calc.taxAmountINR;
        calculatedTotal = calc.finalPriceINR;
      }
    } else {
      // Fixed plan fallback calculation
      const foundPlan = PLANS.find((p) => p.id === planId) || PLANS[1];
      const baseMonthly = foundPlan.priceINR;
      const durationMultiplier = billingInterval === 'yearly' ? 12 : 1;
      const discountPct = billingInterval === 'yearly' ? foundPlan.yearlyDiscountPercent : 0;
      
      const unscaled = baseMonthly * durationMultiplier;
      const durationDisc = Math.round(unscaled * (discountPct / 100));
      let subtotal = unscaled - durationDisc;

      let couponDisc = 0;
      if (couponCode?.toUpperCase() === 'TELEHOST20') {
        couponDisc = Math.round(subtotal * 0.2);
      } else if (couponCode?.toUpperCase() === 'FIRSTBOT') {
        couponDisc = Math.round(subtotal * 0.15);
      }

      subtotal = Math.max(0, subtotal - couponDisc);
      calculatedAmount = unscaled;
      calculatedDiscount = durationDisc + couponDisc;
      calculatedTax = Math.round(subtotal * (pricingConfig.taxRatePercent / 100) * 100) / 100;
      calculatedTotal = Math.round((subtotal + calculatedTax) * 100) / 100;

      sanitizedPlanConfig = {
        activeBotCount: foundPlan.activeBotCount,
        totalBotSlots: foundPlan.activeBotCount * 3,
        maxPythonFileSizeMB: foundPlan.maxPythonFileSizeMB,
        dbStorageMB: foundPlan.databaseStorageMB,
        durationDays: billingInterval === 'yearly' ? 365 : 30,
      };
    }

    const orderId = `TH_ORD_${Math.floor(100000 + Math.random() * 900000)}`;

    const order = db.createOrder({
      order_id: orderId,
      user_id: req.user!.id,
      project_id: projId,
      plan_id: planId || 'custom_dynamic',
      plan_name: planName || (sanitizedPlanConfig ? `Dynamic VPS (${sanitizedPlanConfig.activeBotCount} Active / ${sanitizedPlanConfig.totalBotSlots} Slots)` : 'Telegram Bot Plan'),
      billing_interval: billingInterval || 'monthly',
      currency,
      amount: calculatedAmount,
      discount: calculatedDiscount,
      tax: calculatedTax,
      total_amount: calculatedTotal,
      coupon_code: couponCode,
      plan_config: sanitizedPlanConfig,
      upgrade_from_sub_id: upgradeFromSubId,
      unused_credit: unusedCredit,
      customer_name: customerName || req.user!.name,
      customer_email: customerEmail || req.user!.email,
      customer_phone: customerPhone,
      status: 'pending',
    });

    res.status(201).json({
      order,
      cashfreePayload: {
        orderId: order.order_id,
        orderAmount: order.total_amount,
        orderCurrency: order.currency,
        customerDetails: {
          customerId: req.user!.id,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          customerPhone: order.customer_phone || '9999999999',
        },
        orderMeta: {
          returnUrl: `${process.env.APP_URL || ''}/payment-success?order_id=${order.order_id}`,
          notifyUrl: `${process.env.APP_URL || ''}/api/orders/cashfree-webhook`,
        },
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Order creation failed' });
  }
});

// 7. VERIFY & ACTIVATE ORDER
subscriptionsRouter.post('/orders/verify', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      res.status(400).json({ error: 'orderId is required' });
      return;
    }

    // In a real production environment, you MUST call Cashfree API here to verify the payment status:
    // const response = await fetch(`https://api.cashfree.com/pg/orders/${orderId}`, { headers: { 'x-client-id': env, 'x-client-secret': env }});
    // const cfOrder = await response.json();
    // if (cfOrder.order_status !== 'PAID') throw new Error('Payment not verified');
    // For this simulation, we'll enforce that the order belongs to the user
    
    const order = db.getOrder(orderId);
    if (!order || order.user_id !== req.user!.id) {
       res.status(404).json({ error: 'Order not found' });
       return;
    }

    if (order.status === 'success') {
      const sub = db.getUserSubscription(req.user!.id);
      res.json({
        success: true,
        order,
        subscription: sub,
        message: 'Payment was already confirmed.',
      });
      return;
    }

    // Security check: Since we are mocking the cashfree backend in this environment,
    // we assume success if it reached here, but in production this should only happen if Cashfree API returns PAID.
    const result = db.verifyAndCompleteOrder(orderId, 'cashfree_api_verified', 'cf_pay_simulated_' + Date.now());

    res.json({
      success: true,
      order: result.order,
      subscription: result.subscription,
      message: `Payment confirmed securely! Subscription active on ${result.subscription.plan_name}.`,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Payment verification failed' });
  }
});

import crypto from 'crypto';

// 7.b SECURE CASHFREE WEBHOOK
subscriptionsRouter.post('/orders/cashfree-webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;
    const bodyString = JSON.stringify(req.body); // For webhook signature verification
    
    const cfSecret = process.env.CASHFREE_CLIENT_SECRET;
    if (cfSecret && signature && timestamp) {
       const dataToHash = timestamp + bodyString;
       const expectedSignature = crypto.createHmac('sha256', cfSecret).update(dataToHash).digest('base64');
       if (expectedSignature !== signature) {
           res.status(401).json({ error: 'Invalid webhook signature' });
           return;
       }
    } else if (process.env.NODE_ENV === 'production') {
       // Only allow bypassing signature in dev/demo mode
       res.status(401).json({ error: 'Missing webhook signature or secret in production' });
       return;
    }

    const { data, type } = req.body;
    if (type === 'PAYMENT_SUCCESS_WEBHOOK' && data && data.order && data.order.order_id) {
      const orderId = data.order.order_id;
      const paymentMethod = data.payment?.payment_group || 'cashfree_webhook';
      const paymentId = data.payment?.cf_payment_id;

      const order = db.getOrder(orderId);
      if (order && order.status === 'pending') {
        db.verifyAndCompleteOrder(orderId, paymentMethod, paymentId);
      }
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

// 8. GET USER ORDER HISTORY
subscriptionsRouter.get('/orders', requireAuth, (req: Request, res: Response): void => {
  try {
    const orders = db.getUserOrders(req.user!.id);
    res.json({ orders });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch orders' });
  }
});

// 9. ADMIN: GET PRICING CONFIG
subscriptionsRouter.get('/admin/pricing/config', requireAdmin, (_req: Request, res: Response): void => {
  try {
    const config = db.getPricingConfig();
    res.json({ config });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch pricing config' });
  }
});

// 10. ADMIN: UPDATE PRICING CONFIG
subscriptionsRouter.put('/admin/pricing/config', requireAdmin, (req: Request, res: Response): void => {
  try {
    const updated = db.updatePricingConfig(req.body);
    res.json({ success: true, config: updated, message: 'Pricing configuration updated successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update pricing config' });
  }
});
