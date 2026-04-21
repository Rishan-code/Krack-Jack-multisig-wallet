import { useState, useEffect, useRef } from "react";
import { useToast } from "./Toast";

const QUICK_AMOUNTS = ["0.01", "0.1", "0.5", "1.0"];

export default function DepositModal({ isOpen, onClose, onDeposit, isLoading }) {
  const [amount, setAmount] = useState("0.1");
  const showToast = useToast();
  const modalRef = useRef(null);
  const inputRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === modalRef.current) onClose();
  };

  const handleDeposit = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      showToast("Enter a valid amount", "error");
      return;
    }
    try {
      await onDeposit(amount);
      showToast(`Deposited ${amount} ETH to vault!`, "success");
      onClose();
    } catch (err) {
      showToast("Deposit failed: " + (err.reason || err.message), "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" ref={modalRef} onClick={handleBackdrop}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Deposit ETH to Vault
          </h3>
          <button className="modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Amount (ETH)</label>
            <input
              ref={inputRef}
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              disabled={isLoading}
            />
          </div>
          <div className="quick-amounts">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                className={`quick-btn ${amount === a ? "active" : ""}`}
                onClick={() => setAmount(a)}
                disabled={isLoading}
              >
                {a} ETH
              </button>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleDeposit} disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner" />
                Depositing...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                  <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                </svg>
                Deposit {amount} ETH
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
