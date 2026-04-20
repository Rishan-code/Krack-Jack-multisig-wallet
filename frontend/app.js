// ═══════════════════════════════════════════════════════
//  MultiSig Vault — Frontend DApp
//  ethers.js v6 + MetaMask integration
// ═══════════════════════════════════════════════════════

// ─── Configuration ───
// Default: local Hardhat/Anvil node. Update after deploy.
const CONFIG = {
  // Will be overwritten by deployment.json if available
  contractAddress: "",
  chainId: 31337, // Hardhat local
};

// ─── Contract ABI (inline for portability) ───
const CONTRACT_ABI = [
  "constructor(address[] _owners, uint256 _requiredApprovals)",
  "event Deposit(address indexed sender, uint256 amount)",
  "event TransactionSubmitted(uint256 indexed txId, address indexed owner, address indexed to, uint256 value, bytes data)",
  "event Approved(uint256 indexed txId, address indexed owner)",
  "event ApprovalRevoked(uint256 indexed txId, address indexed owner)",
  "event Executed(uint256 indexed txId, address indexed owner)",
  "function owners(uint256) view returns (address)",
  "function isOwner(address) view returns (bool)",
  "function requiredApprovals() view returns (uint256)",
  "function transactions(uint256) view returns (address to, uint256 value, bytes data, uint256 approvalCount, bool executed)",
  "function approved(uint256, address) view returns (bool)",
  "function submitTransaction(address _to, uint256 _value, bytes _data) returns (uint256 txId)",
  "function approveTransaction(uint256 _txId)",
  "function revokeApproval(uint256 _txId)",
  "function executeTransaction(uint256 _txId)",
  "function getTransaction(uint256 _txId) view returns (address to, uint256 value, bytes data, uint256 approvalCount, bool executed)",
  "function getApprovers(uint256 _txId) view returns (address[])",
  "function getTransactionCount() view returns (uint256)",
  "function getOwners() view returns (address[])",
  "receive() payable",
];

// ─── App State ───
let provider = null;
let signer = null;
let contract = null;
let currentAccount = null;
let isOwnerAccount = false;

// ─── DOM References ───
const $ = (id) => document.getElementById(id);

const DOM = {
  btnConnect: $("btn-connect"),
  walletInfo: $("wallet-info"),
  walletAddress: $("wallet-address"),
  ownerBadge: $("owner-badge"),
  networkBadge: $("network-badge"),
  networkName: $("network-name"),
  vaultBalance: $("vault-balance"),
  ownerCount: $("owner-count"),
  thresholdValue: $("threshold-value"),
  txCount: $("tx-count"),
  ownersList: $("owners-list"),
  submitForm: $("submit-form"),
  inputTo: $("input-to"),
  inputValue: $("input-value"),
  inputData: $("input-data"),
  btnSubmitTx: $("btn-submit-tx"),
  btnRefresh: $("btn-refresh"),
  transactionsList: $("transactions-list"),
  toastContainer: $("toast-container"),
};

// ═══════════════════════════════════════════════════════
//  Initialization
// ═══════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
  DOM.btnConnect.addEventListener("click", connectWallet);
  DOM.submitForm.addEventListener("submit", handleSubmitTransaction);
  DOM.btnRefresh.addEventListener("click", refreshAll);

  // Try loading deployment info
  loadDeploymentInfo();

  // Auto-connect if already connected
  if (window.ethereum && window.ethereum.selectedAddress) {
    connectWallet();
  }
});

async function loadDeploymentInfo() {
  try {
    const res = await fetch("deployment.json");
    if (res.ok) {
      const info = await res.json();
      CONFIG.contractAddress = info.MultiSigWallet;
      console.log("Loaded deployment info:", info);
    }
  } catch (e) {
    console.log("No deployment.json found — enter contract address manually.");
  }
}

// ═══════════════════════════════════════════════════════
//  Wallet Connection
// ═══════════════════════════════════════════════════════

async function connectWallet() {
  if (!window.ethereum) {
    showToast("MetaMask not detected. Please install MetaMask.", "error");
    return;
  }

  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    currentAccount = accounts[0].toLowerCase();

    // Get network info
    const network = await provider.getNetwork();
    DOM.networkName.textContent =
      network.chainId === 31337n
        ? "Localhost"
        : network.name || `Chain ${network.chainId}`;
    DOM.networkBadge.classList.remove("hidden");

    // Update UI
    DOM.walletAddress.textContent = truncateAddress(currentAccount);
    DOM.walletInfo.classList.remove("hidden");
    DOM.btnConnect.classList.add("hidden");

    // Try to connect to contract
    if (CONFIG.contractAddress) {
      await initContract();
    } else {
      // Prompt for address
      const addr = prompt("Enter MultiSigWallet contract address:");
      if (addr && ethers.isAddress(addr)) {
        CONFIG.contractAddress = addr;
        await initContract();
      } else {
        showToast("Invalid contract address.", "error");
      }
    }

    // Listen for account changes
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", () => window.location.reload());
  } catch (err) {
    console.error("Connection error:", err);
    showToast("Failed to connect wallet: " + err.message, "error");
  }
}

