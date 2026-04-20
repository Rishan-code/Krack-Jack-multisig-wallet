// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SimpleCounter
/// @notice A minimal counter contract used to test calldata execution through the MultiSigWallet
/// @dev Submit abi.encodeWithSignature("increment()") as calldata to verify multi-sig can execute arbitrary calls
contract SimpleCounter {
    /// @notice The current count value
    uint256 public count;

    /// @notice Increments the counter by 1
    function increment() external {
        count++;
    }

    /// @notice Returns the current count
    /// @return The current count value
    function getCount() external view returns (uint256) {
        return count;
    }
}
