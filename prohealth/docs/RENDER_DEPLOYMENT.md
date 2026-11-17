# Deploy ProHealth on Render

This repository uses a React/Vite client, an Express server and MySQL. The Render web service runs the Express server, which serves the built client and API from one HTTPS origin.

## Before deploying

- Push the project to the GitHub branch you want Render to deploy.
- For an all-free demo, create an external TiDB Cloud Starter instance in MySQL-compatible mode. It has a free monthly quota (currently 5 GiB row storage and 50 million request units); requests beyond the quota are throttled until reset unless you enable paid usage. TiDB requires TLS on public connections. See [TiDB's plan limits](https://docs.pingcap.com/tidbcloud/select-cluster-tier/?compatibility=mysql&plan=starter) and [TLS instructions](https://docs.pingcap.com/tidbcloud/secure-connections-to-serverless-clusters/).
- Alternatively, run MySQL on Render. Render deploys it as a private service with a persistent disk, which is paid and self-managed rather than a managed MySQL product. See [Render's MySQL deployment guide](https://render.com/docs/deploy-mysql).
- Keep in mind that a Render Free web service sleeps after 15 minutes without traffic. Traffic from Render to an external TiDB database counts toward Render's outbound bandwidth allowance. See [Render Free service limits](https://render.com/docs/free).
- Use a new, empty database named `prohealth` for a clean demo. Do not copy Railway variables into Render.
- Replace any Daraja credentials that were shared in screenshots. The deployment starts in payment simulation mode until fresh sandbox credentials are entered in Render's Environment settings.

## Create the Render web service

The repository-root `render.yaml` defines the web service. In Render, choose **New > Blueprint**, connect this GitHub repository, and deploy the Blueprint. Render uses `prohealth/` as the service root, runs `npm run setup && npm run build`, and starts the server with `npm start`.

The Blueprint asks for `DB_HOST`, `DB_PORT`, `DB_SSL`, `DB_USER` and `DB_PASS`. For TiDB, copy the host, port and username exactly from TiDB's Connect dialog, set `DB_SSL=true`, and use `DB_NAME=prohealth`. TiDB usernames include the cluster prefix shown in its Connect dialog. For MySQL hosted in Render, use its internal host, port `3306`, and `DB_SSL=false`. Keep the web service and a Render-hosted MySQL service in the same region. Render provides the web service `PORT`; do not set it manually.

The app has a `/healthz` check that only reports healthy when the database is reachable. If the deploy does not pass the health check, check the database host, port, credentials, TLS setting and network access.

## Database initialization

On a new empty database, the app imports `database/schema.sql` and then `database/seed.sql` at startup. The seed file adds demo users and catalog data. Do not run it against a database containing records you need; it truncates tables. If you need existing local records, export them from phpMyAdmin and import that backup into the hosted database before starting the app.

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