async function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    showToast("Wallet disconnected", "info");
    window.location.reload();
  } else {
    currentAccount = accounts[0].toLowerCase();
    DOM.walletAddress.textContent = truncateAddress(currentAccount);
    signer = await provider.getSigner();
    contract = new ethers.Contract(
      CONFIG.contractAddress,
      CONTRACT_ABI,
      signer
    );
    await refreshAll();
  }
}

// ═══════════════════════════════════════════════════════
//  Contract Initialization
// ═══════════════════════════════════════════════════════

async function initContract() {
  contract = new ethers.Contract(
    CONFIG.contractAddress,
    CONTRACT_ABI,
    signer
  );

  // Check if current user is an owner
  isOwnerAccount = await contract.isOwner(currentAccount);
  if (isOwnerAccount) {
    DOM.ownerBadge.classList.remove("hidden");
  }
  DOM.btnSubmitTx.disabled = !isOwnerAccount;

  await refreshAll();
  showToast("Connected to MultiSig Wallet!", "success");
}

// ═══════════════════════════════════════════════════════
//  Data Refresh
// ═══════════════════════════════════════════════════════

async function refreshAll() {
  if (!contract) return;

  try {
    await Promise.all([
      refreshStatusCards(),
      refreshOwnersList(),
      refreshTransactions(),
    ]);
  } catch (err) {
    console.error("Refresh error:", err);
    showToast("Error refreshing data: " + err.message, "error");
  }
}

async function refreshStatusCards() {
  const [balance, owners, threshold, txCount] = await Promise.all([
    provider.getBalance(CONFIG.contractAddress),
    contract.getOwners(),
    contract.requiredApprovals(),
    contract.getTransactionCount(),
  ]);

  DOM.vaultBalance.textContent = parseFloat(
    ethers.formatEther(balance)
  ).toFixed(4);
  DOM.ownerCount.textContent = owners.length.toString();
  DOM.thresholdValue.textContent = `${threshold} of ${owners.length}`;
  DOM.txCount.textContent = txCount.toString();
}

async function refreshOwnersList() {
  const owners = await contract.getOwners();

  DOM.ownersList.innerHTML = owners
    .map((addr, i) => {
      const isYou = addr.toLowerCase() === currentAccount;
      return `
        <div class="owner-chip ${isYou ? "is-you" : ""}">
          <span class="owner-index">${i + 1}</span>
          ${truncateAddress(addr)}
          ${isYou ? ' <span style="color: var(--accent-light); font-family: var(--font); font-weight: 600;">(you)</span>' : ""}
        </div>
      `;
    })
    .join("");
}

