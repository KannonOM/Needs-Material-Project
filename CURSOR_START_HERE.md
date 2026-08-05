# Cursor Start Here

Open this entire folder in Cursor.

Application name: **Needs Material Dashboard**  
Subtitle: **Purchasing Work Queue**  

Dashboard header lines: title, subtitle, `Last Refresh: …`, and informational `Source: Production Scheduler - 2026.xlsx`.

The exact Sunday prototype is preserved at `public/sunday-prototype.html` and can be opened directly in a browser.

The Next.js implementation is in:

- `app/page.jsx`
- `app/sunday-prototype.jsx`
- `app/styles.css`
- `data/sample-data.js`

First prompt for Cursor:

> Read PROJECT.md, TASKS.md, README.md, and inspect public/sunday-prototype.html plus the Next.js files. This is the Needs Material Dashboard baseline (Purchasing Work Queue). Do not redesign the approved Version 1 UI. First make the local Next.js app install and run, fixing only technical problems. Then provide a file-by-file plan to replace local login, sample data, localStorage, refresh simulation, and invitations with Microsoft Entra ID, SharePoint, a shared database, scheduled refresh, and real invitation handling. Do not change the visible UI beyond approved branding.
