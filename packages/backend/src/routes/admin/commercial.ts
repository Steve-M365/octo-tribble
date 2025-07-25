import { Router } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';

import { getDatabase } from '../../database/init';
import { 
  Organization, 
  Subscription, 
  SubscriptionPlan, 
  UsageSummary,
  BillingAnalytics,
  FeatureFlag,
  PlanTier,
  SubscriptionStatus
} from '../../types';
import { logger } from '../../utils/logger';
import { asyncHandler, createError } from '../../middleware/errorHandler';
import { authenticateToken, AuthRequest, requireAdmin } from '../../middleware/auth';
import { logAudit } from '../../services/auditService';

export const commercialAdminRoutes = Router();

// All routes require admin authentication
commercialAdminRoutes.use(authenticateToken);
commercialAdminRoutes.use(requireAdmin);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
});

// Validation schemas
const subscriptionPlanSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  plan_type: Joi.string().valid('individual', 'team', 'enterprise').required(),
  tier: Joi.string().valid('free', 'starter', 'professional', 'business', 'enterprise').required(),
  price_monthly: Joi.number().min(0).required(),
  price_yearly: Joi.number().min(0).required(),
  currency: Joi.string().default('USD'),
  features: Joi.object().required(),
  limits: Joi.object().required(),
  is_active: Joi.boolean().default(true),
  is_popular: Joi.boolean().default(false)
});

const featureFlagSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  is_enabled: Joi.boolean().default(false),
  rollout_percentage: Joi.number().min(0).max(100).default(0),
  target_plans: Joi.array().items(Joi.string()).default([]),
  target_organizations: Joi.array().items(Joi.string()).default([]),
  conditions: Joi.array().default([])
});

// ============================================================================
// DASHBOARD & OVERVIEW
// ============================================================================

// Get commercial dashboard overview
commercialAdminRoutes.get('/dashboard', asyncHandler(async (req: AuthRequest, res) => {
  const db = getDatabase();

  // Get key metrics
  const [
    totalOrganizations,
    activeSubscriptions,
    totalRevenue,
    churnRate,
    trialConversions
  ] = await Promise.all([
    db.get('SELECT COUNT(*) as count FROM organizations WHERE is_active = 1'),
    db.get('SELECT COUNT(*) as count FROM subscriptions WHERE status = ?', ['active']),
    db.get(`
      SELECT COALESCE(SUM(amount_paid), 0) as total 
      FROM invoices 
      WHERE status = 'paid' AND created_at >= date('now', '-30 days')
    `),
    calculateChurnRate(),
    calculateTrialConversions()
  ]);

  // Get recent activities
  const recentSubscriptions = await db.all(`
    SELECT s.*, o.name as organization_name, sp.name as plan_name
    FROM subscriptions s
    JOIN organizations o ON s.organization_id = o.id
    JOIN subscription_plans sp ON s.plan_id = sp.id
    ORDER BY s.created_at DESC
    LIMIT 10
  `);

  // Get usage trends
  const usageTrends = await getUsageTrends();

  // Get revenue by plan
  const revenueByPlan = await getRevenueByPlan();

  const dashboardData = {
    metrics: {
      total_organizations: totalOrganizations.count,
      active_subscriptions: activeSubscriptions.count,
      monthly_revenue: totalRevenue.total,
      churn_rate: churnRate,
      trial_conversion_rate: trialConversions
    },
    recent_subscriptions: recentSubscriptions,
    usage_trends: usageTrends,
    revenue_by_plan: revenueByPlan,
    alerts: await getBusinessAlerts()
  };

  res.json({
    success: true,
    data: dashboardData
  });
}));

// ============================================================================
// SUBSCRIPTION PLAN MANAGEMENT
// ============================================================================

