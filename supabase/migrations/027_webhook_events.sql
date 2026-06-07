-- ============================================================
-- Stripe Webhook Idempotency — işlenmiş event'leri takip et
-- ============================================================

CREATE TABLE IF NOT EXISTS webhook_events (
  event_id    text PRIMARY KEY,              -- Stripe event ID (evt_xxx)
  event_type  text NOT NULL,
  processed_at timestamptz DEFAULT now()
);

-- 90 gün sonrası için otomatik temizleme indeksi
CREATE INDEX idx_webhook_events_processed_at ON webhook_events(processed_at);

-- RLS: sadece service role erişebilir
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_events_service_only" ON webhook_events
  FOR ALL USING (auth.role() = 'service_role');
