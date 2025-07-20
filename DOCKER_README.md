# 🐳 MediaJira Docker Deployment

This guide will help you deploy the MediaJira project (Next.js + Django) using Docker and Docker Compose with **local PostgreSQL** for pgAdmin access.

## 📋 Prerequisites

- Docker Desktop installed and running
- Docker Compose (usually comes with Docker Desktop)
- **PostgreSQL installed locally** (for pgAdmin access)
- Git (to clone the repository)

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Clone the repository (if not already done)
git clone <your-repo-url>
cd mediaJira

# Copy environment file
cp env.example .env
```

### 2. Local PostgreSQL Setup

**Option A: Use the setup script (recommended)**
```bash
# Make script executable
chmod +x setup_local_db.sh

# Run setup script
./setup_local_db.sh
```

**Option B: Manual setup**
```bash
# Create database
createdb -U postgres mediajira_db

# Create user (optional)
psql -U postgres -c "CREATE USER mediajira_user WITH PASSWORD 'mediajira_password';"

# Grant privileges
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE mediajira_db TO mediajira_user;"
```

### 3. Environment Configuration

Edit the `.env` file with your local PostgreSQL credentials:

```bash
# Django Settings
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# Local PostgreSQL Settings (for pgAdmin access)
POSTGRES_DB=mediajira_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-local-postgres-password
POSTGRES_PORT=5432

# Ports
FRONTEND_PORT=3000
BACKEND_PORT=8000
NGINX_PORT=80
```

### 4. Deploy with Docker Compose

#### **Production Deployment:**
```bash
# Build and start all services
docker compose up -d --build

# Make migration file
docker compose exec backend python manage.py makemigrations

# Run migrations
docker compose exec backend python manage.py migrate

# Create test app migrations
docker compose exec backend python manage.py makemigrations test_app
docker compose exec backend python manage.py migrate

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

#### **Development Deployment (with Hot Reloading):**
```bash
# Use the development script (recommended)
chmod +x dev.sh
./dev.sh

# Or manually run development compose
docker-compose -f docker-compose.dev.yml up -d --build
```

## 🔄 Development vs Production

### **Development Mode** (`docker-compose.dev.yml`)
- ✅ **Hot Reloading** - Changes reflect immediately without rebuilds
- ✅ **Volume Mounts** - Live code synchronization
- ✅ **Debug Mode** - Django debug enabled
- ✅ **Fast Iteration** - No need to rebuild containers for code changes

### **Production Mode** (`docker-compose.yml`)
- ✅ **Optimized Builds** - Multi-stage builds for smaller images
- ✅ **Security** - Non-root users, minimal dependencies
- ✅ **Performance** - Gunicorn, optimized Next.js builds
- ✅ **Stability** - Production-ready configuration

## 🌐 Access Points

After successful deployment, you can access:

- **Main Application**: http://localhost (via Nginx)
- **Frontend Direct**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Django Admin**: http://localhost/admin
- **Health Check**: http://localhost/health
- **pgAdmin**: Connect to localhost:5432 with your local PostgreSQL credentials

## 🧪 Test Module

The application includes a **Connection Test Module** that verifies all services are working:

1. **Frontend → Nginx → Backend → PostgreSQL** connectivity
2. **Database operations** (create, read, delete test data)
3. **API communication** between frontend and backend

### Test Features:
- ✅ **Connection Test**: Verifies backend and database connectivity
- ✅ **Create Test Data**: Adds data to PostgreSQL database
- ✅ **View Test Data**: Displays all test data from database
- ✅ **Clear Test Data**: Removes all test data for cleanup

### Test Endpoints:
- `GET /api/test/connection/` - Test connectivity
- `GET /api/test/data/` - Get all test data
- `POST /api/test/data/create/` - Create new test data
- `DELETE /api/test/data/clear/` - Clear all test data

## 🏗️ Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Nginx     │    │  Frontend   │    │   Backend   │
│   (Port 80) │◄──►│ (Port 3000) │◄──►│ (Port 8000) │
└─────────────┘    └─────────────┘    └─────────────┘
                           │                   │
                           └─────────┬─────────┘
                                     │
                           ┌─────────▼─────────┐
                           │  Local PostgreSQL │
                           │   (Port 5432)     │
                           └───────────────────┘
```

## 📁 File Structure

```
mediaJira/
├── docker-compose.yml          # Production orchestration
├── docker-compose.dev.yml      # Development orchestration
├── dev.sh                      # Development startup script
├── setup_local_db.sh           # Local database setup script
├── .env                        # Environment variables
├── env.example                 # Environment template
├── .dockerignore               # Root level ignore
├── nginx/
│   └── nginx.conf             # Nginx configuration
├── frontend/
│   ├── Dockerfile             # Production frontend container
│   ├── Dockerfile.dev         # Development frontend container
│   ├── .dockerignore          # Frontend ignore
│   ├── next.config.mjs        # Next.js config
│   └── src/
│       ├── app/
│       │   ├── page.js        # Main page
│       │   ├── campaigns/     # Campaign management
│       │   └── testpage/      # Test module
│       └── components/
│           ├── campaigns/     # Campaign components
│           └── ui/            # UI components
└── backend/
    ├── Dockerfile             # Production backend container
    ├── Dockerfile.dev         # Development backend container
    ├── .dockerignore          # Backend ignore
    ├── requirements.txt       # Python dependencies
    ├── backend/
    │   ├── settings.py        # Django settings
    │   └── urls.py            # Django URLs
    ├── campaigns/             # Campaign management app
    └── test_app/              # Test Django app
