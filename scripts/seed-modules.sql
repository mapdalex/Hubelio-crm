-- Seed the 7 modules into the database
INSERT INTO "Module" ("moduleId", "name", "description", "icon", "features", "basePrice", "status", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('CORE', 'Kern-Modul', 'Basis CRM Funktionen: Kunden, Kontakte, Firmeneinstellungen', 'LayoutDashboard', '["dashboard", "customers", "tickets", "todos", "files"]', 0, 'ACTIVE', 1, NOW(), NOW()),
  ('MESSAGE', 'Nachrichten', 'E-Mail und Messaging Verwaltung', 'MessageSquare', '["email", "inbox", "templates", "automation"]', 99, 'ACTIVE', 2, NOW(), NOW()),
  ('SALES', 'Vertrieb', 'Angebote, Auftraege, Rechnungen, Pipeline', 'ShoppingCart', '["domains", "services", "pricing", "orders"]', 149, 'ACTIVE', 3, NOW(), NOW()),
  ('IT', 'IT & Support', 'Ticket-System, Asset-Management, Wissensdatenbank', 'Headphones', '["tickets", "assets", "knowledge_base", "sla"]', 149, 'ACTIVE', 4, NOW(), NOW()),
  ('SOCIALS', 'Social Media', 'Social Media Management und Planung', 'Share2', '["accounts", "posting", "analytics", "scheduling"]', 199, 'BETA', 5, NOW(), NOW()),
  ('CAMPAIGNS', 'Kampagnen', 'Marketing Kampagnen und E-Mail-Marketing', 'TrendingUp', '["campaign_builder", "audience", "tracking", "reports"]', 249, 'BETA', 6, NOW(), NOW()),
  ('ANALYTICS', 'Analytics', 'Berichte, Dashboards, KPIs, Auswertungen', 'BarChart3', '["dashboards", "reports", "export", "insights"]', 299, 'ACTIVE', 7, NOW(), NOW())
ON CONFLICT ("moduleId") DO NOTHING;
