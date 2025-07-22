# MediaJira CI/CD & Developer Guide

## 1.Why Do We Use CI/CD?

A robust CI/CD pipeline ensures that every code change is automatically built, tested, and validated in a production-like environment before deployment. This process helps catch integration issues, environment mismatches, and deployment bugs early, making our development and collaboration more reliable and efficient.

---

## 2.What Does the CI/CD Pipeline Do?

- Builds backend (Django) and frontend (Next.js) Docker images
- Runs all backend and frontend tests in isolated containers
- Applies database migrations to keep schema up to date
- Lints and checks code quality
- Simulates real deployment with PostgreSQL, Redis, and nginx
- Prepares code for deployment

---

### How Are Backend and Frontend Tested?

- **Backend (Django):**
  - All migrations are applied, then all unit and integration tests are run inside the backend Docker container:
    ```bash
    python manage.py test
    ```
  - This ensures the database schema is current and backend logic is validated.

- **Frontend (Next.js):**
  - The frontend Docker container runs:
    ```bash
    npm run lint
    npm run build
    npm test
    ```
  - Linting checks code style, build ensures production readiness, and tests validate UI and integration.
  - During integration tests, all API requests from the frontend are routed through nginx to the backend, exactly as in real deployment.

---

## 3.How to Work Effectively with CI/CD

To ensure your code passes CI/CD and integrates smoothly with the team:
- **Always commit migration files** when you change models.
- **Use nginx as the API gateway** for all integration tests.
- **Set API base URLs** appropriately for each environment (see below).
- **Follow the detailed workflow and best practices** in the next sections to avoid common pitfalls and ensure reliable automation.

---

### a. Adding a New Model (Backend)

**Current workflow:**

1. When you add a new Django model, you must also update the CI/CD workflow file (`.github/workflows/mediajira-ci.yml`) to include the following template for your app:
   ```yaml
   python manage.py makemigrations your_app_name &&
   python manage.py migrate your_app_name &&
   ```
   Add these lines in the backend test step, following the existing pattern for other apps.

2. In the future, the preferred approach will be to generate migration files locally and commit them to git, rather than relying on CI/CD to generate migrations. This will improve reliability and team collaboration.

**Never rely on CI/CD to generate migrations for you in the long term!**

---

### b. Writing Frontend-Backend Integration Tests

To ensure your frontend talks to the backend just like in production:
- **Always use nginx as the API gateway in tests.**
- In your test config or code, set the API base URL to nginx:
  ```js
  // Example in frontend test code
  const api = process.env.API_BASE_URL || 'http://nginx';
  fetch(`${api}/api/your-endpoint`)
  ```
- In CI/CD, `API_BASE_URL` is set to `http://nginx` 
- In local dev, use `API_BASE_URL=http://localhost` (see `.env` in workflow)if you run nginx.
- This ensures all requests go through nginx, matching real deployment.

---

## 3. Need Help?

If you have any questions or run into issues, **contact mojito in the Discord group** for support.

---

## Summary & Best Practices

- Always commit migration files when you change models.
- Use nginx as the API gateway in integration tests.
- Set API base URLs correctly for each environment.
- CI/CD ensures your code is tested in a real-world environment before deployment.
- For help, reach out to mojito on Discord.
