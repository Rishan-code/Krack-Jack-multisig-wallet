# ⛽ Gas Report — Multi-Signature Wallet

## Gas Report Output

Generated via `REPORT_GAS=true npx hardhat test`

### Method Costs

| Contract / Method | Min Gas | Max Gas | Avg Gas | # Calls |
|---|---|---|---|---|
| **MultiSigWallet** | | | | |
| `approveTransaction` | 57,456 | 74,568 | 67,357 | 38 |
| `executeTransaction` | 71,261 | 102,201 | 77,603 | 15 |
| `revokeApproval` | 32,277 | 35,546 | 33,094 | 4 |
| `submitTransaction` | 64,502 | 121,920 | 98,611 | 30 |

### Deployment Costs

| Contract | Gas | % of Block Limit |
|---|---|---|
| MultiSigWallet | 1,287,492 | 2.1% |
| ReentrancyAttacker | 180,912 | 0.3% |
| SimpleCounter | 100,489 | 0.2% |

**Compiler Settings:** Solidity 0.8.24 | Optimizer: ON | Runs: 200

---

## Before / After Optimization Analysis

### Optimization Applied: Custom Errors vs. Require Strings

The **most expensive function** is `submitTransaction` (avg 98,611 gas) since it writes a new `Transaction` struct to storage. However, the most impactful optimization applies **across all functions** — using **custom errors** instead of `require()` with string messages.

#### Why Custom Errors Save Gas

- `require(condition, "long error string")` stores the error string in the contract bytecode as ABI-encoded data
- Each byte of a revert string costs **gas to store on-chain** during deployment and **gas to return** on revert
- Custom errors like `error NotOwner()` use only a **4-byte selector** — same as a function selector

#### Before (Require Strings — for comparison)

```solidity
// Example: What the code would look like WITHOUT custom errors
modifier onlyOwner() {
    require(isOwner[msg.sender], "MultiSigWallet: caller is not an owner");
    _;
}

function approveTransaction(uint256 _txId) external onlyOwner txExists(_txId) notExecuted(_txId) {
    require(!approved[_txId][msg.sender], "MultiSigWallet: transaction already approved by this owner");
    // ...
}

function executeTransaction(uint256 _txId) external onlyOwner txExists(_txId) notExecuted(_txId) nonReentrant {
    require(transactions[_txId].approvalCount >= requiredApprovals, "MultiSigWallet: insufficient approvals");
    // ...
    require(success, "MultiSigWallet: transaction execution failed");
}
```

**Estimated gas overhead with require strings:**
- Each require string ~40-50 bytes → ~200-300 extra gas per revert path
- 10 require statements → ~2,000-3,000 extra gas in deployment
- Runtime: ~200 gas saved per revert (no ABI encoding of string)

#### After (Custom Errors — current implementation)

```solidity
// Current implementation uses custom errors
error NotOwner();
error TransactionAlreadyApproved();
error InsufficientApprovals();
error TransactionFailed();

modifier onlyOwner() {
    if (!isOwner[msg.sender]) revert NotOwner();
    _;
}
```

#### Gas Comparison Summary

| Metric | Before (require strings) | After (custom errors) | Savings |
|---|---|---|---|
| Deployment gas (est.) | ~1,290,000 | 1,287,492 | ~2,500 gas |
| `approveTransaction` revert | ~24,500 | ~24,200 | ~300 gas |
| `executeTransaction` revert | ~24,800 | ~24,400 | ~400 gas |
| Bytecode size | ~5.2 KB | ~5.0 KB | ~200 bytes |

> **Note:** The savings per revert are modest (~200-400 gas) but compound across all functions. The **deployment gas savings** from reduced bytecode are more significant. Custom errors also provide **better tooling support** — they can be easily parsed by ethers.js and other libraries.

### Additional Optimizations in the Contract

| Optimization | Description | Impact |
|---|---|---|
| `uint256` for all state | Avoids EVM padding operations that smaller types require | Saves ~3 gas per SLOAD |
| Storage pointer caching | `Transaction storage txn = transactions[_txId]` | Saves ~100 gas per avoided SLOAD |
| `external` over `public` | Calldata is cheaper than memory for function params | Saves ~60 gas per call |
| View functions marked `view` | No gas cost when called externally (off-chain) | Free reads |
| Optimizer at 200 runs | Balances deployment vs. runtime cost | ~5-10% runtime savings |

---

## Coverage Report

```
File                     |  % Stmts | % Branch |  % Funcs |  % Lines |
-------------------------|----------|----------|----------|----------|
 MultiSigWallet.sol      |      100 |    90.74 |      100 |      100 |
 SimpleCounter.sol       |      100 |      100 |      100 |      100 |
 ReentrancyAttacker.sol  |      100 |       50 |      100 |      100 |
-------------------------|----------|----------|----------|----------|
 All files               |      100 |    89.29 |      100 |      100 |
```

✅ **100% line coverage** — exceeds the 70% requirement.
