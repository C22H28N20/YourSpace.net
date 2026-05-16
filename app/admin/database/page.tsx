"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";

export default function AdminDatabasePage() {
  const router = useRouter();
  const [tables, setTables] = useState<Array<{ name: string; count: number }> | null>(null);
  const [tableData, setTableData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [loadingTable, setLoadingTable] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  async function loadDatabase() {
    setLoading(true);
    const response = await fetch("/api/admin/database", { credentials: "include" });
    if (!response.ok) {
      router.push("/auth");
      return;
    }
    const result = await response.json();
    setTables(result.tables ?? []);
    setTableData({});
    setLoading(false);
  }

  async function loadTable(tableName: string) {
    if (tableData[tableName]) {
      return;
    }

    setLoadingTable(tableName);
    try {
      const response = await fetch(`/api/admin/database?table=${encodeURIComponent(tableName)}`, { credentials: "include" });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        alert(error?.error || "Failed to load table");
        return;
      }

      const result = await response.json();
      setTableData((current) => ({ ...current, [tableName]: result.rows ?? [] }));
    } finally {
      setLoadingTable(null);
    }
  }

  async function handleDeleteUser(userId: number, username: string) {
    const confirmed = window.confirm(`Delete account for ${username}? This will remove the user and related records.`);
    if (!confirmed) {
      return;
    }

    setDeletingUserId(userId);
    try {
      const response = await fetch(`/api/admin/database`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        alert(error?.error || "Failed to delete user");
        return;
      }

      await loadDatabase();
      if (expandedTable) {
        await loadTable(expandedTable);
      }
    } finally {
      setDeletingUserId(null);
    }
  }

  useEffect(() => {
    void loadDatabase();
  }, [router]);

  if (loading) {
    return <PageShell title="Admin Database" subtitle="Loading..."><p>Loading database...</p></PageShell>;
  }

  if (!tables) {
    return <PageShell title="Admin Database" subtitle="Error"><p>Failed to load database</p></PageShell>;
  }

  const tableNames = tables.map((table) => table.name).sort();

  return (
    <PageShell title="Admin Database Viewer" subtitle="Full database schema and contents">
      <style>{`
        .db-table-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }
        .db-table-btn {
          padding: 12px 16px;
          border: 2px solid #ddd;
          border-radius: 8px;
          background: white;
          color: #333;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .db-table-btn:hover {
          border-color: #4caf50;
          box-shadow: 0 4px 8px rgba(76, 175, 80, 0.2);
          transform: translateY(-2px);
        }
        .db-table-btn.active {
          background: #4caf50;
          color: white;
          border-color: #45a049;
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
        }
        .db-table-count {
          display: block;
          font-size: 12px;
          opacity: 0.7;
          margin-top: 4px;
        }
        .db-table-container {
          display: none;
        }
        .db-table-container.active {
          display: block;
          animation: slideIn 0.2s ease;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .db-collapse-btn {
          margin-top: 16px;
          padding: 8px 16px;
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        }
        .db-collapse-btn:hover {
          background: #e0e0e0;
        }
      `}</style>

      <div className="stack">
        <section className="widget">
          <h3>📊 Database Tables ({tableNames.length})</h3>
          <p style={{ color: "#666", marginBottom: "16px", fontSize: "15px" }}>Click a table to view its contents:</p>
          <div className="db-table-grid">
            {tables.sort((a, b) => a.name.localeCompare(b.name)).map((table) => (
              <button
                key={table.name}
                type="button"
                onClick={async () => {
                  const nextTable = expandedTable === table.name ? null : table.name;
                  setExpandedTable(nextTable);
                  if (nextTable) {
                    await loadTable(nextTable);
                  }
                }}
                className={`db-table-btn ${expandedTable === table.name ? "active" : ""}`}
              >
                {table.name}
                <span className="db-table-count">{table.count} rows</span>
              </button>
            ))}
          </div>
        </section>

        {tableNames.map((tableName) => (
          <section key={tableName} className={`widget db-table-container ${expandedTable === tableName ? "active" : ""}`}>
            <h3>📋 {tableName}</h3>
            {expandedTable === tableName ? (
              <>
                {loadingTable === tableName ? (
                  <p style={{ color: "#666", fontStyle: "italic", fontSize: "15px" }}>Loading table...</p>
                ) : !tableData[tableName] ? (
                  <p style={{ color: "#666", fontStyle: "italic", fontSize: "15px" }}>Select the tab again to load this table.</p>
                ) : tableData[tableName].length === 0 ? (
                  <p style={{ color: "#999", fontStyle: "italic", fontSize: "15px" }}>No records found</p>
                ) : (
                  <div style={{ overflowX: "auto", marginBottom: "16px" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "14px",
                        border: "1px solid #ddd",
                        borderRadius: "6px",
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #ddd" }}>
                          {Object.keys(tableData[tableName][0]).map((key) => (
                            <th 
                              key={key} 
                              style={{ 
                                textAlign: "left", 
                                padding: "12px", 
                                borderRight: "1px solid #e0e0e0",
                                fontWeight: "600",
                                color: "#333",
                                fontSize: "14px",
                              }}
                            >
                              {key}
                            </th>
                          ))}
                          {tableName === "User" && (
                            <th style={{ textAlign: "left", padding: "12px", fontWeight: "600", color: "#333", fontSize: "14px" }}>
                              actions
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData[tableName].map((row: any, index: number) => (
                          <tr 
                            key={index} 
                            style={{ 
                              borderBottom: "1px solid #e0e0e0",
                              backgroundColor: index % 2 === 0 ? "#fff" : "#f9f9f9",
                            }}
                          >
                            {Object.entries(row).map(([key, value]: [string, any]) => (
                              <td
                                key={key}
                                style={{
                                  padding: "10px 12px",
                                  borderRight: "1px solid #e0e0e0",
                                  maxWidth: "250px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  fontSize: "14px",
                                }}
                                title={typeof value === "string" ? value : JSON.stringify(value)}
                              >
                                {value === null ? (
                                  <span style={{ color: "#aaa", fontStyle: "italic" }}>null</span>
                                ) : typeof value === "object" ? (
                                  <code style={{ fontSize: "12px", backgroundColor: "#f0f0f0", padding: "2px 4px", borderRadius: "3px" }}>
                                    {JSON.stringify(value).substring(0, 50)}...
                                  </code>
                                ) : (
                                  String(value)
                                )}
                              </td>
                            ))}
                            {tableName === "User" && (
                              <td style={{ padding: "10px 12px", borderRight: "1px solid #e0e0e0", whiteSpace: "nowrap" }}>
                                <button
                                  type="button"
                                  className="secondary"
                                  onClick={() => handleDeleteUser(Number(row.user_id), String(row.username))}
                                  disabled={deletingUserId === Number(row.user_id)}
                                >
                                  {deletingUserId === Number(row.user_id) ? "Deleting..." : "Delete Account"}
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setExpandedTable(null)}
                  className="db-collapse-btn"
                >
                  ← Collapse Table
                </button>
              </>
            ) : (
              <p style={{ color: "#aaa", fontSize: "15px", margin: "0" }}>
                ✓ {tables.find((table) => table.name === tableName)?.count ?? 0} row{(tables.find((table) => table.name === tableName)?.count ?? 0) !== 1 ? "s" : ""} available
              </p>
            )}
          </section>
        ))}
      </div>
    </PageShell>
  );
}