```

## 🔧 Services

### 1. **Local PostgreSQL Database**
- **Connection**: Local PostgreSQL instance
- **Port**: 5432
- **Access**: Direct connection for pgAdmin
- **Data**: Stored locally on your machine

### 2. **Django Backend**
- **Production**: Python 3.11-slim + Gunicorn
- **Development**: Python 3.11-slim + Django runserver
- **Port**: 8000
- **Features**: 
  - Local PostgreSQL database connection
  - Hot reloading in development
  - WhiteNoise for static files
  - CORS headers support
  - Health check endpoint
  - Test app for connectivity verification
  - Comprehensive error handling

### 3. **Next.js Frontend**
- **Production**: Node.js 18-alpine + Standalone build
- **Development**: Node.js 18-alpine + Hot reloading
- **Port**: 3000
- **Features**:
  - Hot reloading in development
  - Standalone output for production
  - Non-root user for security
  - Connection test component
  - Modern UI with custom CSS
  - Comprehensive error handling

### 4. **Nginx Reverse Proxy**
- **Image**: `nginx:alpine`
- **Port**: 80
- **Features**:
  - Routes frontend traffic
  - Routes API traffic to backend
  - Static file serving
  - Health check endpoint

## 🛠️ Common Commands

### **Production Commands:**
```bash
# Start all services
docker-compose up -d --build

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild and start
docker-compose up -d --build

# Run migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser
```

### **Development Commands:**
```bash
# Start development environment
./dev.sh

# Or manually
docker-compose -f docker-compose.dev.yml up -d --build

# View development logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop development services
docker-compose -f docker-compose.dev.yml down

# Rebuild development services
docker-compose -f docker-compose.dev.yml up -d --build
```

### **Database Commands:**
```bash
# Access PostgreSQL directly
psql -U postgres -d mediajira_db

# Run Django shell
docker-compose exec backend python manage.py shell

# Check database connection
docker-compose exec backend python manage.py dbshell

# Reset database (WARNING: This will delete all data)
docker-compose exec backend python manage.py flush
```

### **General Commands:**
```bash
# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx

# Access container shell
docker-compose exec backend bash
docker-compose exec frontend sh

# Remove all containers and volumes
docker-compose down -v

# View running containers
docker-compose ps
```

## 🔍 Troubleshooting

### 1. **PostgreSQL Connection Issues**
```bash
# Check if PostgreSQL is running
pg_isready -U postgres

# Test connection
psql -U postgres -d mediajira_db -c "SELECT version();"

# Check PostgreSQL logs
# On Windows: Check Event Viewer
# On macOS: brew services list
# On Linux: sudo systemctl status postgresql
```

### 2. **Database Migration Issues**
```bash
# Reset migrations
docker-compose exec backend python manage.py migrate --fake-initial

# Create fresh migrations
docker-compose exec backend python manage.py makemigrations --empty campaigns
docker-compose exec backend python manage.py makemigrations campaigns

# Apply migrations
docker-compose exec backend python manage.py migrate
```

### 3. **Port Already in Use**
```bash
# Check what's using the port
netstat -tulpn | grep :80
# or
lsof -i :80

# Change port in .env file
NGINX_PORT=8080
```

### 4. **Build Issues**
```bash
# Clean build cache
docker-compose build --no-cache

# Remove all images and rebuild
docker system prune -a
docker-compose up -d --build
```

### 5. **Permission Issues**
```bash
# Fix file permissions
sudo chown -R $USER:$USER .

# Fix Docker permissions (Linux)
sudo usermod -aG docker $USER
```

### 6. **Test Module Issues**
```bash
# Check if test app is properly installed
docker-compose exec backend python manage.py check

# Run migrations for test app
docker-compose exec backend python manage.py makemigrations test_app
docker-compose exec backend python manage.py migrate

# Test API endpoints directly
curl http://localhost/api/test/connection/
curl http://localhost/api/test/data/
```

### 7. **Development Hot Reload Issues**
```bash
# Check if volumes are mounted correctly
docker-compose -f docker-compose.dev.yml exec frontend ls -la
docker-compose -f docker-compose.dev.yml exec backend ls -la

# Restart development services
docker-compose -f docker-compose.dev.yml restart frontend backend

# Check file permissions in containers
docker-compose -f docker-compose.dev.yml exec frontend chown -R node:node /app
```

## 🔒 Security Notes

1. **Change default passwords** in the `.env` file
2. **Use strong SECRET_KEY** for Django
3. **Set DEBUG=False** in production
4. **Configure ALLOWED_HOSTS** properly
5. **Use HTTPS** in production with proper SSL certificates
6. **Remove test module** after confirming connectivity
7. **Secure local PostgreSQL** with strong passwords

## 📈 Production Considerations

1. **SSL/TLS**: Add SSL certificates and configure HTTPS
2. **Load Balancing**: Consider using multiple instances
3. **Monitoring**: Add monitoring and logging solutions
4. **Backup**: Implement database backup strategies
5. **Scaling**: Use Docker Swarm or Kubernetes for scaling
6. **Security**: Remove test endpoints and components
7. **Database**: Use managed PostgreSQL service in production

## 🆘 Support

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Verify environment variables in `.env`
3. Ensure PostgreSQL is running locally
4. Check Docker and Docker Compose versions
5. Use the test module to verify connectivity
6. Review the troubleshooting section above
7. Ensure all migrations are applied

---

**Happy Deploying! 🚀** 