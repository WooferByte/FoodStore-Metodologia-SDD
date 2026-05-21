#!/bin/bash
# Food Store - Development Environment Setup
# Run this after git pull or if Docker container state is corrupted
# Usage: ./setup-dev.sh

set -e  # Exit on error

echo "============================================================"
echo "🚀 Food Store — Development Environment Setup"
echo "============================================================"

# Step 1: Clean up old containers and volumes
echo ""
echo "📋 Step 1: Cleaning up old containers and volumes..."
docker-compose down -v 2>/dev/null || true
docker volume prune -f 2>/dev/null || true

# Step 2: Remove local data directory to ensure fresh state
echo "🗑️  Step 2: Removing local data directory..."
rm -rf data/postgres 2>/dev/null || true
mkdir -p data/postgres

# Step 3: Start PostgreSQL
echo "🐘 Step 3: Starting PostgreSQL container..."
docker-compose up -d
echo "   ⏳ Waiting for PostgreSQL to be ready..."
sleep 15

# Step 4: Run Alembic migrations
echo "📊 Step 4: Running Alembic migrations..."
cd backend
alembic upgrade head || {
  echo "❌ Migration failed!"
  exit 1
}

# Step 5: Seed the database
echo "🌱 Step 5: Seeding database with test data..."
python scripts/seed.py || {
  echo "❌ Seed failed!"
  exit 1
}

cd ..

echo ""
echo "============================================================"
echo "✅ Setup completed successfully!"
echo "============================================================"
echo ""
echo "📝 Next steps:"
echo "   1. Backend:  cd backend && python -m uvicorn main:app --reload"
echo "   2. Frontend: cd frontend && npm run dev"
echo ""
echo "🔑 Test credentials:"
echo "   • admin@foodstore.com / admin123456 (ADMIN)"
echo "   • cliente@foodstore.com / cliente123456 (CLIENT)"
echo ""
