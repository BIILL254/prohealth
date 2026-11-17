# ProHealth Online Pharmacy System

## Slide-generation brief

**Prepared:** 17 November 2026  
**Project type:** Software Engineering group 8 project, Strathmore University  
**Audience:** ICS 2C 
**Purpose:** Source material for a final presentation about the project, its implementation, deployment, and remaining work.

> **Presentation note:** This brief reflects the repository and deployment status reviewed on 17 November 2026. It intentionally excludes passwords, API credentials, customer details, and prescription contents. The team names and registration numbers in the project documents are still placeholders and should be filled in by the team.

## Executive summary

ProHealth is a web-based pharmacy ordering and management system. Customers can browse a medicine catalogue, manage a cart, choose pickup or delivery, submit an order, and track its progress. Prescription-only products follow a pharmacy review flow. Pharmacy staff use an admin panel to manage inventory, orders, prescriptions, and reports.

The active application is built with React and Vite on the client, Node.js and Express on the server, and a MySQL-compatible database. It is deployed as a single Render web service with TiDB Cloud as the external database. The owner confirmed that the deployed site is working. The Render Blueprint keeps M-Pesa in simulation mode by default; switching to Daraja sandbox requires sandbox credentials and a public callback URL.

## Slide-ready outline

### Slide 1 — ProHealth: Online Pharmacy System

