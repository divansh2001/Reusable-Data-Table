import React, { useEffect, useState } from "react";
import DataTable from "./components/DataTable";
import { parseCSV } from "./utils/csvParser";

const config = {
  columns: [
    {
      key: "bin",
      header: "BIN",
      visible: true,
      searchable: true,
      sortable: true,
      filterable: true,
      format: { type: "text" },
    },
    {
      key: "brand",
      header: "Brand",
      visible: true,
      searchable: true,
      sortable: true,
      filterable: true,
    },
    {
      key: "type",
      header: "Type",
      visible: true,
      searchable: true,
      sortable: true,
      filterable: true,
    },
    {
      key: "category",
      header: "Category",
      visible: true,
      searchable: true,
      sortable: true,
      filterable: true,
    },
    {
      key: "issuer",
      header: "Issuer",
      visible: true,
      searchable: true,
      sortable: true,
      filterable: true,
    },
    {
      key: "countryname",
      header: "Country",
      visible: true,
      searchable: true,
      sortable: true,
      filterable: true,
    },
  ],
  globalSearchDebounceMs: 300,
  pageSizes: [5, 10, 25],
  defaultPageSize: 5,
};

export default function App() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");

  useEffect(() => {
    async function loadCsv() {
      setIsLoading(true);
      try {
        const url =
          "https://raw.githubusercontent.com/venelinkochev/bin-list-data/master/bin-list-data.csv";
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch CSV (${res.status})`);
        const text = await res.text();
        const parsed = parseCSV(text);
        setRows(parsed);
      } catch (err: any) {
        setLoadError(String(err?.message ?? err));
      } finally {
        setIsLoading(false);
      }
    }
    loadCsv();
  }, []);

  return (
    <div className="app">
      <h1>Reusable Data Table</h1>
      <p>Sample implementation with the BIN data</p>

      {isLoading && <div className="dt-empty">Loading data…</div>}
      {loadError && <div className="dt-empty">Error: {loadError}</div>}

      {!isLoading && !loadError && <DataTable data={rows} config={config} />}
    </div>
  );
}