// Get all subscription plans
commercialAdminRoutes.get('/plans', asyncHandler(async (req: AuthRequest, res) => {
  const db = getDatabase();
  
  const plans = await db.all(`
    SELECT sp.*, 
           COUNT(s.id) as active_subscriptions,
           COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.amount_paid ELSE 0 END), 0) as total_revenue
    FROM subscription_plans sp
    LEFT JOIN subscriptions s ON sp.id = s.plan_id AND s.status = 'active'
    LEFT JOIN invoices i ON s.id = i.subscription_id
    GROUP BY sp.id
    ORDER BY sp.tier, sp.price_monthly
  `);

  const plansWithParsedData = plans.map(plan => ({
    ...plan,
    features: JSON.parse(plan.features || '{}'),
    limits: JSON.parse(plan.limits || '{}')
  }));

  res.json({
    success: true,
    data: plansWithParsedData
  });
}));

// Create new subscription plan
commercialAdminRoutes.post('/plans', asyncHandler(async (req: AuthRequest, res) => {
  const { error, value } = subscriptionPlanSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const db = getDatabase();
  const planId = uuidv4();
  const userId = req.user!.userId;

  // Create Stripe products and prices if not free plan
  let stripeData = {};
  if (value.tier !== 'free' && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripeProduct = await stripe.products.create({
        name: value.name,
        description: value.description,
        metadata: {
          plan_id: planId,
          tier: value.tier
        }
      });

      const monthlyPrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(value.price_monthly * 100),
        currency: value.currency.toLowerCase(),
        recurring: { interval: 'month' }
      });

      const yearlyPrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(value.price_yearly * 100),
        currency: value.currency.toLowerCase(),
        recurring: { interval: 'year' }
      });

      stripeData = {
        stripe_product_id: stripeProduct.id,
        stripe_price_id_monthly: monthlyPrice.id,
        stripe_price_id_yearly: yearlyPrice.id
      };
    } catch (stripeError) {
      logger.error('Stripe product creation failed', stripeError);
      // Continue without Stripe integration
    }
  }

  await db.run(`
    INSERT INTO subscription_plans (
      id, name, description, plan_type, tier, price_monthly, price_yearly, 
      currency, features, limits, is_active, is_popular, 
      stripe_product_id, stripe_price_id_monthly, stripe_price_id_yearly
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    planId,
    value.name,
    value.description,
    value.plan_type,
    value.tier,
    value.price_monthly,
    value.price_yearly,
    value.currency,
    JSON.stringify(value.features),
    JSON.stringify(value.limits),
    value.is_active,
    value.is_popular,
    stripeData.stripe_product_id || null,
    stripeData.stripe_price_id_monthly || null,
    stripeData.stripe_price_id_yearly || null
  ]);

  await logAudit(userId, 'CREATE_SUBSCRIPTION_PLAN', 'subscription_plan', planId, value);

  res.status(201).json({
    success: true,
    data: { id: planId }
  });
}));

// Update subscription plan
commercialAdminRoutes.put('/plans/:planId', asyncHandler(async (req: AuthRequest, res) => {
  const { planId } = req.params;
  const { error, value } = subscriptionPlanSchema.validate(req.body);
  
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const db = getDatabase();
  const userId = req.user!.userId;

  // Check if plan exists
  const existingPlan = await db.get('SELECT * FROM subscription_plans WHERE id = ?', [planId]);
  if (!existingPlan) {
    throw createError('Subscription plan not found', 404);
  }

  // Update plan
  await db.run(`
    UPDATE subscription_plans 
    SET name = ?, description = ?, plan_type = ?, tier = ?, 
        price_monthly = ?, price_yearly = ?, currency = ?, 
        features = ?, limits = ?, is_active = ?, is_popular = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    value.name,
    value.description,
    value.plan_type,
    value.tier,
    value.price_monthly,
    value.price_yearly,
    value.currency,
    JSON.stringify(value.features),
    JSON.stringify(value.limits),
    value.is_active,
    value.is_popular,
    planId
  ]);

  await logAudit(userId, 'UPDATE_SUBSCRIPTION_PLAN', 'subscription_plan', planId, value);

  res.json({
    success: true,
    message: 'Subscription plan updated successfully'
  });
}));

// ============================================================================
// ORGANIZATION & SUBSCRIPTION MANAGEMENT
// ============================================================================

