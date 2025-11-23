# DataTable Configuration Guide

The DataTable receives two important props:
- `data`: array of objects (rows)
- `config`: configuration object that controls columns, search, filters, sorting, formatting and pagination

Example `config`:
```ts
const config = {
  columns: [
    {
      key: "bin",
      header: "BIN",
      visible: true,
      searchable: true,
      sortable: true,
      filterable: true,
      format: { type: "number" } // supported types: text, number, date
    },
    {
      key: "brand",
      header: "Brand",
      visible: true,
      searchable: true,
      sortable: true,
      filterable: true,
      format: { type: "text", transform: "capitalize" }
    }
  ],
  globalSearchDebounceMs: 300,
  pageSizes: [10,25,50],
  defaultPageSize: 10
};
```

Notes:
- `key` must match keys in the data objects.
- `visible` toggles column visibility.
- `format.type` determines rendering and comparisons for sorting/filtering.
- Custom render functions can be passed as `render: (value, row) => JSX.Element`.
- Filters support multiple conditions per column (OR) and AND across columns.
