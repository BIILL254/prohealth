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
| 3. Development (database, front-end, admin panel, connections) | To do | `frontend/`, `admin/`, `backend/`, `database/` |
| 4. Final presentation (testing, deployment, manual) | To do | |

## Folder guide

```
docs/
  guidelines/     the lecturer's project guidelines
  deliverable-1/  requirements document (Word)
  deliverable-2/  design document (Word)
design/
  diagrams/       ProHealth_Diagrams.drawio (flow chart, use case, class, ER, schema) and PNG exports
  ui-mockups/     10 screens (customer C1-C4, admin A1-A6) as SVG and PNG
database/
  schema.sql      MySQL 8 script that creates prohealth_db (14 tables)
frontend/         React + TypeScript customer storefront (catalogue in progress)
admin/            admin panel (empty for now)
backend/          server code shared by both (empty for now)
```

## Set up the database

Needs MySQL 8 (or MariaDB 10.5+).

```
mysql -u root -p < database/schema.sql
```

This creates `prohealth_db` with all tables and the three roles (customer, pharmacist, admin).
The script has not been run against a live MySQL server yet, so report any error you hit.

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
