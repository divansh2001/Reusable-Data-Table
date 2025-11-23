import React, { useEffect, useMemo, useRef, useState } from "react";

type Operator = "contains" | "equals" | "starts" | "ends" | "gt" | "lt";

type ColumnConfig = {
  key: string;
  header?: string;
  visible?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  format?: {
    type?: "text" | "number" | "date" | "currency";
    transform?: "uppercase" | "lowercase" | "capitalize";
    currency?: string;
    decimals?: number;
  };
  render?: (value: any, row: any) => React.ReactNode;
  width?: number;
};

type TableConfig = {
  columns: ColumnConfig[];
  globalSearchDebounceMs?: number;
  pageSizes?: number[];
  defaultPageSize?: number;
};

type FilterCondition = { op: Operator; value: string };

function compareValues(a: any, b: any, type?: string) {
  if (type === "number" || type === "currency") {
    const na = parseFloat(String(a).replace(/[^0-9.-]/g, ""));
    const nb = parseFloat(String(b).replace(/[^0-9.-]/g, ""));
    if (!isFinite(na) || !isFinite(nb))
      return String(a).localeCompare(String(b));
    return na - nb;
  }
  if (type === "date") {
    const da = Date.parse(a);
    const db = Date.parse(b);
    return (isNaN(da) ? 0 : da) - (isNaN(db) ? 0 : db);
  }
  return String(a).localeCompare(String(b));
}

