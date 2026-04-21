import { useWeb3 } from "../context/Web3Context";
import { useToast } from "./Toast";
import { truncateAddress } from "../utils/helpers";

export default function Header({ onDepositClick }) {
  const { isConnected, isConnecting, currentAccount, networkName, isOwner, connectWallet } = useWeb3();
  const showToast = useToast();

  const handleConnect = async () => {
    try {
      await connectWallet();
      showToast("Wallet connected!", "success");
    } catch (err) {
      showToast(err.message || "Failed to connect wallet", "error");
    }
  };

  return (
    <header className="app-header" id="app-header">
      <div className="header-content">
        <div className="logo">
          <div className="logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="m7 11 0-4a5 5 0 0 1 10 0l0 4" />
            </svg>
          </div>
          <h1 className="logo-text">
            MultiSig<span className="accent">Vault</span>
          </h1>
        </div>

        <div className="header-right">
          {isConnected && networkName && (
            <div className="badge badge-network" id="network-badge">
              <span className="pulse-dot" />
              <span id="network-name">{networkName}</span>
            </div>
          )}

          {isConnected && (
            <button className="btn btn-deposit" id="btn-deposit" onClick={onDepositClick}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Deposit
            </button>
          )}

          {!isConnected ? (
            <button
              className="btn btn-primary"
              id="btn-connect"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <span className="spinner" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Connect Wallet
                </>
              )}
            </button>
          ) : (
            <div className="wallet-info" id="wallet-info">
              <div className="wallet-address" id="wallet-address">
                {truncateAddress(currentAccount)}
              </div>
              {isOwner && (
                <div className="badge badge-owner" id="owner-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Owner
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
