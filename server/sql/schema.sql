CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    subscription_plan TEXT NOT NULL DEFAULT 'none' CHECK (subscription_plan IN ('none', 'weekly', 'monthly')),
    subscription_status TEXT NOT NULL DEFAULT 'inactive' CHECK (subscription_status IN ('inactive', 'pending', 'active', 'expired')),
    subscription_start TIMESTAMPTZ,
    subscription_expiry TIMESTAMPTZ,
    payment_screenshot TEXT,
    free_access_mid_week TIMESTAMPTZ,
    free_access_weekend TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);

CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY,
    match_date TIMESTAMPTZ NOT NULL,
    league TEXT NOT NULL,
    match TEXT NOT NULL,
    tip TEXT NOT NULL,
    odds NUMERIC(6,2) NOT NULL,
    result TEXT NOT NULL DEFAULT 'Pending' CHECK (result IN ('Pending', 'Won', 'Loss', 'Return')),
    prediction_type TEXT NOT NULL,
    confidence INTEGER,
    recommended_stake INTEGER,
    prob_max NUMERIC(5,2),
    final_score TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY,
    page_title TEXT NOT NULL,
    logo_url TEXT
);

CREATE TABLE IF NOT EXISTS supported_leagues (
    id SERIAL PRIMARY KEY,
    settings_id INTEGER NOT NULL REFERENCES app_settings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    logo_url TEXT,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('new_predictions', 'subscription_approved', 'subscription_expiring')),
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_read BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

INSERT INTO app_settings (id, page_title, logo_url)
VALUES (1, 'ProTips Football Predictor', NULL)
ON CONFLICT (id) DO NOTHING;