function rowsToCsv(rows: any[], columns: ColumnConfig[]) {
  const header = columns.map((c) => `"${c.header ?? c.key}"`).join(",");
  const lines = rows.map((row) => {
    return columns
      .map((c) => {
        const s = String(row[c.key] ?? "").replace(/"/g, '""');
        return `"${s}"`;
      })
      .join(",");
  });
  return [header, ...lines].join("\n");
}

export default function DataTable({
  data,
  config,
}: {
  data: any[];
  config: TableConfig;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const debMs = config.globalSearchDebounceMs ?? 300;
  const debounceRef = useRef<number | undefined>(undefined);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(
      () => setDebouncedSearch(searchTerm.trim().toLowerCase()),
      debMs
    );
    return () => window.clearTimeout(debounceRef.current);
  }, [searchTerm, debMs]);

  const pageOptions = config.pageSizes ?? [10, 25, 50];
  const defaultSize = config.defaultPageSize ?? pageOptions[0];
  const [pageSize, setPageSize] = useState(defaultSize);
  const [page, setPage] = useState(1);

  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const [columnVisible, setColumnVisible] = useState<Record<string, boolean>>(
    () => {
      const map: Record<string, boolean> = {};
      config.columns.forEach((c) => (map[c.key] = c.visible !== false));
      return map;
    }
  );

  const [columnFilters, setColumnFilters] = useState<
    Record<string, FilterCondition[]>
  >({});

  const visibleColumns = useMemo(
    () => config.columns.filter((c) => columnVisible[c.key]),
    [config.columns, columnVisible]
  );

  const [sortState, setSortState] = useState<{
    key: string;
    dir: "asc" | "desc" | null;
  }>({ key: "", dir: null });

  function applyFilterCondition(value: string, cond: FilterCondition) {
    const left = String(value ?? "").toLowerCase();
    const right = String(cond.value ?? "").toLowerCase();
    switch (cond.op) {
      case "contains":
        return left.includes(right);
      case "equals":
        return left === right;
      case "starts":
        return left.startsWith(right);
      case "ends":
        return left.endsWith(right);
      case "gt":
        return parseFloat(left) > parseFloat(right);
      case "lt":
        return parseFloat(left) < parseFloat(right);
      default:
        return false;
    }
  }

  const filteredRows = useMemo(() => {
    let rows = data.slice();

    if (debouncedSearch) {
      rows = rows.filter((r) =>
        visibleColumns.some((col) => {
          if (!col.searchable) return false;
          return String(r[col.key] ?? "")
            .toLowerCase()
            .includes(debouncedSearch);
        })
      );
    }

    Object.entries(columnFilters).forEach(([colKey, conditions]) => {
      if (!conditions || conditions.length === 0) return;
      rows = rows.filter((row) => {
        return conditions.some((cond) =>
          applyFilterCondition(String(row[colKey] ?? ""), cond)
        );
      });
    });

    if (sortState.key && sortState.dir) {
      const col = config.columns.find((c) => c.key === sortState.key);
      rows.sort((a, b) => {
        const cmp = compareValues(
          a[sortState.key],
          b[sortState.key],
          col?.format?.type
        );
        return sortState.dir === "asc" ? cmp : -cmp;
      });
    }

    return rows;
  }, [
    data,
    debouncedSearch,
    columnFilters,
    sortState,
    visibleColumns,
    config.columns,
  ]);

  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  function addFilterCondition(columnKey: string) {
    setColumnFilters((prev) => ({
      ...prev,
      [columnKey]: [...(prev[columnKey] ?? []), { op: "contains", value: "" }],
    }));
  }
  function updateFilterCondition(
    columnKey: string,
    index: number,
    patch: Partial<FilterCondition>
  ) {
    setColumnFilters((prev) => {
      const arr = (prev[columnKey] ?? []).slice();
      arr[index] = { ...arr[index], ...patch };
      return { ...prev, [columnKey]: arr };
    });
  }
  function removeFilterCondition(columnKey: string, index: number) {
    setColumnFilters((prev) => {
      const arr = (prev[columnKey] ?? []).slice();
      arr.splice(index, 1);
      return { ...prev, [columnKey]: arr };
    });
  }

  function toggleRowSelection(indexInPage: number, event?: React.MouseEvent) {
    const globalIndex = (page - 1) * pageSize + indexInPage;
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (event?.shiftKey && next.size > 0) {
        const last = Array.from(next).pop() ?? globalIndex;
        const [start, end] = [
          Math.min(last, globalIndex),
          Math.max(last, globalIndex),
        ];
        for (let i = start; i <= end; i++) next.add(i);
      } else if (event?.ctrlKey || event?.metaKey) {
        next.has(globalIndex)
          ? next.delete(globalIndex)
          : next.add(globalIndex);
      } else {
        if (next.has(globalIndex) && next.size === 1) next.clear();
        else {
          next.clear();
          next.add(globalIndex);
        }
      }
      return next;
    });
  }
  function toggleSelectAllOnPage(checked: boolean) {
    if (checked) {
      const next = new Set(selectedRows);
      const start = (page - 1) * pageSize;
      for (let i = 0; i < pageRows.length; i++) next.add(start + i);
      setSelectedRows(next);
    } else {
      const next = new Set(selectedRows);
      const start = (page - 1) * pageSize;
      for (let i = 0; i < pageRows.length; i++) next.delete(start + i);
      setSelectedRows(next);
    }
  }

  function downloadCsv() {
    const cols = config.columns.filter((c) => columnVisible[c.key]);
    const csv = rowsToCsv(filteredRows, cols);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function isNumericString(s: string) {
    if (!s) return false;
    return !isNaN(Number(String(s).replace(/[^0-9.-]/g, "")));
  }

  return (
    <div>
      <div className="dt-toolbar" role="toolbar" aria-label="Table controls">
        <input
          aria-label="Global search"
          className="dt-search"
          placeholder="Search..."
          disabled={visibleColumns.length === 0}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
        />

        <div
          style={{ display: "flex", gap: 8, alignItems: "center" }}
          className="dt-controls"
        >
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Page size:
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(1);
              }}
            >
              {pageOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="dt-filter"
              onClick={() =>
                setColumnVisible((prev) => {
                  const next = { ...prev };
                  Object.keys(next).forEach((k) => (next[k] = true));
                  return next;
                })
              }
            >
              Show all cols
            </button>
            <button
              className="dt-filter"
              onClick={() =>
                setColumnVisible((prev) => {
                  const next = { ...prev };
                  Object.keys(next).forEach((k) => (next[k] = false));
                  return next;
                })
              }
            >
              Hide all cols
            </button>
            <button className="dt-filter" onClick={downloadCsv}>
              Export filtered CSV
            </button>
            <button className="dt-filter" onClick={() => setColumnFilters({})}>
              Clear all filters
            </button>
          </div>

          <div style={{ marginLeft: 8 }} className="badge" aria-live="polite">
            {filteredRows.length} rows (showing {pageRows.length})
          </div>
        </div>
      </div>

      <div className="column-section" aria-label="Column visibility">
        <strong>Columns:</strong>
        <div style={{ marginTop: 8 }}>
          {config.columns.map((col) => (
            <label key={col.key} style={{ marginRight: 12, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={!!columnVisible[col.key]}
                onChange={(e) =>
                  setColumnVisible((prev) => ({
                    ...prev,
                    [col.key]: e.target.checked,
                  }))
                }
              />{" "}
              {col.header ?? col.key}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ marginBottom: 8 }}>Advanced Filters</h3>

        {config.columns
          .filter((c) => c.filterable)
          .map((col) => {
            const conditions = columnFilters[col.key] ?? [];
            return (
              <div
                key={col.key}
                className="filter-box"
                aria-label={`Filters for ${col.header ?? col.key}`}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong>{col.header ?? col.key}</strong>
                    <div style={{ marginTop: 6 }}>
                      <small className="tip">
                        Tip: Multiple conditions in a column use OR. Filters
                        across columns use AND.
                      </small>
                    </div>
                  </div>

                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <button onClick={() => addFilterCondition(col.key)} disabled={!columnVisible[col.key]} >
                      + condition
                    </button>
                  </div>
                </div>

                {conditions.length === 0 && (
                  <div style={{ marginTop: 10, color: "#666" }}>
                    No conditions — add one to filter this column.
                  </div>
                )}

                {conditions.map((cond, idx) => {
                  const currentValue = cond.value ?? "";
                  const operatorsEnabled = String(currentValue).trim() !== "";
                  return (
                    <div
                      key={idx}
                      className="filter-row"
                      style={{ marginTop: 10 }}
                    >
                      <select
                        value={cond.op}
                        disabled={!operatorsEnabled}
                        onChange={(e) =>
                          updateFilterCondition(col.key, idx, {
                            op: e.target.value as Operator,
                          })
                        }
                      >
                        <option value="contains">contains</option>
                        <option value="equals">equals</option>
                        <option value="starts">starts with</option>
                        <option value="ends">ends with</option>
                        <option value="gt">greater than</option>
                        <option value="lt">less than</option>
                      </select>

                      <input
                        placeholder="value"
                        value={cond.value}
                        onChange={(e) =>
                          updateFilterCondition(col.key, idx, {
                            value: e.target.value,
                          })
                        }
                      />

                      <button
                        onClick={() => removeFilterCondition(col.key, idx)}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
      </div>

      {visibleColumns.length === 0 ? (
        <div className="dt-empty">
          No columns selected — please enable at least one column to view the
          table.
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="dt-empty">No results found</div>
      ) : (
        <table className="dt-table" role="grid" aria-label="Data Table">
          <thead>
            <tr role="row">
              <th style={{ width: 40 }}>
                <input
                  aria-label="Select all on page"
                  type="checkbox"
                  onChange={(e) => toggleSelectAllOnPage(e.target.checked)}
                  checked={
                    pageRows.length > 0 &&
                    pageRows.every((_, i) =>
                      selectedRows.has((page - 1) * pageSize + i)
                    )
                  }
                />
              </th>

              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  role="columnheader"
                  onClick={() =>
                    col.sortable &&
                    setSortState((prev) => {
                      if (prev.key !== col.key)
                        return { key: col.key, dir: "asc" };
                      if (prev.dir === "asc")
                        return { key: col.key, dir: "desc" };
                      return { key: "", dir: null };
                    })
                  }
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span>{col.header ?? col.key}</span>
                    {col.sortable &&
                      sortState.key === col.key &&
                      sortState.dir && (
                        <span className="sort-ind">
                          {sortState.dir === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {pageRows.map((row, ri) => {
              const globalIndex = (page - 1) * pageSize + ri;
              const isSelected = selectedRows.has(globalIndex);
              return (
                <tr
                  key={globalIndex}
                  className={isSelected ? "row-highlight" : ""}
                  onClick={(e) => toggleRowSelection(ri, e as any)}
                >
                  <td>
                    <input type="checkbox" checked={isSelected} readOnly />
                  </td>

                  {visibleColumns.map((col, ci) => (
                    <td
                      key={col.key}
                      role="gridcell"
                      tabIndex={0}
                      data-row-index={ri}
                      data-cell-index={ci}
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : formatCellValue(row[col.key], col)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {visibleColumns.length !== 0 && (
        <>
          <div className="pagination-bar">
            <div className="pagination-child">
              <button onClick={() => setPage(1)} disabled={page === 1}>
                First
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </button>
              <span style={{ margin: "0 8px" }}>Page</span>
              <input
                aria-label="Page number"
                type="number"
                value={page}
                onChange={(e) =>
                  setPage(
                    Math.min(
                      Math.max(1, parseInt(e.target.value || "1", 10)),
                      totalPages
                    )
                  )
                }
                style={{ width: 60 }}
              />
              <span style={{ marginLeft: 8 }}>of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
              >
                Last
              </button>
            </div>

            <div>
              <small>
                Rows {Math.min(1, totalRows)}-
                {Math.min(totalRows, page * pageSize)} of {totalRows}
              </small>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatCellValue(value: any, column: ColumnConfig) {
  const raw = value ?? "";
  const type = column.format?.type;

  if (raw === "") return "";

  if (type === "number" || type === "currency") {
    const cleaned = String(raw).replace(/[^0-9.-]/g, "");
    const n = parseFloat(cleaned);
    if (Number.isFinite(n)) {
      const decimals =
        typeof column.format?.decimals === "number"
          ? column.format!.decimals
          : 0;
      const numStr = n.toLocaleString(undefined, {
        maximumFractionDigits: decimals,
      });
      return type === "currency"
        ? (column.format?.currency ?? "") + " " + numStr
        : numStr;
    }
    return String(raw);
  }

  if (type === "date") {
    const d = new Date(String(raw));
    if (!isNaN(d.getTime())) return d.toLocaleDateString();
    return String(raw);
  }

  let s = String(raw);
  if (column.format?.transform === "uppercase") s = s.toUpperCase();
  if (column.format?.transform === "lowercase") s = s.toLowerCase();
  if (column.format?.transform === "capitalize")
    s = s.replace(/\b\w/g, (c) => c.toUpperCase());
  return s;
}
