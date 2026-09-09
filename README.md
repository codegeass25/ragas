# RAGAS v6.0 PWA Frontend

The frontend is separated from the local backend in the same deployment pattern used by the COOP system:

- `index.html` - application shell and role-sensitive workspaces
- `app.css` - responsive light/dark UI and component styling
- `app.js` - client workflow, RBAC-aware navigation, and API interaction
- `manifest.webmanifest` / `sw.js` / `icons/` - PWA assets

When hosted on GitHub Pages, the frontend uses `https://vege.mdmsportal.uk` as the API base. When served by the Node backend it uses the same origin.

RAGAS v6 roles:
- SUPERADMIN - full operations, Reports, Administration and Settings
- PROJECT_MANAGER - Dashboard, Sales, Purchases, Inventory transactions, Finance and Transaction History only

The backend remains authoritative for permissions; hiding a control in the browser is not the security boundary.
