import { useEffect, useState, useRef } from "react";

function AnimatedNumber({ value, duration = 600 }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    const to = typeof value === "number" ? value : parseFloat(value) || 0;
    const fromNum = typeof from === "number" ? from : parseFloat(from) || 0;

    if (fromNum === to) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      if (typeof value === "number" && Number.isInteger(value)) {
        setDisplay(Math.round(fromNum + (to - fromNum) * ease));
      } else {
        setDisplay((fromNum + (to - fromNum) * ease).toFixed(4));
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplay(value);
      }
    };

    requestAnimationFrame(animate);
    prevRef.current = value;
  }, [value, duration]);

  return <>{display}</>;
}

export default function StatusCards({ balance, ownerCount, threshold, totalOwners, txCount }) {
  return (
    <section className="status-cards" id="status-section">
      <div className="card status-card" id="card-balance">
        <div className="card-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div className="card-data">
          <span className="card-label">Vault Balance</span>
          <span className="card-value" id="vault-balance">
            <AnimatedNumber value={balance} />
          </span>
          <span className="card-sub">ETH</span>
        </div>
      </div>

      <div className="card status-card" id="card-owners">
        <div className="card-icon icon-purple">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div className="card-data">
          <span className="card-label">Owners</span>
          <span className="card-value" id="owner-count">
            <AnimatedNumber value={ownerCount} />
          </span>
          <span className="card-sub">signers</span>
        </div>
      </div>

      <div className="card status-card" id="card-threshold">
        <div className="card-icon icon-amber">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div className="card-data">
          <span className="card-label">Threshold</span>
          <span className="card-value" id="threshold-value">
            {threshold} of {totalOwners}
          </span>
          <span className="card-sub">required approvals</span>
        </div>
      </div>

      <div className="card status-card" id="card-txcount">
        <div className="card-icon icon-teal">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <div className="card-data">
          <span className="card-label">Transactions</span>
          <span className="card-value" id="tx-count">
            <AnimatedNumber value={txCount} />
          </span>
          <span className="card-sub">total submitted</span>
        </div>
      </div>
    </section>
  );
}