// Get all organizations with subscription details
commercialAdminRoutes.get('/organizations', asyncHandler(async (req: AuthRequest, res) => {
  const { page = 1, limit = 50, search, plan_tier, status } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const db = getDatabase();
  
  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (search) {
    whereClause += ' AND (o.name LIKE ? OR o.billing_email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (plan_tier) {
    whereClause += ' AND sp.tier = ?';
    params.push(plan_tier);
  }

  if (status) {
    whereClause += ' AND s.status = ?';
    params.push(status);
  }

  const organizations = await db.all(`
    SELECT o.*, 
           s.status as subscription_status,
           s.current_period_end,
           sp.name as plan_name,
           sp.tier as plan_tier,
           sp.price_monthly,
           COUNT(om.id) as member_count,
           us.executions_used,
           us.executions_limit
    FROM organizations o
    LEFT JOIN subscriptions s ON o.subscription_id = s.id
    LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
    LEFT JOIN organization_members om ON o.id = om.organization_id AND om.status = 'active'
    LEFT JOIN usage_summaries us ON o.id = us.organization_id AND us.billing_period = strftime('%Y-%m', 'now')
    ${whereClause}
    GROUP BY o.id
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, Number(limit), offset]);

  const totalCount = await db.get(`
    SELECT COUNT(DISTINCT o.id) as count
    FROM organizations o
    LEFT JOIN subscriptions s ON o.subscription_id = s.id
    LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
    ${whereClause}
  `, params);

  res.json({
    success: true,
    data: {
      organizations: organizations.map(org => ({
        ...org,
        settings: JSON.parse(org.settings || '{}')
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount.count,
        pages: Math.ceil(totalCount.count / Number(limit))
      }
    }
  });
}));

// Get organization details
commercialAdminRoutes.get('/organizations/:orgId', asyncHandler(async (req: AuthRequest, res) => {
  const { orgId } = req.params;
  const db = getDatabase();

  const organization = await db.get(`
    SELECT o.*, 
           s.* as subscription_data,
           sp.name as plan_name,
           sp.tier as plan_tier,
           u.username as owner_username
    FROM organizations o
    LEFT JOIN subscriptions s ON o.subscription_id = s.id
    LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
    LEFT JOIN users u ON o.owner_id = u.id
    WHERE o.id = ?
  `, [orgId]);

  if (!organization) {
    throw createError('Organization not found', 404);
  }

  // Get members
  const members = await db.all(`
    SELECT om.*, u.username, u.email, u.last_login
    FROM organization_members om
    JOIN users u ON om.user_id = u.id
    WHERE om.organization_id = ?
    ORDER BY om.joined_at DESC
  `, [orgId]);

  // Get usage summary
  const usageSummary = await db.get(`
    SELECT * FROM usage_summaries 
    WHERE organization_id = ? AND billing_period = strftime('%Y-%m', 'now')
  `, [orgId]);

  // Get recent invoices
  const invoices = await db.all(`
    SELECT * FROM invoices 
    WHERE organization_id = ?
    ORDER BY created_at DESC
    LIMIT 10
  `, [orgId]);

  // Get usage history (last 12 months)
  const usageHistory = await db.all(`
    SELECT billing_period, executions_used, executions_limit
    FROM usage_summaries
    WHERE organization_id = ?
    ORDER BY billing_period DESC
    LIMIT 12
  `, [orgId]);

  res.json({
    success: true,
    data: {
      organization: {
        ...organization,
        settings: JSON.parse(organization.settings || '{}')
      },
      members,
      usage_summary: usageSummary,
      invoices: invoices.map(invoice => ({
        ...invoice,
        line_items: JSON.parse(invoice.line_items || '[]')
      })),
      usage_history: usageHistory
    }
  });
}));

// Update organization subscription
commercialAdminRoutes.put('/organizations/:orgId/subscription', asyncHandler(async (req: AuthRequest, res) => {
  const { orgId } = req.params;
  const { plan_id, billing_cycle } = req.body;

  const db = getDatabase();
  const userId = req.user!.userId;

  // Validate inputs
  if (!plan_id) {
    throw createError('Plan ID is required', 400);
  }

  // Check if organization exists
  const organization = await db.get('SELECT * FROM organizations WHERE id = ?', [orgId]);
  if (!organization) {
    throw createError('Organization not found', 404);
  }

  // Check if plan exists
  const plan = await db.get('SELECT * FROM subscription_plans WHERE id = ?', [plan_id]);
  if (!plan) {
    throw createError('Subscription plan not found', 404);
  }

  // Get current subscription
  let currentSubscription = null;
  if (organization.subscription_id) {
    currentSubscription = await db.get('SELECT * FROM subscriptions WHERE id = ?', [organization.subscription_id]);
  }

  let subscriptionId;

  if (currentSubscription) {
    // Update existing subscription
    subscriptionId = currentSubscription.id;
    await db.run(`
      UPDATE subscriptions 
      SET plan_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [plan_id, subscriptionId]);
  } else {
    // Create new subscription
    subscriptionId = uuidv4();
    const periodStart = new Date().toISOString();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    await db.run(`
      INSERT INTO subscriptions (
        id, organization_id, plan_id, status, current_period_start, current_period_end
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [subscriptionId, orgId, plan_id, 'active', periodStart, periodEnd]);

    // Update organization with subscription ID
    await db.run('UPDATE organizations SET subscription_id = ? WHERE id = ?', [subscriptionId, orgId]);
  }

  await logAudit(userId, 'UPDATE_ORGANIZATION_SUBSCRIPTION', 'organization', orgId, {
    old_plan: currentSubscription?.plan_id,
    new_plan: plan_id,
    subscription_id: subscriptionId
  });

  res.json({
    success: true,
    message: 'Organization subscription updated successfully'
  });
}));

// ============================================================================
// USAGE ANALYTICS & BILLING
// ============================================================================

// Get usage analytics
commercialAdminRoutes.get('/analytics/usage', asyncHandler(async (req: AuthRequest, res) => {
  const { period = 'month', plan_tier } = req.query;
  const db = getDatabase();

  // Get usage by plan
  let usageByPlan;
  if (plan_tier) {
    usageByPlan = await db.all(`
      SELECT sp.tier, sp.name, 
             SUM(us.executions_used) as total_executions,
             COUNT(DISTINCT us.organization_id) as organization_count,
             AVG(us.executions_used) as avg_executions_per_org
      FROM usage_summaries us
      JOIN subscriptions s ON us.organization_id = s.organization_id
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE sp.tier = ? AND us.billing_period >= date('now', '-12 months')
      GROUP BY sp.tier, sp.name
    `, [plan_tier]);
  } else {
    usageByPlan = await db.all(`
      SELECT sp.tier, sp.name, 
             SUM(us.executions_used) as total_executions,
             COUNT(DISTINCT us.organization_id) as organization_count,
             AVG(us.executions_used) as avg_executions_per_org
      FROM usage_summaries us
      JOIN subscriptions s ON us.organization_id = s.organization_id
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE us.billing_period >= date('now', '-12 months')
      GROUP BY sp.tier, sp.name
      ORDER BY total_executions DESC
    `);
  }

  // Get usage trends over time
  const usageTrends = await db.all(`
    SELECT us.billing_period,
           SUM(us.executions_used) as total_executions,
           COUNT(DISTINCT us.organization_id) as active_organizations,
           AVG(us.executions_used) as avg_per_organization
    FROM usage_summaries us
    WHERE us.billing_period >= date('now', '-12 months')
    GROUP BY us.billing_period
    ORDER BY us.billing_period
  `);

  // Get top organizations by usage
  const topOrganizations = await db.all(`
    SELECT o.name, o.id,
           sp.tier as plan_tier,
           us.executions_used,
           us.executions_limit,
           (us.executions_used * 100.0 / us.executions_limit) as usage_percentage
    FROM usage_summaries us
    JOIN organizations o ON us.organization_id = o.id
    JOIN subscriptions s ON o.subscription_id = s.id
    JOIN subscription_plans sp ON s.plan_id = sp.id
    WHERE us.billing_period = strftime('%Y-%m', 'now')
    ORDER BY us.executions_used DESC
    LIMIT 20
  `);

  res.json({
    success: true,
    data: {
      usage_by_plan: usageByPlan,
      usage_trends: usageTrends,
      top_organizations: topOrganizations
    }
  });
}));

// Get revenue analytics
commercialAdminRoutes.get('/analytics/revenue', asyncHandler(async (req: AuthRequest, res) => {
  const { period = 'month' } = req.query;
  const db = getDatabase();

  // Monthly recurring revenue
  const mrr = await db.get(`
    SELECT SUM(sp.price_monthly) as mrr
    FROM subscriptions s
    JOIN subscription_plans sp ON s.plan_id = sp.id
    WHERE s.status = 'active'
  `);

  // Annual recurring revenue
  const arr = await db.get(`
    SELECT SUM(sp.price_yearly) as arr
    FROM subscriptions s
    JOIN subscription_plans sp ON s.plan_id = sp.id
    WHERE s.status = 'active'
  `);

  // Revenue by plan
  const revenueByPlan = await db.all(`
    SELECT sp.tier, sp.name,
           COUNT(s.id) as subscription_count,
           SUM(sp.price_monthly) as monthly_revenue,
           SUM(sp.price_yearly) as yearly_revenue
    FROM subscriptions s
    JOIN subscription_plans sp ON s.plan_id = sp.id
    WHERE s.status = 'active'
    GROUP BY sp.tier, sp.name
    ORDER BY monthly_revenue DESC
  `);

  // Revenue trends (last 12 months)
  const revenueTrends = await db.all(`
    SELECT strftime('%Y-%m', i.created_at) as month,
           SUM(i.amount_paid) as revenue,
           COUNT(i.id) as invoice_count
    FROM invoices i
    WHERE i.status = 'paid' AND i.created_at >= date('now', '-12 months')
    GROUP BY strftime('%Y-%m', i.created_at)
    ORDER BY month
  `);

  // Churn analysis
  const churnData = await getChurnAnalysis();

  res.json({
    success: true,
    data: {
      mrr: mrr.mrr || 0,
      arr: arr.arr || 0,
      revenue_by_plan: revenueByPlan,
      revenue_trends: revenueTrends,
      churn_analysis: churnData
    }
  });
}));

// ============================================================================
// FEATURE FLAGS MANAGEMENT
// ============================================================================

// Get all feature flags
commercialAdminRoutes.get('/feature-flags', asyncHandler(async (req: AuthRequest, res) => {
  const db = getDatabase();
  
  const featureFlags = await db.all(`
    SELECT * FROM feature_flags 
    ORDER BY created_at DESC
  `);

  const flagsWithParsedData = featureFlags.map(flag => ({
    ...flag,
    target_plans: JSON.parse(flag.target_plans || '[]'),
    target_organizations: JSON.parse(flag.target_organizations || '[]'),
    conditions: JSON.parse(flag.conditions || '[]')
  }));

  res.json({
    success: true,
    data: flagsWithParsedData
  });
}));

// Create feature flag
commercialAdminRoutes.post('/feature-flags', asyncHandler(async (req: AuthRequest, res) => {
  const { error, value } = featureFlagSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const db = getDatabase();
  const flagId = uuidv4();
  const userId = req.user!.userId;

  await db.run(`
    INSERT INTO feature_flags (
      id, name, description, is_enabled, rollout_percentage,
      target_plans, target_organizations, conditions
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    flagId,
    value.name,
    value.description,
    value.is_enabled,
    value.rollout_percentage,
    JSON.stringify(value.target_plans),
    JSON.stringify(value.target_organizations),
    JSON.stringify(value.conditions)
  ]);

  await logAudit(userId, 'CREATE_FEATURE_FLAG', 'feature_flag', flagId, value);

  res.status(201).json({
    success: true,
    data: { id: flagId }
  });
}));

