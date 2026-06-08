-- ============================================================
-- Kredi Bakiyesi — one-time satın alınan AI credits
-- ============================================================

-- Org başına kredi bakiyesi
CREATE TABLE IF NOT EXISTS credit_balance (
  organization_id  uuid    PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  balance          integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_purchased  integer NOT NULL DEFAULT 0,
  updated_at       timestamptz DEFAULT now()
);

-- Kredi işlem geçmişi
CREATE TABLE IF NOT EXISTS credit_transactions (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount                    integer     NOT NULL,   -- pozitif = satın alma, negatif = tüketim
  description               text,
  stripe_payment_intent_id  text,
  created_at                timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE credit_balance       ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions  ENABLE ROW LEVEL SECURITY;

-- Kullanıcı kendi bakiyesini okuyabilir
CREATE POLICY "credit_balance_org_read" ON credit_balance
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Service role her şeyi yapabilir
CREATE POLICY "credit_balance_service_all" ON credit_balance
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "credit_transactions_org_read" ON credit_transactions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "credit_transactions_service_all" ON credit_transactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Fonksiyonlar ──────────────────────────────────────────────────────────────

-- Kredi ekle (webhook'tan çağrılır)
CREATE OR REPLACE FUNCTION add_credits(
  p_org_id         uuid,
  p_amount         integer,
  p_description    text    DEFAULT NULL,
  p_payment_intent text    DEFAULT NULL
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO credit_balance (organization_id, balance, total_purchased)
  VALUES (p_org_id, p_amount, p_amount)
  ON CONFLICT (organization_id) DO UPDATE SET
    balance         = credit_balance.balance + p_amount,
    total_purchased = credit_balance.total_purchased + p_amount,
    updated_at      = now();

  INSERT INTO credit_transactions (organization_id, amount, description, stripe_payment_intent_id)
  VALUES (p_org_id, p_amount, p_description, p_payment_intent);
END;
$$;

-- Kredi tüket (içerik üretiminde çağrılır) — bakiye varsa true, yoksa false döner
CREATE OR REPLACE FUNCTION consume_credit(p_org_id uuid)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  current_balance integer;
BEGIN
  SELECT balance INTO current_balance
  FROM credit_balance
  WHERE organization_id = p_org_id
  FOR UPDATE;

  IF current_balance IS NULL OR current_balance <= 0 THEN
    RETURN false;
  END IF;

  UPDATE credit_balance
  SET balance    = balance - 1,
      updated_at = now()
  WHERE organization_id = p_org_id;

  INSERT INTO credit_transactions (organization_id, amount, description)
  VALUES (p_org_id, -1, 'content_generation');

  RETURN true;
END;
$$;

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_credit_transactions_org
  ON credit_transactions(organization_id, created_at DESC);
