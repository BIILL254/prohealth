# ProHealth: Online Pharmacy System

A web-based pharmacy system. Customers browse medicines, upload prescriptions and pay with M-Pesa.
Pharmacists and administrators manage stock, prescriptions, orders, users and reports from an admin panel.

Software Engineering group project, Strathmore University.

## Team

| Member | Reg. No. | Role |
|---|---|---|
| [Name] | [Reg. No.] | Project manager, database designer and documentation |
| [Name] | [Reg. No.] | Front-end developer, UI mock-ups and testing |
| [Name] | [Reg. No.] | Back-end and admin panel developer, security and deployment |

## Project status

| Deliverable | Status | Where |
|---|---|---|
| 1. Requirements | Done | `docs/deliverable-1/` |
| 2. Diagrams and mock-ups | Done | `docs/deliverable-2/`, `design/`, `database/` |
| 3. Development (database, front-end, admin panel, connections) | Done (working build) | `client/`, `server/`, `database/`, `docs/deliverable-3/` |
| 4. Final presentation (testing, deployment, manual) | To do | |

## Technology

React 19 (Vite) front end and admin panel, Node.js + Express API, MySQL 8, Bootstrap 5, Font Awesome, M-Pesa Daraja.

## Folder guide

```
client/        React app: customer website (src/front) and admin panel (src/admin)
server/        Node.js + Express API (src/routes, business logic, MySQL connection)
database/      schema.sql (14 tables) and seed.sql (demo data)
docs/          guidelines, deliverables 1 to 3 (Word) and the MySQL setup guide
design/        draw.io diagrams and UI mock-ups
legacy-php/    first PHP version of Deliverable 3, kept for reference only
```

## Quick start

Needs Node.js 20+ and MySQL 8. Full steps and troubleshooting: [`docs/deliverable-3/MySQL_Setup_Guide.md`](docs/deliverable-3/MySQL_Setup_Guide.md).

```
mysql -u root -p < database/schema.sql          # create database and tables
mysql -u root -p < database/seed.sql            # demo data
cp server/.env.example server/.env              # then put your MySQL user and password inside
npm run setup && npm run build && npm start     # open http://localhost:3000
```

Demo logins: admin `admin@prohealth.co.ke` / `Admin@123`, pharmacist `pharmacist@prohealth.co.ke` / `Pharma@123`,
customer `customer@prohealth.co.ke` / `Customer@123`. Staff sign in at `/admin/login`.

## Working with the design files

- **Diagrams:** open `design/diagrams/ProHealth_Diagrams.drawio` at [app.diagrams.net](https://app.diagrams.net) or in the draw.io desktop app. It has 5 pages.
- **UI screens:** drag the SVG files from `design/ui-mockups/svg/` into Figma. Figma file: [paste link here].
- If you change the database design, update `database/schema.sql` and the draw.io schema page together.

## Key design decisions

- Three roles: customer, pharmacist, admin. Admins use two-factor authentication.
- Stock is kept per batch (with expiry date); the earliest-expiring batch is sold first.
- Prescription-only medicines need pharmacist approval before an order is prepared.
- Payment is by M-Pesa (Daraja API). Stock is deducted only after payment succeeds.
- Passwords are hashed, queries use prepared statements, and actions are written to `audit_logs`.

## Team workflow

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Deployment

See [Render deployment guide](docs/RENDER_DEPLOYMENT.md) for the hosted MySQL, Render Blueprint, M-Pesa sandbox and file-storage setup.
