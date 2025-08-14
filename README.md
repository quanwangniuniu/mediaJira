# MediaJira

> **The best media buyer Jira platform in the world**  
> MediaJira is a campaign management platform tailored for media buying teams. It streamlines the process of creating, tracking, and optimizing advertising campaigns, while providing collaboration tools, performance analytics, budget control, and professional API access.

---

## ✨ Features

- **Campaign Management**  
  Create, track, and optimize advertising campaigns with detailed performance metrics.

- **Team Collaboration**  
  Assign roles and permissions for seamless teamwork.

- **Performance Tracking**  
  Monitor impressions, clicks, conversions, and costs in real time with analytics and reporting.

- **Budget Tracking & Alerts**  
  Track budget usage and receive alerts when limits are exceeded.

- **Professional API Access**  
  Integrate with third-party systems via a fully documented REST API.

---

## 🛠 Tech Stack

**Frontend**  
- Next.js   
- Tailwind CSS  
- Axios for API requests  

**Backend**  
- Django  
- Django REST Framework  
- PostgreSQL  

**Infrastructure**  
- Docker & Docker Compose  
- Nginx reverse proxy  
- Redis (for caching / async tasks)  
- ClamAV (for file scanning)  
- GitHub Actions CI/CD  

---

## 📂 Repository Structure

```
.
├── backend/                  # Django backend source code
├── frontend/                 # Next.js frontend source code
├── nginx/                    # Nginx configuration
├── openapi/openapi_spec/     # OpenAPI specification files
├── docker-compose.dev.yml    # Docker Compose for development
├── docker-compose.yml        # Docker Compose for production
├── env.example               # Example environment variables
├── DOCKER_README.md          # Detailed Docker deployment guide
└── ...
```

---

## 🚀 Quick Start (Docker)

This section follows the official steps from [DOCKER_README.md](DOCKER_README.md).

### 📋 Prerequisites
- Docker Desktop installed and running  
- Docker Compose (included with Docker Desktop)  
- PostgreSQL installed locally (for pgAdmin access)  
- Git (to clone the repository)  

### 1. Clone and Setup
```bash
git clone <your-repo-url>
cd mediaJira

# Copy environment file
cp env.example .env
```

### 2. Local PostgreSQL Setup

**Option A: Use the setup script (recommended)**
```bash
chmod +x setup_local_db.sh
./setup_local_db.sh
```

**Option B: Manual setup**
```bash
createdb -U postgres mediajira_db
psql -U postgres -c "CREATE USER mediajira_user WITH PASSWORD 'mediajira_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE mediajira_db TO mediajira_user;"
```

### 3. Build and Run (Dev Mode)
```bash
docker compose -f docker-compose.dev.yml up --build
```

### 4. Access the app
- Frontend: http://localhost:3000  
- Backend API: http://localhost:8000  
- Nginx: http://localhost:80  
- Redis: localhost:6379  
- ClamAV: localhost:3310  

> For detailed Docker deployment, production setup, and troubleshooting, please see [DOCKER_README.md](DOCKER_README.md).

---

## ⚙ Environment Variables

From `env.example`:

```
# Django Settings
SECRET_KEY=sunny3123
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# Local PostgreSQL Settings (for pgAdmin access)
POSTGRES_DB=mediajira_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sunny3123
POSTGRES_PORT=5432

# Ports
FRONTEND_PORT=3000
BACKEND_PORT=8000
NGINX_PORT=80
```

---

## 🧪 Running Tests

**Backend (Django + pytest)**
```bash
docker compose exec backend pytest
```

**Frontend (Next.js + Jest)**
```bash
docker compose exec frontend npm run test
```

---

## 📄 API Documentation

API specifications are located in `openapi/openapi_spec/` and are served through the **API Docs** page when the application is running.

---

## 📜 License

This project is licensed under the **LGPL-2.1** license. See the [LICENSE](LICENSE) file for details.