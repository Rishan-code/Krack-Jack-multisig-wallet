// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../MultiSigWallet.sol";

/// @title ReentrancyAttacker
/// @notice Malicious contract that attempts to re-enter executeTransaction during an ETH transfer
contract ReentrancyAttacker {
    MultiSigWallet public wallet;
    uint256 public targetTxId;
    uint256 public attackCount;

    constructor(address payable _wallet) {
        wallet = MultiSigWallet(_wallet);
    }

    function setTarget(uint256 _txId) external {
        targetTxId = _txId;
    }

    /// @notice Fallback that attempts reentrancy
    receive() external payable {
        if (attackCount < 1) {
            attackCount++;
            // Attempt to re-enter executeTransaction
            try wallet.executeTransaction(targetTxId) {} catch {}
        }
    }
}
