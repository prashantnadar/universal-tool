-- Add Pro plan to the existing plan_type enum
ALTER TYPE public.plan_type ADD VALUE IF NOT EXISTS 'pro';

-- Add Pro to the existing plan limits.
-- Pro has unlimited usage, just like Premium.
INSERT INTO public.plan_limits (plan, daily_limit)
VALUES ('pro', -1)
ON CONFLICT (plan)
DO UPDATE SET daily_limit = EXCLUDED.daily_limit;