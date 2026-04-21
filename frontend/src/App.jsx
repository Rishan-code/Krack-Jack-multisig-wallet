import { useState } from "react";
import { useWeb3 } from "./context/Web3Context";
import { useContract } from "./hooks/useContract";
import Header from "./components/Header";
import StatusCards from "./components/StatusCards";
import OwnersList from "./components/OwnersList";
import SubmitForm from "./components/SubmitForm";
import TransactionList from "./components/TransactionList";
import DepositModal from "./components/DepositModal";

export default function App() {
  const { isConnected, contractError, networkName, deploymentNetwork, contract } = useWeb3();
  const {
    balance,
    owners,
    threshold,
    txCount,
    transactions,
    isLoading,
    actionLoading,
    refreshAll,
    submitTransaction,
    approveTransaction,
    revokeApproval,
    executeTransaction,
    depositToVault,
  } = useContract();

  const [depositOpen, setDepositOpen] = useState(false);

  return (
    <>
      {/* Animated Background */}
      <div className="bg-grid" />
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />
      <div className="bg-glow bg-glow-3" />

      {/* Header */}
      <Header onDepositClick={() => setDepositOpen(true)} />

      {/* Main Content */}
      <main className="app-main" id="app-main">
        {!isConnected ? (
          /* ─── Landing / Connect Prompt ─── */
          <div className="connect-prompt">
            <div className="connect-prompt-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="m7 11 0-4a5 5 0 0 1 10 0l0 4" />
              </svg>
            </div>
            <h2>Welcome to MultiSig<span className="accent">Vault</span></h2>
            <p>Connect your wallet to interact with the multi-signature treasury</p>
            <div className="connect-features">
              <div className="feature">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>M-of-N Security</span>
              </div>
              <div className="feature">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>Multi-Owner</span>
              </div>
              <div className="feature">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span>On-Chain Execution</span>
              </div>
            </div>
          </div>
        ) : contractError ? (
          /* ─── Contract Error / Network Mismatch ─── */
          <div className="connect-prompt">
            <div className="connect-prompt-icon error-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2>Network Mismatch</h2>
            <p className="error-message">{contractError}</p>
            <div className="network-info-box">
              <div className="network-row">
                <span className="network-label">Your Network</span>
                <span className="network-value current">{networkName}</span>
              </div>
              {deploymentNetwork && (
                <div className="network-row">
                  <span className="network-label">Contract Deployed On</span>
                  <span className="network-value expected">{deploymentNetwork}</span>
                </div>
              )}
            </div>
            <p className="help-text">
              {deploymentNetwork === "localhost" ? (
                <>Switch MetaMask to <strong>Localhost 8545</strong> (Hardhat), or deploy the contract to Sepolia.</>
              ) : (
                <>Switch MetaMask to <strong>{deploymentNetwork || "the correct network"}</strong>, or redeploy the contract to your current network.</>
              )}
            </p>
          </div>
        ) : (
          /* ─── Main Dashboard ─── */
          <>
            <StatusCards
              balance={balance}
              ownerCount={owners.length}
              threshold={threshold}
              totalOwners={owners.length}
              txCount={txCount}
            />
            <OwnersList owners={owners} />
            <SubmitForm
              onSubmit={submitTransaction}
              isLoading={actionLoading === "submit"}
            />
            <TransactionList
              transactions={transactions}
              onApprove={approveTransaction}
              onRevoke={revokeApproval}
              onExecute={executeTransaction}
              onRefresh={refreshAll}
              actionLoading={actionLoading}
              isLoading={isLoading}
            />
          </>
        )}
      </main>

      {/* Deposit Modal */}
      <DepositModal
        isOpen={depositOpen}
        onClose={() => setDepositOpen(false)}
        onDeposit={depositToVault}
        isLoading={actionLoading === "deposit"}
      />
    </>
  );
}
