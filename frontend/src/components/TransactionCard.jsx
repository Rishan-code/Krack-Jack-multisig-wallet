import { useState } from "react";
import { ethers } from "ethers";
import { truncateAddress, truncateData, generateJazzicon } from "../utils/helpers";
import { useWeb3 } from "../context/Web3Context";

export default function TransactionCard({
  tx,
  onApprove,
  onRevoke,
  onExecute,
  actionLoading,
}) {
  const { isOwner } = useWeb3();
  const [expanded, setExpanded] = useState(false);

  const {
    id,
    to,
    value,
    data,
    approvalCount,
    executed,
    approvers,
    userApproved,
    threshold,
  } = tx;

  const pct = Math.min((approvalCount / threshold) * 100, 100);
  const isComplete = approvalCount >= threshold;
  const isApproving = actionLoading === `approve-${id}`;
  const isRevoking = actionLoading === `revoke-${id}`;
  const isExecuting = actionLoading === `execute-${id}`;

  return (
    <div className={`tx-card ${executed ? "tx-executed" : ""} ${expanded ? "tx-expanded" : ""}`} id={`tx-card-${id}`}>
      <button className="tx-header" onClick={() => setExpanded(!expanded)}>
        <div className="tx-header-left">
          <span className="tx-id">TX #{id}</span>
          <span className="tx-value-badge">
            {parseFloat(ethers.formatEther(value)).toFixed(4)} ETH
          </span>
        </div>
        <div className="tx-header-right">
          <span className={`tx-status ${executed ? "executed" : "pending"}`}>
            {executed ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Executed
              </>
            ) : (
              <>
                <span className="status-pulse" />
                Pending
              </>
            )}
          </span>
          <svg
            className={`chevron ${expanded ? "expanded" : ""}`}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Approval Progress Bar — always visible */}
      <div className="tx-approvals-bar">
        <div className="approval-progress">
          <div
            className={`approval-progress-fill ${isComplete ? "complete" : ""}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="approval-text">
          {approvalCount} / {threshold}
        </span>
      </div>

      {/* Expandable Details */}
      <div className={`tx-expand-content ${expanded ? "show" : ""}`}>
        <div className="tx-details">
          <div className="tx-detail">
            <span className="tx-detail-label">Recipient</span>
            <span className="tx-detail-value mono">{truncateAddress(to)}</span>
          </div>
          <div className="tx-detail">
            <span className="tx-detail-label">Value</span>
            <span className="tx-detail-value">{ethers.formatEther(value)} ETH</span>
          </div>
          <div className="tx-detail">
            <span className="tx-detail-label">Calldata</span>
            <span className="tx-detail-value mono">
              {data === "0x" ? "(none)" : truncateData(data)}
            </span>
          </div>
          <div className="tx-detail">
            <span className="tx-detail-label">Approvers</span>
            <div className="approver-list">
              {approvers.length === 0 ? (
                <span className="tx-detail-value">none yet</span>
              ) : (
                approvers.map((addr) => (
                  <span
                    key={addr}
                    className="approver-chip"
                    title={addr}
                  >
                    <span
                      className="approver-dot"
                      style={{ background: generateJazzicon(addr) }}
                    />
                    {truncateAddress(addr)}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {!executed && isOwner && (
          <div className="tx-actions">
            {!userApproved ? (
              <button
                className="btn btn-success btn-sm"
                onClick={() => onApprove(id)}
                disabled={isApproving}
              >
                {isApproving ? (
                  <span className="spinner spinner-sm" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                Approve
              </button>
            ) : (
              <button
                className="btn btn-warning btn-sm"
                onClick={() => onRevoke(id)}
                disabled={isRevoking}
              >
                {isRevoking ? (
                  <span className="spinner spinner-sm" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                )}
                Revoke
              </button>
            )}
            {isComplete && (
              <button
                className="btn btn-execute btn-sm"
                onClick={() => onExecute(id)}
                disabled={isExecuting}
              >
                {isExecuting ? (
                  <span className="spinner spinner-sm" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                )}
                Execute
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
