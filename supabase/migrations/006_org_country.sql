-- Organizasyonlara ülke kodu ekle (çok ülkeli takvim için)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS country_code text DEFAULT 'FI'
    CHECK (length(country_code) = 2);

-- Mevcut org'lar için varsayılan FI (Finlandiya)
UPDATE organizations SET country_code = 'FI' WHERE country_code IS NULL;
