import { useState } from "react";
import { truncateAddress, generateJazzicon } from "../utils/helpers";
import { useWeb3 } from "../context/Web3Context";
import { useToast } from "./Toast";

export default function OwnersList({ owners }) {
  const { currentAccount } = useWeb3();
  const showToast = useToast();
  const [copiedAddr, setCopiedAddr] = useState(null);

  const handleCopy = async (addr) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedAddr(addr);
      showToast("Address copied!", "success");
      setTimeout(() => setCopiedAddr(null), 2000);
    } catch {
      showToast("Failed to copy", "error");
    }
  };

  return (
    <section className="card owners-section" id="owners-section">
      <div className="card-header">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Wallet Owners
        </h2>
        <span className="badge badge-count">{owners.length} signers</span>
      </div>
      <div className="owners-list" id="owners-list">
        {owners.length === 0 ? (
          <p className="text-muted">Connect wallet to view owners</p>
        ) : (
          owners.map((addr, i) => {
            const isYou = addr.toLowerCase() === currentAccount;
            return (
              <button
                key={addr}
                className={`owner-chip ${isYou ? "is-you" : ""}`}
                onClick={() => handleCopy(addr)}
                title={`Click to copy: ${addr}`}
              >
                <span
                  className="owner-avatar"
                  style={{ background: generateJazzicon(addr) }}
                >
                  {i + 1}
                </span>
                <span className="owner-addr">
                  {copiedAddr === addr ? "Copied!" : truncateAddress(addr)}
                </span>
                {isYou && <span className="you-badge">you</span>}
                <svg className="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
