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
- **Frontend DApp**: MetaMask-connected React UI to manage all wallet operations

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
├── coverage-report.txt         # Test coverage report output
└── report.pdf                  # Full project report

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
- [npm](https://www.npmjs.com/) (v8+)
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

# Run tests with coverage
npx hardhat coverage
```

### 4. Deploy to Local Network

```bash
# Terminal 1: Start local Hardhat node
npx hardhat node

# Terminal 2: Deploy contracts
npx hardhat run scripts/deploy.js --network localhost
```

### 5. Deploy to Sepolia Testnet

```bash
# Ensure .env has PRIVATE_KEY and SEPOLIA_RPC_URL set
npx hardhat run scripts/deploy-sepolia.js --network sepolia
```

### 6. Run Frontend DApp

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. Connect MetaMask to Localhost 8545 (Chain ID: 31337) or Sepolia.

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

## ⛽ Gas Optimisation

See [`reports/gas-report.md`](./reports/gas-report.md) for the full report.

### Key Optimisation: Custom Errors vs `require()` Strings

**Function optimised:** All functions — most impactful on `executeTransaction` and `approveTransaction`.

**Before** (require strings):
```solidity
modifier onlyOwner() {
    require(isOwner[msg.sender], "MultiSigWallet: caller is not an owner");
    _;
}
function executeTransaction(...) external ... {
    require(txn.approvalCount >= requiredApprovals, "MultiSigWallet: insufficient approvals");
    require(success, "MultiSigWallet: transaction execution failed");
}
```

**After** (custom errors — current implementation):
```solidity
error NotOwner();
error InsufficientApprovals();
modifier onlyOwner() {
    if (!isOwner[msg.sender]) revert NotOwner();
    _;
}
```

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| Deployment gas | ~1,290,000 | 1,287,492 | ~2,500 gas |
| `approveTransaction` revert | ~24,500 | ~24,200 | ~300 gas |
| `executeTransaction` revert | ~24,800 | ~24,400 | ~400 gas |
| Bytecode size | ~5.2 KB | ~5.0 KB | ~200 bytes |

**Why it works:** `require()` strings are ABI-encoded and stored in bytecode (~40–50 bytes each). Custom errors use only a 4-byte selector — identical to a function selector — saving deployment gas and reducing revert cost at runtime.

**Additional optimisations:**
- `Transaction storage txn = transactions[_txId]` — avoids repeated SLOAD (~100 gas saved)
- `external` over `public` on all functions — calldata cheaper than memory (~60 gas per call)
- Optimizer at 200 runs in `hardhat.config.js`

---

## 🧪 Test Coverage

The test suite includes **39 tests** with **100% line coverage** (≥70% required).

```
File                     |  % Stmts | % Branch |  % Funcs |  % Lines |
-------------------------|----------|----------|----------|----------|
 MultiSigWallet.sol      |      100 |    90.74 |      100 |      100 |
 SimpleCounter.sol       |      100 |      100 |      100 |      100 |
 ReentrancyAttacker.sol  |      100 |       50 |      100 |      100 |
 All files               |      100 |    89.29 |      100 |      100 |
```

Full coverage report: [`reports/coverage-report.txt`](./reports/coverage-report.txt)

---

## ⚠️ Known Issues / Limitations

1. **Fixed owner set:** Owners are set at deployment and cannot be added or removed after. A future upgrade could implement owner management with multi-sig approval for changes.
2. **No transaction cancellation:** A submitted transaction cannot be deleted — only left with insufficient approvals. This is by design (immutable audit trail) but limits cleanup.
3. **No deadline / expiry:** Transactions have no time limit. A pending transaction can remain open indefinitely. A `deadline` field could be added to auto-expire stale proposals.
4. **ETH-only treasury:** The wallet holds ETH natively but interacts with ERC-20 tokens only via calldata. A native ERC-20 balance view is not included in the contract (readable via calldata execution).
5. **Frontend requires manual ABI update:** After redeployment, `frontend/public/abi.json` and `deployment.json` must be regenerated via the deploy script. This is handled automatically by `scripts/deploy.js`.
6. **Sepolia RPC rate limits:** The public Sepolia RPC (`https://rpc.sepolia.org`) may throttle requests under load. Use Alchemy or Infura RPC for production deployments.

---

## 📝 License

MIT
