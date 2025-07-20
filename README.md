# MediaJira

A modern media campaign management platform built with Django and Next.js.

## CI/CD Pipeline

### Overview
Automated CI/CD pipeline using GitHub Actions with **Build → Test → Deploy** pattern.

### Pipeline Flow
```
Push/PR to main → Build Images → Run Tests → Deploy (main only)
```

### Jobs

#### 1. Build Job
- Builds Docker images for backend and frontend
- Tags images with commit SHA
- Uploads images as artifacts

#### 2. Test Job
- Downloads and loads images
- Starts PostgreSQL and Redis containers
- Runs Django tests in containerized environment
- Runs frontend linting and build
- Cleans up containers and volumes

#### 3. Deploy Job
- Only triggers on push to main branch
- Requires build and test to succeed
- Currently placeholder for deployment logic

### Environment Configuration

#### Development
```bash
# Use host database
export DB_HOST=host.docker.internal
docker-compose up -d backend frontend nginx
```

#### CI
```bash
# Use containerized database
export DB_HOST=db
docker-compose --profile ci --env-file .env.ci up -d db redis
```

### Docker Compose Profiles

| Profile | Services | Purpose |
|---------|----------|---------|
| `ci` | db, redis, backend,frontend  | CI/CD testing |
| `dev` | backend, frontend, nginx, redis | Development & Production |

### Testing

#### Backend
```bash
# Django tests with isolated database
python manage.py test --verbosity=2
```

#### Frontend
```bash
# Linting and build
npm run lint && npm run build && npm test
```

### Local Testing

#### Backend Tests
```bash
docker-compose --profile ci --env-file .env.ci up -d db redis
docker-compose --profile ci --env-file .env.ci run backend python manage.py test
```

#### Frontend Tests
```bash
docker run --rm --network mediajira_default mediajira-frontend:latest npm test
```

### Troubleshooting

#### Common Issues
- **Build fails**: Check Docker build logs
- **Tests fail**: Run tests locally with same environment
- **Database issues**: Verify PostgreSQL container is running
- **Network issues**: Check Docker network configuration

#### Debug Commands
```bash
# Check containers
docker-compose ps

# View logs
docker-compose logs [service-name]

# Access container
docker-compose exec [service-name] bash
```

---

For detailed CI/CD documentation, see the full confluence above.