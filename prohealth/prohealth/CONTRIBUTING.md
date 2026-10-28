# How we work

1. `main` always holds working, reviewed work. Do not commit straight to it.
2. Make a branch for each task, named `<area>/<short-description>`, for example `frontend/catalogue-page` or `database/add-index`.
3. Commit small and often with clear messages, for example `Add cart page layout`.
4. Open a pull request into `main`. Another member reviews and merges it.
5. Pull from `main` before you start work each day.

## Rules

- Never commit passwords, API keys (such as M-Pesa keys) or `.env` files. Share them privately.
- Use prepared statements for every database query.
- Put code in the right folder: customer pages in `frontend/`, admin pages in `admin/`, shared server code in `backend/`.
- Keep `database/schema.sql` and the draw.io schema page in step with each other.
- Comment your code and use clear names (marks are given for this).
