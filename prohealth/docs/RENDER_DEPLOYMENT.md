# Deploy ProHealth on Render

This repository uses a React/Vite client, an Express server and MySQL. The Render web service runs the Express server, which serves the built client and API from one HTTPS origin.

## Before deploying

- Push the project to the GitHub branch you want Render to deploy.
- Arrange a MySQL 8 database that Render can reach. The app's current MySQL database on your PC/phpMyAdmin at `localhost` is not reachable from Render. Render's guide deploys MySQL as a private service with a persistent disk; it is self-managed rather than a managed MySQL database product. See [Render's MySQL deployment guide](https://render.com/docs/deploy-mysql).
- Decide whether to import existing records or start with an empty database. Never run `seed.sql` against a database containing records you need; it clears/replaces demo data.
- Replace any Daraja credentials that were shared in screenshots. The deployment starts in payment simulation mode until fresh sandbox credentials are entered in Render's Environment settings.

## Create the Render web service

The repository-root `render.yaml` defines the web service. In Render, choose **New > Blueprint**, connect this GitHub repository, and deploy the Blueprint. Render uses `prohealth/` as the service root, runs `npm run setup && npm run build`, and starts the server with `npm start`.

The Blueprint asks for `DB_HOST`, `DB_USER` and `DB_PASS`. Enter the host/address, username and password for the hosted MySQL database. Keep `DB_NAME=prohealth`. Use the database's internal host if it runs in the same Render workspace. Render provides the service `PORT`; do not set it manually.

The app has a `/healthz` check that only reports healthy when MySQL is reachable. If the deploy does not pass the health check, check the database host, port, credentials, firewall/network access and that `database/schema.sql` has been imported.

## Import the database

Create an empty MySQL 8 database, then import `database/schema.sql`. This creates the tables and roles. Import `database/seed.sql` only if you deliberately want its demo records in the empty database. If you need current local records, export them from phpMyAdmin and import that backup instead; do not overwrite them with the demo seed.

## Configure M-Pesa after the site is live

First verify that customer and admin pages work against the hosted database. The Blueprint deliberately keeps M-Pesa in `simulate` mode. In the Render web service's **Environment** page, set `MPESA_MODE=sandbox` and add the new sandbox `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, and `MPESA_TRANSACTION_TYPE` values. Do not put credentials in Git, this guide, or `.env.example`.

Set `MPESA_CALLBACK_URL` to:

```text
https://<your-render-service>.onrender.com/api/mpesa/callback
```

Use the service's actual `onrender.com` host. Save and redeploy the service, then perform a sandbox checkout. Safaricom must be able to reach this public HTTPS callback; the local Cloudflare Quick Tunnel URL is only for local development.

## Prescription uploads

The server stores uploaded prescription files on its local filesystem by default. Render's filesystem is ephemeral, so uploads can disappear during redeploys or instance replacement. For a demonstration, avoid uploading real prescriptions. Before real use, attach a persistent disk to the web service and set `STORAGE_DIR` to its mount path, or move uploads to an object-storage service. A persistent disk requires a Render plan that supports disks.

## Production checks

- Confirm login, registration, password reset, admin permissions, checkout, payment callback, prescription review, reports and audit logs against the hosted database.
- Use fresh production Daraja credentials and an approved live shortcode only after the merchant is approved for Go Live. Never use the sandbox credentials in production.
- Keep database credentials and the generated `SESSION_SECRET` in Render's Environment settings.
- Set up regular database backups and a persistent storage strategy for uploaded prescriptions before handling real customer information.
