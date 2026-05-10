# 🔐 Multi-Signature Wallet (MultiSig Vault)

**CS 218 — Programmable & Interoperable Blockchain | Project 10**

A shared treasury wallet requiring **M-of-N owner signatures** before any transaction executes. Modeled after the Gnosis Safe architecture — the most widely used multi-sig in DeFi, holding over $50 billion in assets.

---

## 👥 Team: Krack-Jack

| Name | Roll Number |
|------|-------------|
| Jatin Singh | 240003035 |
| Krishnam Digga | 240003043 |
| Abhinav Jain | 240003003 |
| Rishan Gobe | 240008023 |
| Harsh Bhalla | 240003033 |
| Kartik Budhani | 240005022 |
| Arjun Dhamdhere | 240005011 |

---

## 📋 Features

- **M-of-N Approval**: Configurable threshold — any combination (e.g., 2-of-3, 3-of-5)
- **Submit Transactions**: Any owner can propose a transaction (recipient, ETH value, calldata)
- **Approve / Revoke**: Each owner independently approves or revokes their approval
- **Execute**: Once M approvals are reached, any owner can trigger execution
- **Calldata Execution**: Execute arbitrary function calls on external contracts
- **Reentrancy Protection**: OpenZeppelin `ReentrancyGuard` + Checks-Effects-Interactions pattern
- **Gas Optimized**: Custom errors instead of revert strings, storage caching
- **Frontend DApp**: MetaMask-connected UI to manage all wallet operations

---

## 🏗️ Architecture

```
contracts/
├── MultiSigWallet.sol          # Main multi-sig wallet contract
├── SimpleCounter.sol            # Helper contract for calldata testing
└── mocks/
    └── ReentrancyAttacker.sol   # Attack contract for security testing

test/
└── MultiSigWallet.test.js      # Comprehensive test suite (39 tests)

scripts/
├── deploy.js                   # Deploy to local Hardhat node
└── deploy-sepolia.js           # Deploy to Sepolia testnet

reports/
├── gas-report.md               # Gas analysis with before/after optimisation
└── gas-report.txt              # Raw output from hardhat-gas-reporter (auto-generated)

frontend/
├── index.html                   # Vite entry point
├── src/
│   ├── App.jsx                  # Root component
│   ├── components/              # UI components (Header, SubmitForm, TransactionCard, ...)
│   ├── context/Web3Context.jsx  # MetaMask / ethers.js connection
│   ├── hooks/useContract.js     # Contract interaction hook
│   └── utils/                   # ABI, constants, helpers
└── public/
    ├── abi.json                 # Contract ABI (auto-generated on deploy)
    └── deployment.json          # Deployment addresses (auto-generated)
```

---

## 🚀 Setup & Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [MetaMask](https://metamask.io/) browser extension
- Git

### 1. Clone & Install

```bash
git clone https://github.com/Rishan-code/Krack-Jack-multisig-wallet.git
cd Krack-Jack-multisig-wallet
npm install
```

### 2. Compile Contracts

```bash
npx hardhat compile
```

### 3. Run Tests

```bash
# Run all tests
npx hardhat test

# Run tests with gas reporting
REPORT_GAS=true npx hardhat test

# Run tests with verbose output
npx hardhat test --verbose
```

### 4. Check Coverage

```bash
npx hardhat coverage
```

### 5. Deploy to Local Network

```bash
# Terminal 1: Start local Hardhat node
npx hardhat node

# Terminal 2: Deploy contracts
npx hardhat run scripts/deploy.js --network localhost
```

### 6. Run Frontend DApp

After deploying, open `frontend/index.html` in your browser. The deployment script auto-generates `abi.json` and `deployment.json` in the frontend folder.

**MetaMask Setup for Local Testing:**
1. Add Hardhat Network: RPC URL `http://127.0.0.1:8545`, Chain ID `31337`
2. Import test accounts using private keys from `npx hardhat node` output

---

## 📄 Contract Functions

| Function | Access | Description |
|----------|--------|-------------|
| `constructor(owners[], requiredApprovals)` | — | Initializes wallet with owners and M threshold |
| `submitTransaction(to, value, data)` | Owner | Proposes a new transaction, returns `txId` |
| `approveTransaction(txId)` | Owner | Signals approval for a pending transaction |
| `revokeApproval(txId)` | Owner | Withdraws approval before execution |
| `executeTransaction(txId)` | Owner | Executes transaction when M approvals reached |
| `getTransaction(txId)` | Anyone | Returns transaction details (view) |
| `getApprovers(txId)` | Anyone | Returns list of approving addresses (view) |
| `getTransactionCount()` | Anyone | Returns total submitted transactions (view) |
| `getOwners()` | Anyone | Returns list of all owners (view) |
| `receive()` | Anyone | Allows wallet to receive ETH |

---

## 🔒 Security Features

1. **ReentrancyGuard** (OpenZeppelin) — Applied to `executeTransaction()` to prevent reentrancy attacks during external calls
2. **Checks-Effects-Interactions (CEI)** — Transaction marked as `executed = true` **before** the external `.call()`
3. **Input Validation** — All functions validate inputs (zero addresses, duplicate owners, invalid txIds)
4. **Access Control** — `onlyOwner` modifier restricts all state-changing functions
5. **Custom Errors** — Gas-efficient custom errors instead of long revert strings

---

## ⛽ Gas Optimization

See [reports/gas-report.md](./reports/gas-report.md) for the full gas report and before/after optimization analysis.

**Key Optimizations Applied:**
- **Custom Errors** over `require()` strings — saves ~200 gas per revert
- **Storage Caching** — `Transaction storage txn = transactions[_txId]` avoids repeated SLOAD
- **`uint256`** for all counters — avoids extra gas for smaller integer packing
- **`external`** visibility on public-facing functions — cheaper than `public` for calldata
- **Optimizer enabled** at 200 runs

---

## 🧪 Test Coverage

The test suite includes **39 tests** covering:

- ✅ Constructor validation (empty owners, zero approvals, duplicates, zero-address)
- ✅ Submit transaction (owner-only, event emission)
- ✅ Approve transaction (owner-only, double-approve prevention, executed check)
- ✅ Revoke approval (decrement count, block execution until re-approved)
- ✅ Execute transaction (threshold check, CEI pattern, re-execute prevention)
- ✅ Calldata execution (SimpleCounter increment via multi-sig)
- ✅ ETH handling (receive, deposit event, send on execute)
- ✅ Full happy path (submit → approve → execute → verify state)
- ✅ Reentrancy attack prevention
- ✅ View function correctness

---

## 📝 License

MIT
