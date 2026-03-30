#!/bin/bash

# Hublio CRM Setup Script

echo "🚀 Hublio CRM Setup"
echo "===================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local..."
    cat > .env.local << EOF
# Database
DATABASE_URL="file:./prisma/dev.db"

# JWT Secret
JWT_SECRET="your-secret-key-change-in-production-$(date +%s)"

# Security
COOKIE_SECURE="false"

# API
NEXT_PUBLIC_API_URL="http://localhost:3000"
EOF
    echo "✅ .env.local created"
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "🗄️  Setting up database..."
pnpm db:push

echo ""
echo "🌱 Seeding database with modules..."
pnpm db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎉 You can now run: pnpm dev"
echo ""
echo "📍 Default credentials (if seeded):"
echo "   Email: admin@example.com"
echo "   Password: password123"
echo ""
