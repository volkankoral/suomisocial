-- 031_agent.sql
-- Tam otonom agent: haftalık strateji planları ve plan kalemleri

-- ── Haftalık planlar ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_plans (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'planning'
                    CHECK (status IN ('planning','ready','done','failed')),
  week_start        date NOT NULL,
  strategy_summary  text,          -- LLM'in haftalık strateji özeti
  items_total       integer DEFAULT 0,
  items_approved    integer DEFAULT 0,
  error_message     text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- ── Plan kalemleri ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_plan_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         uuid NOT NULL REFERENCES agent_plans(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  draft_id        uuid REFERENCES content_drafts(id) ON DELETE SET NULL,
  scheduled_date  date NOT NULL,
  rationale       text,           -- LLM'in "neden bu içerik bu gün" açıklaması
  priority        integer DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','generating','ready','approved','rejected')),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ── İndeksler ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_agent_plans_org    ON agent_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_plans_status ON agent_plans(status);
CREATE INDEX IF NOT EXISTS idx_agent_plan_items_plan ON agent_plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_agent_plan_items_org  ON agent_plan_items(organization_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE agent_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org member own plans"       ON agent_plans      FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "org member own plan items"  ON agent_plan_items FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "service role plans"         ON agent_plans      FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role plan items"    ON agent_plan_items FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── updated_at trigger ───────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TRIGGER update_agent_plans_updated_at
    BEFORE UPDATE ON agent_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_agent_plan_items_updated_at
    BEFORE UPDATE ON agent_plan_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
