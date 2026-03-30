# Docker & Portainer Deployment Guide

## Problem: Container werden in Portainer nicht gestartet

Das Hauptproblem war, dass `docker-compose.yml` ein `build:` mit `context: .` hatte, das Portainer nicht richtig handhabt.

## Lösung: Image zuerst bauen, dann in Portainer deployen

### Schritt 1: Docker Image lokal bauen

```bash
docker build -t hubelio-crm:latest .
```

### Schritt 2: In Portainer deployen

**Option A: Lokales Image verwenden (empfohlen)**
1. Öffne Portainer → Stacks
2. Erstelle einen neuen Stack oder aktualisiere deinen bestehenden
3. Kopiere den Inhalt von `docker-compose.yml`
4. Setze diese Environment-Variablen in Portainer:
   - `POSTGRES_USER`: crm_user
   - `POSTGRES_PASSWORD`: change_me_in_production (ÄNDERN!)
   - `POSTGRES_DB`: crm_database
   - `AUTH_SECRET`: your-super-secret-key-min-32-characters (ÄNDERN!)
   - `NEXT_PUBLIC_APP_URL`: http://dein-server:3000
   - `COOKIE_SECURE`: false (oder true wenn HTTPS)
   - `CRM_APP_IMAGE`: hubelio-crm:latest

5. Deploye den Stack

**Option B: Image zu Docker Hub pushen**
```bash
docker tag hubelio-crm:latest dein-docker-hub-account/hubelio-crm:latest
docker push dein-docker-hub-account/hubelio-crm:latest
```

Dann in `docker-compose.yml` ändern:
```yaml
image: dein-docker-hub-account/hubelio-crm:latest
```

## Fehlerbehebung

### Container bleibt "created" oder "restarting"
1. Überprüfe die Container-Logs in Portainer
2. Stelle sicher, dass `AUTH_SECRET` gesetzt ist (mindestens 32 Zeichen)
3. Überprüfe, dass die DB erreichbar ist: `DATABASE_URL` sollte korrekt sein

### "Image not found"
- Stelle sicher, dass das Image mit `docker build` gebaut wurde
- Oder pushe es zu Docker Hub und verwende den vollständigen Image-Namen

### DB "restarting"
- Überprüfe, dass der Volume `postgres_data` nicht beschädigt ist
- Lösche den Volume und starte neu (Datenverlust!)
- Überprüfe die `POSTGRES_PASSWORD` - sie darf keine Sonderzeichen haben

## Wichtige Environment-Variablen

- **AUTH_SECRET**: Mindestens 32 Zeichen, zufällig generiert (z.B. mit: `openssl rand -base64 32`)
- **DATABASE_URL**: Wird automatisch aus POSTGRES_* Variablen konstruiert
- **COOKIE_SECURE**: 
  - `false` für localhost/HTTP
  - `true` für Produktion/HTTPS
