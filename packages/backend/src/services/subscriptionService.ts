import { getDatabase } from '../database/init';
import { 
  SubscriptionPlan, 
  Subscription, 
  Organization, 
  UsageRecord, 
  UsageSummary,
  PlanTier,
  SubscriptionStatus,
  UsageResourceType
} from '../types';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class SubscriptionService {
  
  // ============================================================================
  // PLAN MANAGEMENT
  // ============================================================================
  
  static async createDefaultPlans(): Promise<void> {
    const db = getDatabase();
    
    const defaultPlans: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>[] = [
      {
        name: 'Free Individual',
        description: 'Perfect for personal use and small projects',
        plan_type: 'individual',
        tier: 'free',
        price_monthly: 0,
        price_yearly: 0,
        currency: 'USD',
        is_active: true,
        is_popular: false,
        features: {
          script_executions: true,
          basic_ide: true,
          audit_logging: true,
          email_support: false,
          priority_support: false,
          custom_branding: false,
          api_access: false,
          sso_integration: false,
          advanced_analytics: false,
          workflow_engine: false,
          custom_integrations: false
        },
        limits: {
          daily_executions: 10,
          monthly_executions: 300,
          max_users: 1,
          max_scripts: 50,
          max_script_size_mb: 1,
          storage_gb: 1,
          retention_days: 30,
          concurrent_executions: 1,
          api_calls_per_day: 0
        },
        stripe_product_id: null,
        stripe_price_id_monthly: null,
        stripe_price_id_yearly: null
      },
      {
        name: 'Starter Team',
        description: 'Great for small teams getting started',
        plan_type: 'team',
        tier: 'starter',
        price_monthly: 29,
        price_yearly: 290,
        currency: 'USD',
        is_active: true,
        is_popular: true,
        features: {
          script_executions: true,
          basic_ide: true,
          audit_logging: true,
          email_support: true,
          priority_support: false,
          custom_branding: false,
          api_access: true,
          sso_integration: false,
          advanced_analytics: false,
          workflow_engine: false,
          custom_integrations: false
        },
        limits: {
          daily_executions: 500,
          monthly_executions: 15000,
          max_users: 5,
          max_scripts: 200,
          max_script_size_mb: 5,
          storage_gb: 10,
          retention_days: 90,
          concurrent_executions: 3,
          api_calls_per_day: 1000
        },
        stripe_product_id: null,
        stripe_price_id_monthly: null,
        stripe_price_id_yearly: null
      },
      {
        name: 'Professional Team',
        description: 'Advanced features for growing teams',
        plan_type: 'team',
        tier: 'professional',
        price_monthly: 79,
        price_yearly: 790,
        currency: 'USD',
        is_active: true,
        is_popular: false,
        features: {
          script_executions: true,
          basic_ide: true,
          audit_logging: true,
          email_support: true,
          priority_support: true,
          custom_branding: true,
          api_access: true,
          sso_integration: true,
          advanced_analytics: true,
          workflow_engine: true,
          custom_integrations: false
        },
        limits: {
          daily_executions: 2000,
          monthly_executions: 60000,
          max_users: 25,
          max_scripts: 1000,
          max_script_size_mb: 25,
          storage_gb: 100,
          retention_days: 365,
          concurrent_executions: 10,
          api_calls_per_day: 10000
        },
        stripe_product_id: null,
        stripe_price_id_monthly: null,
        stripe_price_id_yearly: null
      },
      {
        name: 'Business Enterprise',
        description: 'Comprehensive solution for large organizations',
        plan_type: 'enterprise',
        tier: 'business',
        price_monthly: 199,
        price_yearly: 1990,
        currency: 'USD',
        is_active: true,
        is_popular: false,
        features: {
          script_executions: true,
          basic_ide: true,
          audit_logging: true,
          email_support: true,
          priority_support: true,
          custom_branding: true,
          api_access: true,
          sso_integration: true,
          advanced_analytics: true,
          workflow_engine: true,
          custom_integrations: true
        },
        limits: {
          daily_executions: 10000,
          monthly_executions: 300000,
          max_users: 100,
          max_scripts: 5000,
          max_script_size_mb: 100,
          storage_gb: 1000,
          retention_days: 2555, // 7 years
          concurrent_executions: 50,
          api_calls_per_day: 100000
        },
        stripe_product_id: null,
        stripe_price_id_monthly: null,
        stripe_price_id_yearly: null
      },
      {
        name: 'Enterprise Unlimited',
        description: 'Custom solution with unlimited resources',
        plan_type: 'enterprise',
        tier: 'enterprise',
        price_monthly: 499,
        price_yearly: 4990,
        currency: 'USD',
        is_active: true,
        is_popular: false,
        features: {
          script_executions: true,
          basic_ide: true,
          audit_logging: true,
          email_support: true,
          priority_support: true,
          custom_branding: true,
          api_access: true,
          sso_integration: true,
          advanced_analytics: true,
          workflow_engine: true,
          custom_integrations: true
        },
        limits: {
          daily_executions: -1, // Unlimited
          monthly_executions: -1, // Unlimited
          max_users: -1, // Unlimited
          max_scripts: -1, // Unlimited
          max_script_size_mb: 500,
          storage_gb: -1, // Unlimited
          retention_days: -1, // Unlimited
          concurrent_executions: 200,
          api_calls_per_day: -1 // Unlimited
        },
        stripe_product_id: null,
        stripe_price_id_monthly: null,
        stripe_price_id_yearly: null
      }
    ];

    for (const plan of defaultPlans) {
      const planId = uuidv4();
      
      // Check if plan already exists
      const existingPlan = await db.get(
        'SELECT id FROM subscription_plans WHERE name = ? AND tier = ?',
        [plan.name, plan.tier]
      );
      
      if (!existingPlan) {
        await db.run(`
          INSERT INTO subscription_plans (
            id, name, description, plan_type, tier, price_monthly, price_yearly,
            currency, features, limits, is_active, is_popular,
            stripe_product_id, stripe_price_id_monthly, stripe_price_id_yearly
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          planId,
          plan.name,
          plan.description,
          plan.plan_type,
          plan.tier,
          plan.price_monthly,
          plan.price_yearly,
          plan.currency,
          JSON.stringify(plan.features),
          JSON.stringify(plan.limits),
          plan.is_active,
          plan.is_popular,
          plan.stripe_product_id,
          plan.stripe_price_id_monthly,
          plan.stripe_price_id_yearly
        ]);
        
        logger.info(`Created default subscription plan: ${plan.name}`);
      }
    }
  }

  static async getPlanById(planId: string): Promise<SubscriptionPlan | null> {
    const db = getDatabase();
    
    const plan = await db.get('SELECT * FROM subscription_plans WHERE id = ?', [planId]);
    
    if (!plan) return null;
    
    return {
      ...plan,
      features: JSON.parse(plan.features || '{}'),
      limits: JSON.parse(plan.limits || '{}')
    };
  }

  static async getActivePlans(): Promise<SubscriptionPlan[]> {
    const db = getDatabase();
    
    const plans = await db.all(`
      SELECT * FROM subscription_plans 
      WHERE is_active = 1 
      ORDER BY 
        CASE tier 
          WHEN 'free' THEN 1 
          WHEN 'starter' THEN 2 
          WHEN 'professional' THEN 3 
          WHEN 'business' THEN 4 
          WHEN 'enterprise' THEN 5 
        END,
        price_monthly ASC
    `);
    
    return plans.map(plan => ({
      ...plan,
      features: JSON.parse(plan.features || '{}'),
      limits: JSON.parse(plan.limits || '{}')
    }));
  }

  // ============================================================================
  // USAGE TRACKING
  // ============================================================================

  static async recordUsage(
    organizationId: string,
    resourceType: UsageResourceType,
    quantity: number = 1,
    metadata: any = {}
  ): Promise<void> {
    const db = getDatabase();
    const usageId = uuidv4();
    
    await db.run(`
      INSERT INTO usage_records (
        id, organization_id, resource_type, quantity, unit, metadata
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      usageId,
      organizationId,
      resourceType,
      quantity,
      'count',
      JSON.stringify(metadata)
    ]);

    // Update usage summary for current billing period
    await this.updateUsageSummary(organizationId, resourceType, quantity);
  }

  static async updateUsageSummary(
    organizationId: string,
    resourceType: UsageResourceType,
    quantity: number
  ): Promise<void> {
    const db = getDatabase();
    const billingPeriod = new Date().toISOString().substring(0, 7); // YYYY-MM format

    // Get current usage summary
    let usageSummary = await db.get(`
      SELECT * FROM usage_summaries 
      WHERE organization_id = ? AND billing_period = ?
    `, [organizationId, billingPeriod]);

    if (!usageSummary) {
      // Get organization's plan limits
      const org = await db.get(`
        SELECT s.plan_id FROM organizations o
        JOIN subscriptions s ON o.subscription_id = s.id
        WHERE o.id = ?
      `, [organizationId]);

      let limits = { daily_executions: 10, monthly_executions: 300 }; // Default free limits
      
      if (org?.plan_id) {
        const plan = await this.getPlanById(org.plan_id);
        if (plan) {
          limits = plan.limits;
        }
      }

      // Create new usage summary
      const summaryId = uuidv4();
      await db.run(`
        INSERT INTO usage_summaries (
          id, organization_id, billing_period, executions_used, executions_limit,
          storage_used_gb, storage_limit_gb, api_calls_used, api_calls_limit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        summaryId,
        organizationId,
        billingPeriod,
        resourceType === 'script_execution' ? quantity : 0,
        limits.monthly_executions || -1,
        0, // Will be updated separately
        limits.storage_gb || -1,
        resourceType === 'api_call' ? quantity : 0,
        limits.api_calls_per_day ? limits.api_calls_per_day * 30 : -1 // Approximate monthly limit
      ]);
    } else {
      // Update existing summary
      if (resourceType === 'script_execution') {
        await db.run(`
          UPDATE usage_summaries 
          SET executions_used = executions_used + ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [quantity, usageSummary.id]);
      } else if (resourceType === 'api_call') {
        await db.run(`
          UPDATE usage_summaries 
          SET api_calls_used = api_calls_used + ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [quantity, usageSummary.id]);
      }
    }
  }

  static async checkUsageLimit(
    organizationId: string,
    resourceType: UsageResourceType,
    requestedQuantity: number = 1
  ): Promise<{ allowed: boolean; current: number; limit: number; remaining: number }> {
    const db = getDatabase();
    const billingPeriod = new Date().toISOString().substring(0, 7);

    // Get current usage
    const usageSummary = await db.get(`
      SELECT * FROM usage_summaries 
      WHERE organization_id = ? AND billing_period = ?
    `, [organizationId, billingPeriod]);

    // Get organization's plan
    const org = await db.get(`
      SELECT s.plan_id FROM organizations o
      JOIN subscriptions s ON o.subscription_id = s.id
      WHERE o.id = ?
    `, [organizationId]);

    let limits = { daily_executions: 10, monthly_executions: 300 }; // Default free limits
    
    if (org?.plan_id) {
      const plan = await this.getPlanById(org.plan_id);
      if (plan) {
        limits = plan.limits;
      }
    }

    let currentUsage = 0;
    let limit = 0;

    if (resourceType === 'script_execution') {
      currentUsage = usageSummary?.executions_used || 0;
      limit = limits.monthly_executions || 300;
    } else if (resourceType === 'api_call') {
      currentUsage = usageSummary?.api_calls_used || 0;
      limit = limits.api_calls_per_day ? limits.api_calls_per_day * 30 : 1000; // Monthly approximation
    }

    // -1 means unlimited
    if (limit === -1) {
      return {
        allowed: true,
        current: currentUsage,
        limit: -1,
        remaining: -1
      };
    }

    const remaining = Math.max(0, limit - currentUsage);
    const allowed = currentUsage + requestedQuantity <= limit;

    return {
      allowed,
      current: currentUsage,
      limit,
      remaining
    };
  }

  static async getDailyUsage(organizationId: string): Promise<number> {
    const db = getDatabase();
    const today = new Date().toISOString().substring(0, 10); // YYYY-MM-DD format

    const result = await db.get(`
      SELECT COUNT(*) as count FROM usage_records 
      WHERE organization_id = ? 
      AND resource_type = 'script_execution'
      AND DATE(created_at) = ?
    `, [organizationId, today]);

    return result?.count || 0;
  }

  static async checkDailyLimit(organizationId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
    const db = getDatabase();
    
    // Get organization's plan
    const org = await db.get(`
      SELECT s.plan_id FROM organizations o
      JOIN subscriptions s ON o.subscription_id = s.id
      WHERE o.id = ?
    `, [organizationId]);

    let dailyLimit = 10; // Default free limit
    
    if (org?.plan_id) {
      const plan = await this.getPlanById(org.plan_id);
      if (plan) {
        dailyLimit = plan.limits.daily_executions || 10;
      }
    }

    const currentUsage = await this.getDailyUsage(organizationId);
    
    // -1 means unlimited
    if (dailyLimit === -1) {
      return {
        allowed: true,
        current: currentUsage,
        limit: -1
      };
    }

    return {
      allowed: currentUsage < dailyLimit,
      current: currentUsage,
      limit: dailyLimit
    };
  }

  // ============================================================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================================================

  static async createOrganizationWithFreePlan(
    name: string,
    ownerId: string,
    billingEmail: string
  ): Promise<string> {
    const db = getDatabase();
    const organizationId = uuidv4();
    const subscriptionId = uuidv4();

    // Get free plan
    const freePlan = await db.get(`
      SELECT id FROM subscription_plans 
      WHERE tier = 'free' AND is_active = 1 
      LIMIT 1
    `);

    if (!freePlan) {
      throw new Error('Free plan not found');
    }

    // Create subscription
    const periodStart = new Date().toISOString();
    const periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year

    await db.run(`
      INSERT INTO subscriptions (
        id, organization_id, plan_id, status, current_period_start, current_period_end
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [subscriptionId, organizationId, freePlan.id, 'active', periodStart, periodEnd]);

    // Create organization
    await db.run(`
      INSERT INTO organizations (
        id, name, owner_id, subscription_id, billing_email, company_size, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [organizationId, name, ownerId, subscriptionId, billingEmail, 'small', true]);

    // Add owner as organization member
    await db.run(`
      INSERT INTO organization_members (
        id, organization_id, user_id, role, status
      ) VALUES (?, ?, ?, ?, ?)
    `, [uuidv4(), organizationId, ownerId, 'owner', 'active']);

    logger.info(`Created organization ${name} with free plan for user ${ownerId}`);
    
    return organizationId;
  }

  static async upgradeSubscription(
    organizationId: string,
    newPlanId: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly'
  ): Promise<void> {
    const db = getDatabase();

    // Get organization and current subscription
    const org = await db.get(`
      SELECT o.*, s.plan_id as current_plan_id FROM organizations o
      JOIN subscriptions s ON o.subscription_id = s.id
      WHERE o.id = ?
    `, [organizationId]);

    if (!org) {
      throw new Error('Organization not found');
    }

    // Get new plan
    const newPlan = await this.getPlanById(newPlanId);
    if (!newPlan) {
      throw new Error('New plan not found');
    }

    // Update subscription
    await db.run(`
      UPDATE subscriptions 
      SET plan_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = ?
    `, [newPlanId, organizationId]);

    // Update usage limits for current period
    const billingPeriod = new Date().toISOString().substring(0, 7);
    await db.run(`
      UPDATE usage_summaries 
      SET executions_limit = ?, 
          storage_limit_gb = ?,
          api_calls_limit = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = ? AND billing_period = ?
    `, [
      newPlan.limits.monthly_executions || -1,
      newPlan.limits.storage_gb || -1,
      newPlan.limits.api_calls_per_day ? newPlan.limits.api_calls_per_day * 30 : -1,
      organizationId,
      billingPeriod
    ]);

    logger.info(`Upgraded organization ${organizationId} from plan ${org.current_plan_id} to ${newPlanId}`);
  }

  static async getOrganizationUsage(organizationId: string): Promise<UsageSummary | null> {
    const db = getDatabase();
    const billingPeriod = new Date().toISOString().substring(0, 7);

    const usage = await db.get(`
      SELECT * FROM usage_summaries 
      WHERE organization_id = ? AND billing_period = ?
    `, [organizationId, billingPeriod]);

    return usage || null;
  }

  static async getUpgradeRecommendation(organizationId: string): Promise<{
    should_upgrade: boolean;
    current_plan: string;
    recommended_plan: string | null;
    reason: string;
    usage_percentage: number;
  } | null> {
    const db = getDatabase();
    
    // Get current plan and usage
    const org = await db.get(`
      SELECT o.*, s.plan_id, sp.tier as current_tier, sp.name as current_plan_name
      FROM organizations o
      JOIN subscriptions s ON o.subscription_id = s.id
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE o.id = ?
    `, [organizationId]);

    if (!org) return null;

    const usage = await this.getOrganizationUsage(organizationId);
    if (!usage) return null;

    const usagePercentage = usage.executions_limit > 0 
      ? (usage.executions_used / usage.executions_limit) * 100 
      : 0;

    // Recommend upgrade if usage is > 80%
    if (usagePercentage > 80 && org.current_tier !== 'enterprise') {
      const nextTierMap = {
        'free': 'starter',
        'starter': 'professional', 
        'professional': 'business',
        'business': 'enterprise'
      };

      const recommendedTier = nextTierMap[org.current_tier as keyof typeof nextTierMap];
      
      const recommendedPlan = await db.get(`
        SELECT id, name FROM subscription_plans 
        WHERE tier = ? AND is_active = 1 
        LIMIT 1
      `, [recommendedTier]);

      return {
        should_upgrade: true,
        current_plan: org.current_plan_name,
        recommended_plan: recommendedPlan?.name || null,
        reason: `You're using ${usagePercentage.toFixed(1)}% of your monthly limit`,
        usage_percentage: usagePercentage
      };
    }

    return {
      should_upgrade: false,
      current_plan: org.current_plan_name,
      recommended_plan: null,
      reason: `You're using ${usagePercentage.toFixed(1)}% of your monthly limit`,
      usage_percentage: usagePercentage
    };
  }
}