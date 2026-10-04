-- ShadowGuard Platform — PostgreSQL Initialization Script
-- Runs once on first container startup

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create default admin user
-- Password: 'password' (bcrypt hash)
-- CHANGE THIS IN PRODUCTION
INSERT INTO users (id, email, username, hashed_password, role, is_active)
VALUES (
  uuid_generate_v4(),
  'admin@shadowguard.kz',
  'admin',
  '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
  'admin',
  true
) ON CONFLICT DO NOTHING;

-- Create default analyst user
INSERT INTO users (id, email, username, hashed_password, role, is_active)
VALUES (
  uuid_generate_v4(),
  'analyst@shadowguard.kz',
  'analyst',
  '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
  'analyst',
  true
) ON CONFLICT DO NOTHING;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_module_tasks_status ON module_tasks(status);
CREATE INDEX IF NOT EXISTS idx_module_tasks_module_id ON module_tasks(module_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_dismissed ON alerts(is_dismissed);
CREATE INDEX IF NOT EXISTS idx_shared_entities_type_value ON shared_entities(entity_type, entity_value);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