async function refreshTransactions() {
  const txCount = await contract.getTransactionCount();
  const count = Number(txCount);

  if (count === 0) {
    DOM.transactionsList.innerHTML =
      '<p class="text-muted">No transactions submitted yet</p>';
    return;
  }

  const threshold = Number(await contract.requiredApprovals());

  let html = "";
  // Show newest first
  for (let i = count - 1; i >= 0; i--) {
    const [to, value, data, approvalCount, executed] =
      await contract.getTransaction(i);

    const ac = Number(approvalCount);
    const pct = Math.min((ac / threshold) * 100, 100);
    const isComplete = ac >= threshold;

    // Check if current user has approved
    let userApproved = false;
    if (isOwnerAccount) {
      userApproved = await contract.approved(i, currentAccount);
    }

    const approvers = await contract.getApprovers(i);

    html += `
      <div class="tx-card" id="tx-card-${i}">
        <div class="tx-header">
          <span class="tx-id">TX #${i}</span>
          <span class="tx-status ${executed ? "executed" : "pending"}">
            ${executed ? "✓ Executed" : "⏳ Pending"}
          </span>
        </div>

        <div class="tx-details">
          <div class="tx-detail">
            <span class="tx-detail-label">Recipient</span>
            <span class="tx-detail-value">${truncateAddress(to)}</span>
          </div>
          <div class="tx-detail">
            <span class="tx-detail-label">Value</span>
            <span class="tx-detail-value">${ethers.formatEther(value)} ETH</span>
          </div>
          <div class="tx-detail">
            <span class="tx-detail-label">Calldata</span>
            <span class="tx-detail-value">${data === "0x" ? "(none)" : truncateData(data)}</span>
          </div>
          <div class="tx-detail">
            <span class="tx-detail-label">Approvers</span>
            <span class="tx-detail-value">${approvers.map((a) => truncateAddress(a)).join(", ") || "none"}</span>
          </div>
        </div>

        <div class="tx-approvals-bar">
          <div class="approval-progress">
            <div class="approval-progress-fill ${isComplete ? "complete" : ""}" style="width: ${pct}%"></div>
          </div>
          <span class="approval-text">${ac} / ${threshold} approvals</span>
        </div>

        ${
          !executed && isOwnerAccount
            ? `
          <div class="tx-actions">
            ${
              !userApproved
                ? `<button class="btn btn-success btn-sm" onclick="handleApprove(${i})">
                    ✓ Approve
                   </button>`
                : `<button class="btn btn-warning btn-sm" onclick="handleRevoke(${i})">
                    ↺ Revoke
                   </button>`
            }
            ${
              isComplete
                ? `<button class="btn btn-primary btn-sm" onclick="handleExecute(${i})">
                    ⚡ Execute
                   </button>`
                : ""
            }
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  DOM.transactionsList.innerHTML = html;
}

// ═══════════════════════════════════════════════════════
//  Transaction Actions
// ═══════════════════════════════════════════════════════

async function handleSubmitTransaction(e) {
  e.preventDefault();
  if (!contract || !isOwnerAccount) return;

  const to = DOM.inputTo.value.trim();
  const value = DOM.inputValue.value.trim();
  const data = DOM.inputData.value.trim() || "0x";

  if (!ethers.isAddress(to)) {
    showToast("Invalid recipient address", "error");
    return;
  }

  try {
    showToast("Submitting transaction...", "info");
    const tx = await contract.submitTransaction(
      to,
      ethers.parseEther(value),
      data
    );
    await tx.wait();
    showToast("Transaction submitted successfully!", "success");
    DOM.submitForm.reset();
    DOM.inputValue.value = "0";
    DOM.inputData.value = "0x";
    await refreshAll();
  } catch (err) {
    console.error("Submit error:", err);
    showToast("Submit failed: " + extractErrorMsg(err), "error");
  }
}

async function handleApprove(txId) {
  if (!contract) return;
  try {
    showToast(`Approving TX #${txId}...`, "info");
    const tx = await contract.approveTransaction(txId);
    await tx.wait();
    showToast(`TX #${txId} approved!`, "success");
    await refreshAll();
  } catch (err) {
    console.error("Approve error:", err);
    showToast("Approve failed: " + extractErrorMsg(err), "error");
  }
}

async function handleRevoke(txId) {
  if (!contract) return;
  try {
    showToast(`Revoking approval for TX #${txId}...`, "info");
    const tx = await contract.revokeApproval(txId);
    await tx.wait();
    showToast(`Approval revoked for TX #${txId}`, "success");
    await refreshAll();
  } catch (err) {
    console.error("Revoke error:", err);
    showToast("Revoke failed: " + extractErrorMsg(err), "error");
  }
}

async function handleExecute(txId) {
  if (!contract) return;
  try {
    showToast(`Executing TX #${txId}...`, "info");
    const tx = await contract.executeTransaction(txId);
    await tx.wait();
    showToast(`TX #${txId} executed successfully! 🎉`, "success");
    await refreshAll();
  } catch (err) {
    console.error("Execute error:", err);
    showToast("Execute failed: " + extractErrorMsg(err), "error");
  }
}

// ═══════════════════════════════════════════════════════
//  Utilities
// ═══════════════════════════════════════════════════════

function truncateAddress(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function truncateData(data) {
  if (!data || data === "0x") return "(none)";
  if (data.length <= 20) return data;
  return data.slice(0, 10) + "..." + data.slice(-6);
}

function extractErrorMsg(err) {
  if (err.reason) return err.reason;
  if (err.data && err.data.message) return err.data.message;
  if (err.message && err.message.length < 120) return err.message;
  return "Transaction reverted";
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icons = {
    success: "✓",
    error: "✕",
    info: "ℹ",
  };

  toast.innerHTML = `<strong>${icons[type] || "ℹ"}</strong> ${message}`;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}
