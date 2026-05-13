-- Stripe entegrasyonu için gerekli alanlar

-- Organizations: Stripe müşteri ID
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Plans: Stripe price ID'leri
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS stripe_price_id_monthly text,
  ADD COLUMN IF NOT EXISTS stripe_price_id_yearly   text;

-- Subscriptions: Stripe abonelik ID ve dönem bilgisi
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id      text,
  ADD COLUMN IF NOT EXISTS trial_ends_at          timestamptz;

-- İndeks
CREATE INDEX IF NOT EXISTS organizations_stripe_customer_id_idx ON organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_sub_id_idx ON subscriptions(stripe_subscription_id);
