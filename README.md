# Data Table Project — Final

This project implements a reusable Data Table component with features required by the assignment.

**Features**
- CSV parsing and loading (supports remote fetch or bundled sample)
- Config-driven columns: visibility, headers, formatting, searchable, sortable, filterable
- Global search (debounced), sort, advanced multi-condition filters
- Pagination, column visibility panel, export of filtered/sorted CSV
- Keyboard navigation, ARIA roles, resizable columns, row selection (shift/meta), accessibility improvements
- No external UI or utility libraries; plain CSS only.

**Local files**
- Original assignment PDF used as reference: `/mnt/data/UI Engineering Question (1).pdf`

## Run
1. Install dependencies: `yarn` or `npm install`
2. Dev: `yarn dev` or `npm run dev`
3. Open: http://localhost:5173
4. Deployed in: https://reusable-data-table.netlify.app/


## Notes
- The app uses a bundled sample CSV for offline demo. To fetch the CSV from the GitHub repo, update `App.tsx` and use the raw file URL.
- Project created to match assignment constraints (no external UI libs).

