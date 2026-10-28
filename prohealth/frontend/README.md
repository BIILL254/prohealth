# ProHealth customer frontend

The customer storefront is built with React, TypeScript, and Vite. It includes
the medicine catalogue and customer home, prescriptions, orders, help, and
account screens, based on the references in `../design/ui-mockups/png/`.

## Run locally

```powershell
npm install
npm run dev
```

These screens currently use sample in-memory data for UI development. They are
not connected to the API or database yet.

## Current features

- Home page shortcuts to medicines, prescriptions, orders, and help.
- Catalogue search, filters, sorting, cart quantities, and out-of-stock feedback.
- Prescription file selection and client-side status list.
- Order history filters, progress details, and demo receipt download.
- Help FAQs and a client-side contact form.
- Account menu with demo account switching, sign-in, and registration forms.
- Light/dark theme toggle; the initial theme follows the device preference and
  the selected theme is saved in browser storage.

Uploads, orders, account switching, and contact messages are local frontend
previews only. Authentication, data persistence, pharmacist review,
notifications, and server-side checkout are not connected.
