<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy the app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Backend Setup

The frontend no longer relies on the in-browser mock API. A real Express/PostgreSQL backend now provides authentication, subscriptions, predictions, settings, and notifications.

1. **Create the database**
   ```bash
   createdb youscore
   ```
2. **Apply the schema**
   ```bash
   psql youscore < server/sql/schema.sql
   ```
3. **Configure the server**
   ```bash
   cd server
   cp .env.example .env
   # Update DATABASE_URL, CLIENT_ORIGIN, etc. as needed
   npm install
   ```
4. **Start the API**
   ```bash
   npm run dev
   ```

The server automatically provisions an admin account using the credentials in `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`), so you can log into the admin dashboard immediately.

## Frontend Environment

Add the backend URL to your Vite env file so the API client knows where to send requests:

```
VITE_API_BASE_URL=http://localhost:8090/api
GEMINI_API_KEY=...
```

Be sure to start the backend before running `npm run dev` so the UI can load data from PostgreSQL.

## Docker Deployment (Port 8090)

Use Docker to run PostgreSQL, the API (exposed on 8091), and the production React build (served on 8090).

1. Build and start everything:
   ```bash
   docker-compose up --build
   ```
2. The API is now reachable at http://localhost:8091/api and auto-runs database migrations plus the default admin account.
3. The compiled frontend is served from http://localhost:8090 and talks to the API via the host port 8091. For local dev via Vite, you can still run `npm run dev` with `VITE_API_BASE_URL=http://localhost:8091/api` (or `http://localhost:8090/api` if you run the backend directly on your machine).

The compose file exposes Postgres on 5432 (for inspection) and persists data in the `db_data` volume.

### Remote databases

If you connect to a managed Postgres instance that requires SSL, set `DATABASE_SSL=true` in `server/.env` (or your container environment). For local Docker/localhost instances, leave it `false` so the driver does not attempt to negotiate SSL.
