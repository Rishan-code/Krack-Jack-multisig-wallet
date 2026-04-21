import { useState } from "react";
import TransactionCard from "./TransactionCard";
import { useToast } from "./Toast";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "executed", label: "Executed" },
];

export default function TransactionList({
  transactions,
  onApprove,
  onRevoke,
  onExecute,
  onRefresh,
  actionLoading,
  isLoading,
}) {
  const [filter, setFilter] = useState("all");
  const showToast = useToast();

  const filtered = transactions.filter((tx) => {
    if (filter === "pending") return !tx.executed;
    if (filter === "executed") return tx.executed;
    return true;
  });

  const pendingCount = transactions.filter((t) => !t.executed).length;
  const executedCount = transactions.filter((t) => t.executed).length;

  const handleApprove = async (id) => {
    try {
      await onApprove(id);
      showToast(`TX #${id} approved!`, "success");
    } catch (err) {
      showToast("Approve failed: " + (err.reason || err.message), "error");
    }
  };

  const handleRevoke = async (id) => {
    try {
      await onRevoke(id);
      showToast(`Approval revoked for TX #${id}`, "success");
    } catch (err) {
      showToast("Revoke failed: " + (err.reason || err.message), "error");
    }
  };

  const handleExecute = async (id) => {
    try {
      await onExecute(id);
      showToast(`TX #${id} executed! 🎉`, "success");
    } catch (err) {
      showToast("Execute failed: " + (err.reason || err.message), "error");
    }
  };

  return (
    <section className="card transactions-section" id="transactions-section">
      <div className="card-header">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Transactions
        </h2>
        <div className="header-actions">
          <div className="filter-tabs">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`filter-tab ${filter === f.key ? "active" : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                {f.key === "pending" && pendingCount > 0 && (
                  <span className="filter-count">{pendingCount}</span>
                )}
                {f.key === "executed" && executedCount > 0 && (
                  <span className="filter-count executed">{executedCount}</span>
                )}
              </button>
            ))}
          </div>
          <button
            className={`btn btn-ghost btn-icon ${isLoading ? "spinning" : ""}`}
            id="btn-refresh"
            onClick={onRefresh}
            title="Refresh"
            disabled={isLoading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="transactions-list" id="transactions-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
              <rect x="2" y="3" width="20" height="18" rx="2" />
              <line x1="8" y1="9" x2="16" y2="9" />
              <line x1="8" y1="13" x2="14" y2="13" />
              <line x1="8" y1="17" x2="12" y2="17" />
            </svg>
            <p className="text-muted">
              {filter === "all"
                ? "No transactions submitted yet"
                : `No ${filter} transactions`}
            </p>
          </div>
        ) : (
          filtered.map((tx) => (
            <TransactionCard
              key={tx.id}
              tx={tx}
              onApprove={handleApprove}
              onRevoke={handleRevoke}
              onExecute={handleExecute}
              actionLoading={actionLoading}
            />
          ))
        )}
      </div>
    </section>
  );
}
