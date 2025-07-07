#!/bin/bash

# Setup script for local PostgreSQL database
echo "🐘 Setting up local PostgreSQL database for MediaJira..."

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    echo "   On Windows: Start PostgreSQL service"
    echo "   On macOS: brew services start postgresql"
    echo "   On Linux: sudo systemctl start postgresql"
    exit 1
fi

# Create database if it doesn't exist
echo "📦 Creating database..."
createdb -U postgres mediajira_db 2>/dev/null || echo "Database already exists"

# Create user if it doesn't exist (optional)
echo "👤 Creating user..."
psql -U postgres -c "CREATE USER mediajira_user WITH PASSWORD 'mediajira_password';" 2>/dev/null || echo "User already exists"

# Grant privileges
echo "🔐 Granting privileges..."
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE mediajira_db TO mediajira_user;" 2>/dev/null || echo "Privileges already granted"

echo "✅ Local database setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update your .env file with your local PostgreSQL credentials"
echo "2. Run: docker-compose up -d --build"
echo "3. Run: docker-compose exec backend python manage.py migrate"
echo "4. Run: docker-compose exec backend python manage.py makemigrations test_app"
echo "5. Run: docker-compose exec backend python manage.py migrate"
echo ""
echo "🔗 You can now use pgAdmin to connect to localhost:5432" 