# Hubelio CRM - Deployment mit Portainer

Diese Anleitung beschreibt, wie du das Hubelio CRM-System mit Docker und Portainer auf einem eigenen Server installierst.

## Voraussetzungen

- Docker und Docker Compose installiert
- Portainer CE (Community Edition) auf deinem Server laufen
- Ein Linux-Server (Ubuntu, Debian, CentOS, etc.)

## Step 1: Docker und Portainer installieren

### Wenn Docker noch nicht installiert ist:

```bash
# Docker installieren
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Aktuelle Docker Version prüfen
docker --version
docker-compose --version
```

### Portainer installieren:

```bash
# Portainer Volume erstellen
docker volume create portainer_data

# Portainer Container starten
docker run -d \
  -p 8000:8000 \
  -p 9000:9000 \
  -p 9443:9443 \
  --name=portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

Portainer ist dann erreichbar unter: **https://your-server-ip:9443**

## Step 2: Hubelio CRM in Portainer deployen

### Option A: Aus GitHub Repository

1. **Öffne Portainer**: `https://your-server-ip:9443`
2. **Gehe zu**: Environments > Dein Server (meist "local")
3. **Klicke auf**: Stacks > Add Stack
4. **Wähle**: "Repository" Tab
5. **Trage ein**:
   - Repository URL: `https://github.com/mapdalex/Hubelio-crm.git`
   - Repository Reference: `main` oder dein Branch
   - Compose Path: `docker-compose.yml`
6. **Gehe zu**: Web editor und passe `portainer-stack.yml` an

### Option B: Direkt YAML einfügen

1. **Öffne Portainer**: `https://your-server-ip:9443`
2. **Gehe zu**: Environments > Dein Server
3. **Klicke auf**: Stacks > Add Stack
4. **Wähle**: "Web Editor" Tab
5. **Kopiere den Inhalt** aus `portainer-stack.yml` in den Editor
6. **Klicke**: Deploy Stack

### Option C: Mit Docker CLI

```bash
# Repository klonen
cd /opt
git clone https://github.com/mapdalex/Hubelio-crm.git
cd Hubelio-crm

# .env Datei erstellen
cp .env.example .env

# Umgebungsvariablen setzen (siehe Step 3)

# Mit Docker Compose starten
docker-compose up -d
```

## Step 3: Umgebungsvariablen konfigurieren

Vor dem Deployment brauchst du diese Variablen:

### Minimum (erforderlich):
```
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=ÄNDERE-MICH-ZU-EINEM-SICHEREN-PASSWORT
POSTGRES_DB=crm_database
AUTH_SECRET=ÄNDERE-MICH-ZU-EINEM-MINDESTENS-32-ZEICHEN-GEHEIMEN-SCHLÜSSEL
NEXT_PUBLIC_APP_URL=https://deine-domain.de
```

### AUTH_SECRET generieren (Linux/Mac):
```bash
openssl rand -base64 32
```

### In Portainer umgeben die Variablen setzen:

1. Im "Add Stack" Dialog scrolle zu **Env**
2. Trage die obigen Variablen ein, oder
3. Nutze das **Environment File Upload**

Beispiel .env Datei:
```
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=SuperSicheresPasswort123!@#
POSTGRES_DB=crm_database
AUTH_SECRET=fL2k9mX8pQ7vR4wT6yU5iO3eJ9bN2mL8X1cK4vZ7dP5fH3
NEXT_PUBLIC_APP_URL=https://crm.example.com
APP_PORT=3000
DB_PORT=5432
COOKIE_SECURE=true
```

## Step 4: Nach dem Deployment

1. **Öffne die App**: `http://your-server-ip:3000` oder `https://deine-domain.de`
2. **Setup-Seite**: Gehe zu `/setup` um den ersten Admin-Benutzer zu erstellen
3. **Datenbank-Schema**: Wird automatisch beim Start erstellt

## Logs ansehen

In Portainer:
1. Klicke auf den Stack
2. Services > **crm-app**
3. Logs (oben rechts)

Oder mit CLI:
```bash
# App Logs
docker logs hubelio-crm-app

# Datenbank Logs
docker logs hubelio-crm-db

# Echtzeit Logs
docker logs -f hubelio-crm-app
```

## Datenbank-Zugriff

### Mit pgAdmin (Web Interface):

```bash
# pgAdmin Container starten
docker run -d \
  --name pgadmin \
  -p 5050:80 \
  --network crm-network \
  -e PGADMIN_DEFAULT_EMAIL=admin@example.com \
  -e PGADMIN_DEFAULT_PASSWORD=admin \
  dpage/pgadmin4:latest
```

Dann: `http://your-server-ip:5050`

### Mit CLI direkt:
```bash
# In den Datenbank-Container gehen
docker exec -it hubelio-crm-db psql -U crm_user -d crm_database

# SQL Befehle ausführen
SELECT * FROM users;
```

## SSL/HTTPS mit Reverse Proxy

Empfohlen für Production:

### Mit Nginx + Let's Encrypt:

```bash
# Nginx Container mit Let's Encrypt
docker run -d \
  --name nginx-proxy \
  --network crm-network \
  -p 80:80 \
  -p 443:443 \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/www/certbot:/var/www/certbot \
  -e DEFAULT_HOST=crm.example.com \
  jwilder/nginx-proxy:latest
```

Oder nutze **Caddy** (noch einfacher):

```bash
# docker-compose.yml Auszug
caddy:
  image: caddy:latest
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./Caddyfile:/etc/caddy/Caddyfile
    - caddy_data:/data
  networks:
    - crm-network
```

## Häufige Probleme

### Problem: Datenbank-Verbindung fehlgeschlagen

```bash
# Container neustarten
docker-compose restart crm-db

# Logs prüfen
docker logs crm-db

# Mit CLI verbinden und prüfen
docker exec crm-db pg_isready -U crm_user
```

### Problem: Port bereits in Verwendung

```bash
# Andere Container auf Port finden
lsof -i :3000

# Oder in der portainer-stack.yml Port ändern
# "3001:3000" statt "3000:3000"
```

### Problem: Out of Memory

Erhöhe Docker-Limits in Portainer:
1. Stack > crm-app > Edit
2. Scrolle zu "Resources"
3. Setze Memory Limit (z.B. 2GB)

## Backups

### Automatische Backups mit Cron:

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/crm"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Datenbank Backup
docker exec hubelio-crm-db pg_dump -U crm_user crm_database | \
  gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Uploads Backup
tar czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/lib/docker/volumes/crm_uploads_data/

# Alte Backups (älter als 30 Tage) löschen
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup erstellt: $BACKUP_DIR/db_$DATE.sql.gz"
```

Hinzufügen zu Crontab:
```bash
crontab -e
# Täglich um 2 Uhr
0 2 * * * /path/to/backup.sh
```

## Updaten

```bash
# Repository aktualisieren
cd /opt/Hubelio-crm
git pull

# Container neu bauen und starten
docker-compose up -d --build

# Logs überwachen
docker-compose logs -f
```

## Support

Für Probleme oder Fragen:
- Check die Logs: `docker logs hubelio-crm-app`
- Starte Container neu: `docker-compose restart`
- Wende dich an den Support: https://github.com/mapdalex/Hubelio-crm/issues

---

**Wichtig**: Ändere alle Standardpasswörter in der Produktion!
Nutze starke Passwörter und sichere deine Datenbank.