// Update feature flag
commercialAdminRoutes.put('/feature-flags/:flagId', asyncHandler(async (req: AuthRequest, res) => {
  const { flagId } = req.params;
  const { error, value } = featureFlagSchema.validate(req.body);
  
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const db = getDatabase();
  const userId = req.user!.userId;

  const existingFlag = await db.get('SELECT * FROM feature_flags WHERE id = ?', [flagId]);
  if (!existingFlag) {
    throw createError('Feature flag not found', 404);
  }

  await db.run(`
    UPDATE feature_flags 
    SET name = ?, description = ?, is_enabled = ?, rollout_percentage = ?,
        target_plans = ?, target_organizations = ?, conditions = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    value.name,
    value.description,
    value.is_enabled,
    value.rollout_percentage,
    JSON.stringify(value.target_plans),
    JSON.stringify(value.target_organizations),
    JSON.stringify(value.conditions),
    flagId
  ]);

  await logAudit(userId, 'UPDATE_FEATURE_FLAG', 'feature_flag', flagId, value);

  res.json({
    success: true,
    message: 'Feature flag updated successfully'
  });
}));

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function calculateChurnRate(): Promise<number> {
  const db = getDatabase();
  
  const result = await db.get(`
    SELECT 
      COUNT(CASE WHEN status = 'canceled' AND canceled_at >= date('now', '-30 days') THEN 1 END) as churned,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active
    FROM subscriptions
  `);
  
  return result.active > 0 ? (result.churned / result.active) * 100 : 0;
}

async function calculateTrialConversions(): Promise<number> {
  const db = getDatabase();
  
  const result = await db.get(`
    SELECT 
      COUNT(CASE WHEN status = 'active' AND trial_end IS NOT NULL THEN 1 END) as converted,
      COUNT(CASE WHEN trial_end IS NOT NULL THEN 1 END) as total_trials
    FROM subscriptions
    WHERE trial_end >= date('now', '-90 days')
  `);
  
  return result.total_trials > 0 ? (result.converted / result.total_trials) * 100 : 0;
}

async function getUsageTrends() {
  const db = getDatabase();
  
  return await db.all(`
    SELECT billing_period,
           SUM(executions_used) as total_executions,
           COUNT(DISTINCT organization_id) as active_orgs
    FROM usage_summaries
    WHERE billing_period >= date('now', '-6 months')
    GROUP BY billing_period
    ORDER BY billing_period
  `);
}

async function getRevenueByPlan() {
  const db = getDatabase();
  
  return await db.all(`
    SELECT sp.name, sp.tier,
           COUNT(s.id) as subscriptions,
           SUM(sp.price_monthly) as monthly_revenue
    FROM subscription_plans sp
    LEFT JOIN subscriptions s ON sp.id = s.plan_id AND s.status = 'active'
    GROUP BY sp.id
    ORDER BY monthly_revenue DESC
  `);
}

async function getBusinessAlerts() {
  const db = getDatabase();
  const alerts = [];

  // High churn rate alert
  const churnRate = await calculateChurnRate();
  if (churnRate > 10) {
    alerts.push({
      type: 'warning',
      title: 'High Churn Rate',
      message: `Current churn rate is ${churnRate.toFixed(1)}%`,
      action: 'Review customer feedback and retention strategies'
    });
  }

  // Low trial conversion alert
  const trialConversion = await calculateTrialConversions();
  if (trialConversion < 20) {
    alerts.push({
      type: 'warning',
      title: 'Low Trial Conversion',
      message: `Trial conversion rate is ${trialConversion.toFixed(1)}%`,
      action: 'Review onboarding process and trial experience'
    });
  }

  // Organizations near limits
  const nearLimitOrgs = await db.get(`
    SELECT COUNT(*) as count
    FROM usage_summaries
    WHERE billing_period = strftime('%Y-%m', 'now')
    AND (executions_used * 100.0 / executions_limit) > 80
  `);

  if (nearLimitOrgs.count > 0) {
    alerts.push({
      type: 'info',
      title: 'Organizations Near Limits',
      message: `${nearLimitOrgs.count} organizations are near their usage limits`,
      action: 'Consider reaching out with upgrade offers'
    });
  }

  return alerts;
}

async function getChurnAnalysis() {
  const db = getDatabase();
  
  return await db.all(`
    SELECT sp.tier,
           COUNT(s.id) as total_subscriptions,
           COUNT(CASE WHEN s.status = 'canceled' THEN 1 END) as churned_subscriptions,
           (COUNT(CASE WHEN s.status = 'canceled' THEN 1 END) * 100.0 / COUNT(s.id)) as churn_rate
    FROM subscriptions s
    JOIN subscription_plans sp ON s.plan_id = sp.id
    GROUP BY sp.tier
    ORDER BY churn_rate DESC
  `);
}