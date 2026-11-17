# ProHealth Acceptance Test Plan

## Purpose

Use this manual checklist to verify the main customer and pharmacy workflows before the final presentation. Run it against a staging or demo database with synthetic users, medicines, addresses, and prescription files. Do not use real customer data or real prescriptions.

## Test setup

- Use the deployed demo or a staging deployment and record the URL, build/commit, date, and tester.
- Confirm database connectivity through `/healthz` before starting.
- Use separate synthetic accounts for a customer, pharmacist, and administrator.
- Keep M-Pesa in `simulate` for the general acceptance pass. Run the Daraja sandbox cases only after sandbox credentials and the callback URL are configured.
- Prepare a seeded OTC product, a seeded Rx product (for example, Amoxil 500 mg), a valid synthetic PDF image, and an invalid file type.
- Record for every case: pass/fail, observed result, expected result, and a screenshot or sanitized log excerpt.

## Customer workflow

| ID | Scenario | Steps | Expected result |
|---|---|---|---|
| C01 | Register a customer | Submit valid name, email, Kenyan phone, matching strong password and confirmation. | Account is created; password is not returned or exposed; customer can sign in. |
| C02 | Validate registration | Try malformed email/phone, mismatched passwords, and duplicate email. | Form/API rejects invalid values with clear errors; no duplicate account is created. |
| C03 | Sign in and out | Sign in, browse a protected page, sign out, then revisit it. | Login works; logout clears access; protected pages require sign-in. |
| C04 | Browse and search | Search by medicine name; filter by category, price, and OTC/Rx type; sort results. | Results match the selected query/filters and show price, availability, and Rx status. |
| C05 | OTC checkout | Add an in-stock OTC product, choose pickup, submit checkout without a prescription. | Order is created; customer sees order details/payment step; no prescription is requested. |
| C06 | Rx checkout without file | Add an Rx-flagged product and submit checkout with no file. | Server rejects checkout; no order is created. This is a critical safety acceptance case. |
| C07 | Reject an invalid upload | Add an Rx product and attempt to upload an unsupported file type or file over 5 MB. | Upload is rejected with a clear error; no prescription/order is created. |
| C08 | Submit a synthetic prescription | Add an Rx product and upload a valid synthetic PDF/JPG/PNG. | A pending prescription and pending order are created; the customer cannot pay yet. |
| C09 | Pay gate before approval | Open the pending Rx order and attempt payment. | Payment is unavailable until a pharmacist approves the prescription. |
| C10 | Order tracking | Open order history and an order detail. | Status, line items, totals, fulfilment choice, prescription state, and timeline are consistent. |
| C11 | Profile and password change | Update profile details; change password using current and matching new password. | Valid changes save; incorrect current password or mismatched new password is rejected. |

## Pharmacy staff and admin workflow

| ID | Scenario | Steps | Expected result |
|---|---|---|---|
| A01 | Role access | Sign in as customer, pharmacist, and admin; try staff/admin URLs and actions. | Each role can access only permitted views/actions; customer cannot call admin APIs. |
| A02 | Prescription approval | As pharmacist, open pending prescription, review synthetic file, approve it. | Status changes to approved and the customer can proceed to payment. |
| A03 | Prescription rejection | Reject a pending prescription with a note. | Status changes to rejected, customer sees the note, and payment remains blocked. |
| A04 | Inventory batch management | Add/edit a synthetic batch with supplier, quantity, and future expiry date. | Batch is saved and stock/availability reflects the new quantity. |
| A05 | Expiry and low-stock indicators | Set test batch quantity/expiry to trigger each condition. | Dashboard/inventory shows low-stock and expiring indicators accurately. |
| A06 | Order processing | After an approved prescription and successful payment, advance order through allowed statuses. | Invalid status transitions are rejected; valid transitions appear in both staff and customer views. |
| A07 | User administration | As admin, create a staff user, suspend/reactivate a test user, and reset a test account password. | Changes are role-protected, reflected in login/access, and audited. |
| A08 | Reports | Filter report dates, sort columns, print to PDF, and export CSV. | Date range, generated timestamp, pharmacy identity, totals, sorting, print layout, and CSV rows are correct. |
| A09 | Audit trail | Perform a representative admin action and open the audit log. | The action, actor, target, time, and relevant details appear without exposing credentials. |
| A10 | Admin 2FA | Enable TOTP for a test staff account and log in again. | Login requires a valid authenticator code; invalid/expired codes are rejected. |

## Payment and stock cases

| ID | Scenario | Steps | Expected result |
|---|---|---|---|
| P01 | Simulated payment success | Pay an eligible OTC order in simulation mode and confirm success. | Order becomes paid; payment is recorded; stock is deducted once. |
| P02 | Simulated payment failure | Simulate cancellation/failure. | Order is not marked paid; stock is not deducted; customer can retry as designed. |
| P03 | FEFO deduction | Create two eligible batches for one test medicine with different expiry dates; pay for a quantity smaller than the earliest batch. | The earliest-expiring batch is reduced first. |
| P04 | Duplicate callback protection | Replay the same successful callback in a sandbox/staging setup. | The duplicate does not double-deduct stock or duplicate payment/order effects. |
| P05 | Daraja sandbox (optional gate) | Only after sandbox configuration, submit a test STK push and wait for the callback. | Sandbox prompt/callback is handled; payment is marked successful only on a matching successful callback. No live credentials are used. |

## Release acceptance criteria

- All critical cases C06, C09, A02, A03, P01, P02, and P04 pass.
- No prescription-only order can be paid or processed without pharmacist approval.
- Database, customer API, and staff/admin APIs remain available through the tested workflows.
- Test users, orders, batches, and uploaded synthetic files are identified for cleanup or retained as demo data.
- Known gaps are documented: password-reset email delivery is not implemented; Render free storage is ephemeral; the demo is not evidence of production load capacity.

## Result record

| Run date | Environment / commit | Tester | Passed | Failed | Blockers / evidence location |
|---|---|---|---:|---:|---|
|  |  |  |  |  |  |
