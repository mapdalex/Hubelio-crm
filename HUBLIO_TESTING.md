# Hublio CRM - Multi-Tenant Module System

## 🚀 Schnellstart

### 1. Setup ausführen
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

Oder manuell:
```bash
# Abhängigkeiten installieren
pnpm install

# Datenbank aufsetzen
pnpm db:push

# Seed-Daten erstellen (Module, Test-Company, Admin-Benutzer)
pnpm db:seed

# Dev-Server starten
pnpm dev
```

### 2. Login

**Standard Test-Credentials:**
- Email: `admin@example.com`
- Passwort: `password123`
- Unternehmen: Test Company

## 📋 Features zum Testen

### Multi-Tenant System
- ✅ Unternehmen mit separaten Daten
- ✅ Benutzer können mehreren Unternehmen angehören
- ✅ Company Selector in der Sidebar zum Wechseln
- ✅ Role-based Access Control (OWNER, ADMIN, MANAGER, MEMBER, VIEWER)

### Modul-System
- ✅ 6 Module: CORE, MESSAGE, SALES, SOCIALS, CAMPAIGNS, ANALYTICS
- ✅ Unterschiedliche Abonnement-Tier (FREE, STARTER, PRO, ENTERPRISE)
- ✅ Dynamische Navigation basierend auf Modul-Zugriff
- ✅ Modul-Permissions pro Benutzer

### Einstellungen
1. **Unternehmen** (`/settings/company`)
   - Unternehmensinformationen bearbeiten
   - Zeigt alle Benutzer

2. **Module** (`/settings/modules`)
   - Alle verfügbaren Module anzeigen
   - Abonnement-Status prüfen
   - Module aktivieren/deaktivieren

3. **Benutzer** (`/settings/users`)
   - Benutzer pro Unternehmen verwalten
   - Rollen zuweisen

### Sidebar Navigation
- Dynamische Navigation basierend auf Module-Zugriff
- Nur Module anzeigen, die abonniert sind
- CORE Funktionen immer verfügbar (Dashboard, Kunden, Tickets)

## 🧪 Test-Szenarien

### Szenario 1: Multi-Company
1. Melden Sie sich als Admin an
2. Im Sidebar "Company Selector" öffnen
3. Sie sehen "Test Company"
4. Neue Unternehmen können über API erstellt werden:
```bash
curl -X POST http://localhost:3000/api/companies \
  -H "Content-Type: application/json" \
  -d '{"name":"New Company","slug":"new-company"}'
```

### Szenario 2: Module Zugriff
1. Gehen Sie zu `/settings/modules`
2. Sie sollten alle 6 Module mit Status sehen
3. Der Admin hat Zugriff auf alle Module
4. PRO Tier zeigt alle Features

### Szenario 3: Sidebar Navigation
1. Schauen Sie auf die linke Sidebar
2. Sie sollten sehen:
   - Dashboard (CORE)
   - Kunden (CORE)
   - Verkauf (SALES)
   - Tickets (CORE)
   - Nachrichten (MESSAGE)
   - Soziale Medien (SOCIALS)
   - Kampagnen (CAMPAIGNS)
   - Analytics (ANALYTICS)
   - Todos (CORE)
   - Datenablage (CORE)

3. Admin Sektion mit Einstellungen

### Szenario 4: Rollen & Permissions
1. Erstellen Sie neue Benutzer über die API
2. Weisen Sie unterschiedliche Rollen zu (ADMIN, MANAGER, MEMBER, VIEWER)
3. Testen Sie mit unterschiedlichen Konten
4. Permissions sollten sich in der Sidebar widerspiegeln

## 🔌 API Endpoints

### Unternehmen
```bash
# Alle Unternehmen des aktuellen Benutzers
GET /api/companies

# Unternehmen Detail
GET /api/companies/{id}

# Unternehmen erstellen
POST /api/companies

# Unternehmen aktualisieren
PUT /api/companies/{id}

# Unternehmen Benutzer
GET /api/companies/{id}/users
POST /api/companies/{id}/users
PUT /api/companies/{id}/users/{userId}
DELETE /api/companies/{id}/users/{userId}
```

### Module
```bash
# Alle Module
GET /api/modules
```

### Abonnements
```bash
# Abos eines Unternehmens
GET /api/subscriptions?companyId={id}

# Abo aktualisieren (Module aktivieren/deaktivieren)
PUT /api/subscriptions/{id}

# Modul für Abo hinzufügen
POST /api/subscriptions
```

### Session / Auth
```bash
# Aktuelle Session
GET /api/auth/session

# Unternehmen wechseln
POST /api/auth/switch-company
```

## 📁 Projekt-Struktur

```
/vercel/share/v0-project/
├── app/
│   ├── (dashboard)/
│   │   ├── settings/
│   │   │   ├── company/         # Unternehmens-Einstellungen
│   │   │   └── modules/         # Modul-Einstellungen
│   │   └── ...
│   └── api/
│       ├── auth/
│       ├── companies/           # Unternehmens-API
│       ├── modules/             # Module-API
│       └── subscriptions/       # Abos-API
├── lib/
│   ├── auth.ts                  # Auth mit Company Context
│   ├── auth-context.tsx         # React Context mit Company
│   ├── module-manager.ts        # Modul-Verwaltung
│   └── multi-tenant.ts          # Multi-Tenant Utilities
├── components/
│   ├── company-selector.tsx     # Company Selector
│   └── app-sidebar.tsx          # Module-aware Sidebar
└── prisma/
    ├── schema.prisma            # Datenbank Schema mit Company Models
    └── seed.ts                  # Test-Daten
```

## 🐛 Troubleshooting

### Datenbank-Fehler
```bash
# Datenbank zurücksetzen
rm prisma/dev.db
pnpm db:push
pnpm db:seed
```

### Abhängigkeits-Fehler
```bash
# Abhängigkeiten neu installieren
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### .env.local fehlt
```bash
# Automatisch mit Setup erstellt, oder manuell:
cp .env.example .env.local
# JWT_SECRET mit zufälligem Wert füllen
```

## 📝 Nächste Schritte

1. **Module implementieren** - Spezifische Features für jedes Modul
2. **Benutzer-Verwaltung** - Erweiterte Permissions und Rollen
3. **Billing** - Abonnement-Verwaltung und Zahlungen
4. **Daten-Migration** - Existierende Daten mit Unternehmens-Zuordnung
5. **API-Dokumentation** - OpenAPI/Swagger Docs

---

**Viel Erfolg beim Testen! 🎉**
