#!/bin/bash

# Push changes to worklog-system branch
cd /vercel/share/v0-project

echo "[v0] Checking git status..."
git status

echo "[v0] Adding all changes..."
git add -A

echo "[v0] Committing changes..."
git commit -m "feat: Add Worklog system with API routes, UI components, and settings

- Add Worklog, Project, and Activity models to Prisma schema
- Create API routes for CRUD operations and PDF export
- Add Worklog main page with table and filters
- Add Quick Entry component in header
- Add Worklog settings page for managing projects and activities
- Update sidebar navigation with Worklog links
- Support 15-minute intervals for time tracking
- Implement role-based access control"

echo "[v0] Pushing to worklog-system..."
git push origin worklog-system

echo "[v0] Push complete!"
