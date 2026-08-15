CREATE TABLE IF NOT EXISTS tax_provider (
  id text PRIMARY KEY,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

INSERT INTO tax_provider (id, is_enabled) VALUES ('tp_system', true) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS payment_provider (
  id text PRIMARY KEY,
  is_installed boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

INSERT INTO payment_provider (id, is_installed) VALUES ('pp_stripe_stripe', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO payment_provider (id, is_installed) VALUES ('pp_system_default', true) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS fulfillment_provider (
  id text PRIMARY KEY,
  is_installed boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

INSERT INTO fulfillment_provider (id, is_installed) VALUES ('fp_manual', true) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS notification_provider (
  id text PRIMARY KEY,
  is_installed boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

INSERT INTO notification_provider (id, is_installed) VALUES ('np_email', true) ON CONFLICT (id) DO NOTHING;

SELECT 'Batch 1 done' as result;
