#!/bin/bash

# Development script for MediaJira
echo "🐳 Starting MediaJira Development Environment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created. Please edit it with your configuration."
fi

# Build and start development services
echo "🚀 Building and starting development services..."
docker-compose -f docker-compose.dev.yml up -d --build

echo ""
echo "✅ Development environment started!"
echo ""
echo "🌐 Access your application:"
echo "   Main App: http://localhost"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   Admin:    http://localhost/admin"
echo ""
echo "📝 Development features:"
echo "   ✅ Hot reloading enabled for both frontend and backend"
echo "   ✅ Volume mounts for live code changes"
echo "   ✅ No need to rebuild for code changes"
echo ""
echo "🛠️  Useful commands:"
echo "   View logs: docker-compose -f docker-compose.dev.yml logs -f"
echo "   Stop services: docker-compose -f docker-compose.dev.yml down"
echo "   Rebuild: docker-compose -f docker-compose.dev.yml up -d --build"
echo ""
echo "🎉 Happy coding!" 