- A connected shopping and pharmacy-operations system.
- Software Engineering project for Strathmore University.
- Deployed demo: [prohealth-kmz5.onrender.com](https://prohealth-kmz5.onrender.com).
- Add the actual team names and registration numbers from the group before presenting.

**Suggested visual:** Customer catalogue mock-up or project logo/brand treatment.

### Slide 2 — The problem and project goal

- Manual pharmacy ordering and stock records make it harder to keep inventory, orders, and expiry dates coordinated.
- Customers need a convenient way to find medicines and submit orders online.
- Pharmacy staff need a shared view of stock, prescriptions, orders, and sales activity.
- ProHealth brings customer ordering and pharmacy operations into one connected system.

**Goal:** Build a usable online pharmacy workflow with role-based access, inventory controls, prescription review, order tracking, and M-Pesa payment support.

### Slide 3 — Users and access levels

- **Customer:** registers, searches and browses medicines, maintains a cart, submits orders, uploads prescriptions when required, and tracks orders.
- **Pharmacist:** reviews prescriptions, processes orders, and supports pharmacy operations.
- **Administrator:** manages users, medicines, categories, inventory, suppliers, reports, and audit history.
- **Daraja/M-Pesa:** external payment provider used for sandbox or live STK Push; simulation is available for demos.

### Slide 4 — Customer shopping journey

1. Register or sign in.
2. Browse/search the catalogue and check price and stock status.
3. Add items to the cart and select delivery or pickup.
4. Upload a prescription if the cart contains a product flagged as prescription-only.
5. Submit the order and follow its status.
6. Pay through the configured M-Pesa mode when eligible.

The UI includes category and type filters, product details, cart quantity controls, checkout validation, customer profiles, and order history/tracking.

### Slide 5 — Prescription and order safeguards

- Catalogue data contains a `requires_prescription` flag; the seed catalogue marks selected products such as Amoxil 500 mg as prescription-required.
- The checkout API requires an uploaded PDF, JPG, or PNG (up to 5 MB) when an order contains a flagged item.
- An order may be created as pending after a file is submitted; that is not pharmacist approval.
- Payment is blocked while the prescription is pending or rejected. A pharmacist must approve it before the customer can pay and the pharmacy can prepare the order.
- The owner reported that a customer may be able to order medicine without a prescription. The code contains server-side checks, so the live product flag and exact observed checkout behavior still need verification before treating this safeguard as confirmed in production.

**Suggested visual:** Prescription workflow diagram or admin prescription-review mock-up.

### Slide 6 — Pharmacy operations

- Manage medicine records, categories, suppliers, stock batches, and reorder thresholds.
- Track batch quantity, supplier, received date, and expiry date.
- Show low-stock and near-expiry indicators.
- Review uploaded prescriptions and approve or reject with staff notes.
- Process the order lifecycle: pending → paid → processing → ready/out for delivery → completed, with cancellation paths.
- View dashboard metrics, filtered reports, CSV exports, and audit logs.

Stock is deducted after successful payment, using earliest-expiring stock batches first (FEFO). Payment callbacks are checked against the stored order/payment details, and duplicate success callbacks are ignored.

### Slide 7 — System architecture

```text
Customer browser ─┐
                  ├─ HTTPS → Render web service
Staff browser ────┘             ├─ React/Vite static build
                                ├─ Express REST API
                                └─ MySQL driver → TiDB Cloud Starter

Express API → Safaricom Daraja sandbox/live API (only when configured)
Safaricom callback → /api/mpesa/callback
```

- The active Render Blueprint uses the repository-root `render.yaml` and `prohealth/` as its service root.
- The Express server serves the built React app and `/api` routes from one origin.
- `/healthz` checks database connectivity and returns healthy only when the database is reachable.
- The app initializes schema and seed data on an empty database. The seed script truncates demo tables, so it must not be run against data that needs to be retained.

### Slide 8 — Technology and data model

- **Client:** React 19, Vite, Bootstrap 5, Font Awesome, Inter.
- **Server:** Node.js 22, Express 5, `mysql2`, `express-session`, `bcryptjs`, `multer`.
- **Database:** MySQL-compatible TiDB Cloud Starter; local schema is written for MySQL/InnoDB.
- **Payments:** Safaricom Daraja STK Push integration with simulation, sandbox, and live modes in the code.
- **Core database:** 14 relational tables: `roles`, `users`, `password_resets`, `addresses`, `categories`, `suppliers`, `medicines`, `stock_batches`, `cart_items`, `prescriptions`, `orders`, `order_items`, `payments`, and `audit_logs`.
- Relationships preserve order price snapshots, batch-level inventory, user ownership, prescription review, and payment history.

### Slide 9 — Security and reliability features

- Passwords are stored as bcrypt hashes; reset tokens are stored as hashes and expire after one hour.
- SQL uses parameterized queries in the active server code.
- CSRF protection applies to state-changing API requests.
- Express sessions use HTTP-only cookies, a 30-minute rolling timeout, and secure cookies in production.
- Helmet security headers and a content security policy are configured.
- Login attempts are throttled/locked based on failed-login audit records.
- Staff accounts can enable TOTP two-factor authentication through the admin security page.
- Important user and pharmacy actions are recorded in `audit_logs`.

**Important distinction:** The current forgot-password UI displays a generic “link sent” message, but no email provider is configured. The server logs reset links instead. Password-reset email delivery is not complete, and logging a live reset token is a security issue to resolve.

### Slide 10 — Development and deployment progress

- Requirements and design deliverables exist as Word documents; diagrams and customer/admin mock-ups are in the design folder.
- The active React + Express application and database schema/seed scripts are implemented.
- Render Blueprint provisions a free web service; TiDB Cloud Starter supplies the MySQL-compatible database.
- The deployed site is live at `https://prohealth-kmz5.onrender.com`; the owner confirmed it works.
- The first Render build failed with status 127 because Vite's development dependency could be omitted under production install settings. The setup script was changed to install the client with `--include=dev`; Render then reported the deploy live.
- The Blueprint configures `DB_HOST`, `DB_PORT`, `DB_SSL`, `DB_USER`, and `DB_PASS`; `DB_NAME` is `prohealth`. Railway-specific URL variables are not part of this Render setup.

### Slide 11 — Current limitations and next work

1. **Prescription enforcement:** reproduce the reported no-prescription order with a known Rx-only product and confirm the live `requires_prescription` flag. Ensure no payment or fulfilment is possible without approval.
2. **Password recovery:** connect a transactional email provider, deliver one-time reset links, remove reset-token logging, and verify the flow end to end.
3. **Prescription file privacy/persistence:** Render's free filesystem is ephemeral, so files can disappear after restarts/redeploys. Use secure object storage or a persistent disk before real prescription uploads.
4. **Repository hygiene:** several PDF files are currently tracked under `prohealth/server/storage/prescriptions/`. Do not use them in slides. Confirm they are synthetic; if any contain real data, remove them from the repository and history and rotate access as appropriate. The current `.gitignore` does not ignore general prescription uploads.
5. **Admin access:** change the seeded demo admin password; do not publish demo credentials in the slides.
6. **M-Pesa:** current Blueprint default is `simulate`. Sandbox requires fresh Daraja sandbox keys, shortcode/passkey, transaction type, and `MPESA_CALLBACK_URL=https://prohealth-kmz5.onrender.com/api/mpesa/callback`. Live payments require approved production credentials and merchant authorization.
7. **Free hosting constraints:** Render free web services sleep when idle and have limited resources; TiDB Starter has free quotas. This is a demonstration setup, not a production reliability commitment.
8. **Testing evidence:** the owner confirmed the deployed site works, but the repository does not provide a comprehensive automated acceptance/load-test report. The stated target of 50 concurrent users and three-second page loads remains unverified.
9. **Project documentation:** replace group/member placeholders and stale paths/names in README and deliverable docs. The active deployment uses `prohealth/client` and `prohealth/server`; the repository also contains alternate/older `admin/`, `backend/`, and root-level package artifacts.

### Slide 12 — Demo sequence and conclusion

- Open the live app and browse/search the catalogue.
- Show an OTC item flowing through cart and checkout.
- Show the Rx-required product indicator and the upload/review flow without exposing real prescription documents.
- Sign in to the staff panel and show prescription queue, inventory batches, order workflow, and reports.
- Demonstrate M-Pesa simulation unless the Daraja sandbox environment is fully configured.
- Close with the main value: one connected workflow for customers and pharmacy staff, with prescription review and batch-aware inventory.

## Requirements coverage

| Requirement from Deliverable 1 | Current implementation evidence | Status for presentation |
|---|---|---|
| Accounts, login, roles, password recovery | Customer/staff login, registration, admin user management, role checks; reset email still missing | Mostly implemented; email gap must be disclosed |
| Catalogue and search | Search, category/type/price filters, availability and product details | Implemented; validate live Rx flags |
| Cart, order, payment and fulfilment | Cart, pickup/delivery, M-Pesa integration modes, order tracking, callback workflow | Implemented; sandbox configuration not confirmed |
| Prescription handling | Upload, pharmacist queue, approve/reject, payment gate | Implemented in code; live bypass report requires verification |
| Inventory and reporting | Batch stock, FEFO deduction, low/expiry indicators, reports, CSV and audit log | Implemented in code; operational testing should be documented |
| Security, usability, reliability NFRs | Hashing, prepared statements, CSRF, security headers, sessions, optional TOTP; responsive UI | Core controls present; load/security review still needed |

## Audit against the attached 2026 course guidelines

This checklist distinguishes artifacts found in the project from claims that still need a demonstration, test, or completion. “Present” means the repository contains implementation or documentation evidence; it is not a substitute for instructor acceptance or runtime testing.

### Deliverable 1 — Planning and requirements

| Guideline item | Finding | Status |
|---|---|---|
| Project title and system description | ProHealth title and online-pharmacy description are in the requirements document and README. | Present |
| Group members and assigned tasks | Roles/tasks are drafted, but member names, registration numbers, and group name are placeholders. | Incomplete |
| Five functional requirements | FR1–FR5 are documented in Deliverable 1. | Present |
| Three non-functional requirements | NFR1–NFR3 are documented. Performance targets are not backed by load-test evidence. | Present as requirements; unverified in operation |

### Deliverable 2 — Analysis and design

| Guideline item | Finding | Status |
|---|---|---|
| Flow chart | Editable draw.io source and two exported flow images are present. | Present |
| Use case diagram | Source and exported image are present. | Present |
| Class diagram | Source and exported image are present. | Present |
| Entity-relationship diagram | Source and exported image are present. | Present |
| Database schema with attributes, types, keys, and constraints | SQL schema and design documentation are present; the design document names `prohealth_db`, while the active deployment uses `prohealth`. Reconcile the name before final submission. | Present; naming discrepancy to fix |
| Customer and admin UI mock-ups | Four customer and six admin screen exports and SVGs are present. The README still has a placeholder for the Figma link. | Present; source link incomplete |

### Deliverable 3 — Development and integration

| Guideline item | Finding | Status |
|---|---|---|
| Developed database | MySQL-compatible schema/seed scripts exist, and the deployed app is connected to TiDB Cloud. | Present; owner confirmed site works |
| Front end | React/Vite customer and staff/admin pages are implemented. | Present |
| Admin panel | Inventory, prescriptions, orders, users, security, reports, and audit screens are implemented in the active client. | Present in code; demonstrate live access |
| Front end and admin connected to database | Customer and staff APIs share the Express service and database connection. | Present in code; demonstrate core flows |

### Deliverable 4 — Final presentation, testing, deployment, and maintenance

| Guideline criterion | Finding | Status |
|---|---|---|
| Normalized database, entities, relationships, cardinalities | 14-table relational schema, foreign keys, uniqueness/check constraints, and ER documentation are present. | Present; ensure design name matches deployed database |
| Consistent, usable interface | Customer/admin UI and responsive styling are implemented; design mock-ups are available. | Present; usability testing evidence would strengthen it |
| Add, delete, update, browse, and search | CRUD/search flows exist across catalogue, users, suppliers, inventory, and related admin areas. | Present in code; show examples |
| Help and clear error messages | Customer Help page, form validation, and API error handling exist. | Present |
| Main transaction works | Order, payment, prescription, and stock logic are implemented; the owner confirmed the deployed app works. The full payment/stock workflow and live prescription gate still need a recorded acceptance test. | Partially verified |
| Roles, login/logout, registration, forgotten password | Customer/staff login, registration, logout, and roles exist. Reset tokens exist, but no email service sends the reset link. | Partially complete |
| Reports with company identity, date, filtering, sorting | Report UI displays pharmacy details and generated date/user; reports can be filtered, sorted, printed, or exported as CSV. A project-created capsule mark now replaces the generic plus in the report header; replace it with an official logo if the pharmacy supplies one. | Present; official logo optional |
| Frameworks, libraries, and APIs | React, Express, Bootstrap, Font Awesome, MySQL driver, and Daraja integration are used. | Present |
| Validation, exception handling, modularity | Server-side validation, route modules, business logic modules, and a central API error handler are present. | Present in code |
| Creativity/unique features | Prescription review, batch-level stock, FEFO deduction, order tracking, and audit trail support the pharmacy-specific workflow. | Present |
| Coding practices | Code is split into client/server modules and uses prepared statements. Automated test suite is not present; server test command is only a placeholder. | Partially complete |
| Live deployment | Render free web service with TiDB Cloud is live at the URL above. | Present; owner confirmed it works |
| User manual and documentation | Requirements/design docs, deployment guide, Daraja guide, README, and in-app Help exist. A step-by-step customer/staff user manual is not present. | Partially complete |
| Audit trail | Audit log schema, server audit calls, and admin audit UI exist. | Present in code |
| Security, including password hashing, prepared queries, and 2FA | Hashing, prepared queries, HTTPS, CSRF, and security headers exist. TOTP is optional rather than enforced for all admin accounts; encryption at rest is not evidenced. | Partially complete |
| Presentation and project understanding | Requires the team to fill in member details, prepare the demo, and present the flows. | To do |

## Readiness summary

**The project has the main artifacts and a live, functioning demo, but it is not yet fully ready to claim every guideline item is complete.** The highest-priority presentation and release actions are:

1. Fill the team/group placeholders and add the Figma source link.
2. Use `prohealth/docs/ACCEPTANCE_TEST_PLAN.md` to record a manual acceptance run; add a customer/staff user manual.
3. Verify the reported Rx-order behavior against a known Rx-only product and correct live database flags or code as needed.
4. Connect email delivery for password recovery and stop logging reset tokens.
5. Decide whether admin 2FA must be mandatory and enforce it if the guideline is interpreted literally.
6. Reconcile `prohealth_db` vs `prohealth` in documentation and remove stale repository paths.
7. Review tracked prescription PDFs; use only synthetic data in the demo, slides, and public repository.
8. Record whether M-Pesa is in simulation or sandbox mode; do not describe live payment as tested unless verified.

## Design and presentation assets

Use the existing exports where they support the narrative:

- **System diagrams:** `prohealth/design/diagrams/png/flow_1.png`, `flow_2.png`, `usecase.png`, `class.png`, `er.png`.
- **Customer screens:** `prohealth/design/ui-mockups/png/customer_1_login_register.png` through `customer_4_orders_tracking.png`.
- **Staff screens:** `prohealth/design/ui-mockups/png/admin_1_login_2fa.png` through `admin_6_users.png`.
- **Source documents:** `prohealth/docs/deliverable-1/ProHealth_Deliverable1_Requirements.docx`, `prohealth/docs/deliverable-2/ProHealth_Deliverable2_Design_Document.docx`.
- **Deployment notes:** `prohealth/docs/RENDER_DEPLOYMENT.md` and `prohealth/docs/MPESA_DARAJA_SETUP.md`.
- **Acceptance testing:** `prohealth/docs/ACCEPTANCE_TEST_PLAN.md`.

## Facts to verify before presenting

- Confirm all team names, registration numbers, and the correct group name.
- Confirm the live M-Pesa mode and whether sandbox credentials are configured.
- Confirm the exact Rx-only live product and successful prevention of checkout/payment without a prescription.
- Confirm the seeded admin password has been changed; keep all passwords out of the deck.
- Confirm the tracked prescription PDFs are synthetic and safe to retain; never embed them in the deck.
- If presenting performance or security claims, provide fresh test evidence rather than treating requirements as measured results.

## Source-of-truth notes

- The repository README summarizes the original course project, but contains placeholders and stale folder references.
- The current service definition is the root `render.yaml`; the live application code is under `prohealth/client` and `prohealth/server`.
- The design document labels the database `prohealth_db`; the active Render configuration and server default use `prohealth`.
- This brief describes implemented code separately from intended requirements and highlights items that remain unverified.
