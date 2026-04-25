// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MultiSigWallet
/// @author Krack-Jack Team
/// @notice A production-ready M-of-N multi-signature treasury wallet with dynamic owner management.
/// @dev Modeled after Gnosis Safe architecture. Governance functions (addOwner, removeOwner,
///      changeRequirement) are gated behind the `onlyWallet` modifier — they can only be called
///      by the contract itself, enforcing consensus via the standard submit → approve → execute flow.
///      Uses OpenZeppelin ReentrancyGuard on executeTransaction and custom errors for gas efficiency.
contract MultiSigWallet is ReentrancyGuard {
    // ─────────────────────────────────────────────
    //  Custom Errors (gas-optimized vs require strings)
    // ─────────────────────────────────────────────

    error NotOwner();
    error InvalidOwnerCount();
    error InvalidRequiredApprovals();
    error ZeroAddress();
    error DuplicateOwner(address owner);
    error TransactionDoesNotExist();
    error TransactionAlreadyExecuted();
    error TransactionAlreadyApproved();
    error TransactionNotApproved();
    error InsufficientApprovals();
    error TransactionFailed();

    /// @notice Thrown when a governance function is called directly instead of via multisig execution
    error OnlyWallet();

    /// @notice Thrown when submitTransaction targets the zero address
    error SubmitToZeroAddress();

    /// @notice Thrown when trying to add an address that is already an owner
    error OwnerAlreadyExists(address owner);

    /// @notice Thrown when trying to remove an address that is not an owner
    error OwnerDoesNotExist(address owner);

    /// @notice Thrown when trying to remove the last remaining owner
    error CannotRemoveLastOwner();

    /// @notice Thrown when the new requirement exceeds the owner count
    error RequirementTooHigh(uint256 required, uint256 ownerCount);

    // ─────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────

    /// @notice Emitted when ETH is deposited into the wallet via receive() or fallback()
    /// @param sender The address that sent ETH
    /// @param amount The amount of ETH deposited (in wei)
    event Deposit(address indexed sender, uint256 amount);

    /// @notice Emitted when a new transaction is submitted
    /// @param txId The unique transaction identifier
    /// @param owner The owner who submitted the transaction
    /// @param to The target address for the transaction
    /// @param value The ETH value to send (in wei)
    /// @param data The calldata to execute on the target
    event TransactionSubmitted(
        uint256 indexed txId,
        address indexed owner,
        address indexed to,
        uint256 value,
        bytes data
    );

    /// @notice Emitted when an owner approves a transaction
    /// @param txId The transaction identifier
    /// @param owner The owner who approved
    event Approved(uint256 indexed txId, address indexed owner);

    /// @notice Emitted when an owner revokes their approval
    /// @param txId The transaction identifier
    /// @param owner The owner who revoked approval
    event ApprovalRevoked(uint256 indexed txId, address indexed owner);

    /// @notice Emitted when a transaction is executed
    /// @param txId The transaction identifier
    /// @param owner The owner who triggered execution
    event Executed(uint256 indexed txId, address indexed owner);

    /// @notice Emitted when a new owner is added to the wallet
    /// @param owner The address of the newly added owner
    event OwnerAdded(address indexed owner);

    /// @notice Emitted when an owner is removed from the wallet
    /// @param owner The address of the removed owner
    event OwnerRemoved(address indexed owner);

    /// @notice Emitted when the required approval threshold is changed
    /// @param required The new number of required approvals
    event RequirementChanged(uint256 required);

    // ─────────────────────────────────────────────
    //  Structs
    // ─────────────────────────────────────────────

    /// @notice Stores all data for a submitted transaction
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        uint256 approvalCount;
        bool executed;
    }

    // ─────────────────────────────────────────────
    //  State Variables
    // ─────────────────────────────────────────────

    /// @notice Ordered list of wallet owners
    address[] public owners;

    /// @notice Fast lookup to check if an address is an owner
    mapping(address => bool) public isOwner;

    /// @notice Number of approvals required to execute a transaction (M in M-of-N)
    uint256 public requiredApprovals;

    /// @notice Array of all submitted transactions
    Transaction[] public transactions;

    /// @notice Tracks which owners have approved which transactions
    /// @dev mapping(txId => mapping(ownerAddress => hasApproved))
    mapping(uint256 => mapping(address => bool)) public approved;

    // ─────────────────────────────────────────────
    //  Modifiers
    // ─────────────────────────────────────────────

    /// @notice Restricts function access to wallet owners only
    modifier onlyOwner() {
        if (!isOwner[msg.sender]) revert NotOwner();
        _;
    }

    /// @notice Restricts function access to the wallet contract itself (Gnosis Safe pattern)
    /// @dev Governance functions gated by this modifier can only be executed through
    ///      the multisig submit → approve → execute flow, ensuring group consensus
    modifier onlyWallet() {
        if (msg.sender != address(this)) revert OnlyWallet();
        _;
    }

    /// @notice Ensures the transaction ID is valid
    /// @param _txId The transaction identifier to validate
    modifier txExists(uint256 _txId) {
        if (_txId >= transactions.length) revert TransactionDoesNotExist();
        _;
    }

    /// @notice Ensures the transaction has not been executed yet
    /// @param _txId The transaction identifier to check
    modifier notExecuted(uint256 _txId) {
        if (transactions[_txId].executed) revert TransactionAlreadyExecuted();
        _;
    }

    // ─────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────

    /// @notice Initializes the multi-sig wallet with owners and approval threshold
    /// @param _owners Array of owner addresses (no duplicates, no zero addresses)
    /// @param _requiredApprovals Number of approvals needed to execute (M of N)
    constructor(address[] memory _owners, uint256 _requiredApprovals) {
        if (_owners.length == 0) revert InvalidOwnerCount();
        if (_requiredApprovals == 0 || _requiredApprovals > _owners.length)
            revert InvalidRequiredApprovals();

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];

            if (owner == address(0)) revert ZeroAddress();
            if (isOwner[owner]) revert DuplicateOwner(owner);

            isOwner[owner] = true;
            owners.push(owner);
        }

        requiredApprovals = _requiredApprovals;
    }

    // ─────────────────────────────────────────────
    //  Receive & Fallback
    // ─────────────────────────────────────────────

    /// @notice Allows the wallet to receive ETH via plain transfers (no msg.data)
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    /// @notice Accepts ETH even when msg.data is non-empty and doesn't match any function selector
    /// @dev Ensures the contract never rejects incoming ETH regardless of attached calldata
    fallback() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    // ─────────────────────────────────────────────
    //  Governance Functions (onlyWallet)
    // ─────────────────────────────────────────────

    /// @notice Adds a new owner to the wallet
    /// @dev Can only be called by the contract itself via the multisig execution flow.
    ///      An owner must submit a transaction with encoded `addOwner(newOwner)` calldata
    ///      targeting `address(this)`, and the required approvals must be met before execution.
    /// @param _owner The address of the new owner to add
    function addOwner(address _owner) public onlyWallet {
        if (_owner == address(0)) revert ZeroAddress();
        if (isOwner[_owner]) revert OwnerAlreadyExists(_owner);

        isOwner[_owner] = true;
        owners.push(_owner);

        emit OwnerAdded(_owner);
    }

    /// @notice Removes an existing owner from the wallet
    /// @dev Uses swap-and-pop for O(1) gas-efficient removal from the owners array.
    ///      If removing the owner would make `requiredApprovals > owners.length`, the
    ///      requirement is automatically reduced to prevent the wallet from becoming locked.
    ///      Can only be called by the contract itself via the multisig execution flow.
    /// @param _owner The address of the owner to remove
    function removeOwner(address _owner) public onlyWallet {
        if (!isOwner[_owner]) revert OwnerDoesNotExist(_owner);
        if (owners.length <= 1) revert CannotRemoveLastOwner();

        isOwner[_owner] = false;

        // Swap-and-pop: find the owner, swap with last element, then pop
        uint256 len = owners.length;
        for (uint256 i = 0; i < len; i++) {
            if (owners[i] == _owner) {
                owners[i] = owners[len - 1];
                owners.pop();
                break;
            }
        }

        emit OwnerRemoved(_owner);

        // Auto-adjust requiredApprovals if it now exceeds owner count
        if (requiredApprovals > owners.length) {
            requiredApprovals = owners.length;
            emit RequirementChanged(requiredApprovals);
        }
    }

    /// @notice Changes the number of required approvals for transaction execution
    /// @dev Can only be called by the contract itself via the multisig execution flow.
    /// @param _requiredApprovals The new required approval count (must be > 0 and <= owners.length)
    function changeRequirement(uint256 _requiredApprovals) public onlyWallet {
        if (_requiredApprovals == 0) revert InvalidRequiredApprovals();
        if (_requiredApprovals > owners.length)
            revert RequirementTooHigh(_requiredApprovals, owners.length);

        requiredApprovals = _requiredApprovals;

        emit RequirementChanged(_requiredApprovals);
    }

    // ─────────────────────────────────────────────
    //  External / Public Functions
    // ─────────────────────────────────────────────

    /// @notice Submit a new transaction for approval
    /// @dev Reverts if `_to` is the zero address to prevent accidental ETH burns
    /// @param _to Target address for the transaction (must not be address(0))
    /// @param _value Amount of ETH to send (in wei)
    /// @param _data Calldata to execute on the target address
    /// @return txId The unique identifier of the submitted transaction
    function submitTransaction(
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external onlyOwner returns (uint256 txId) {
        if (_to == address(0)) revert SubmitToZeroAddress();

        txId = transactions.length;

        transactions.push(
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                approvalCount: 0,
                executed: false
            })
        );

        emit TransactionSubmitted(txId, msg.sender, _to, _value, _data);
    }

    /// @notice Approve a pending transaction
    /// @param _txId The transaction identifier to approve
    function approveTransaction(
        uint256 _txId
    ) external onlyOwner txExists(_txId) notExecuted(_txId) {
        if (approved[_txId][msg.sender]) revert TransactionAlreadyApproved();

        approved[_txId][msg.sender] = true;
        transactions[_txId].approvalCount += 1;

        emit Approved(_txId, msg.sender);
    }

    /// @notice Revoke a previously given approval
    /// @param _txId The transaction identifier to revoke approval from
    function revokeApproval(
        uint256 _txId
    ) external onlyOwner txExists(_txId) notExecuted(_txId) {
        if (!approved[_txId][msg.sender]) revert TransactionNotApproved();

        approved[_txId][msg.sender] = false;
        transactions[_txId].approvalCount -= 1;

        emit ApprovalRevoked(_txId, msg.sender);
    }

    /// @notice Execute a transaction once it has enough approvals
    /// @dev Uses CEI pattern: marks executed BEFORE external call. Protected by ReentrancyGuard.
    /// @param _txId The transaction identifier to execute
    function executeTransaction(
        uint256 _txId
    ) external onlyOwner txExists(_txId) notExecuted(_txId) nonReentrant {
        Transaction storage txn = transactions[_txId];

        if (txn.approvalCount < requiredApprovals)
            revert InsufficientApprovals();

        // Effects BEFORE Interactions (CEI pattern)
        txn.executed = true;

        // Interaction: external call
        (bool success, ) = txn.to.call{value: txn.value}(txn.data);
        if (!success) revert TransactionFailed();

        emit Executed(_txId, msg.sender);
    }

    // ─────────────────────────────────────────────
    //  View Functions
    // ─────────────────────────────────────────────

    /// @notice Get details of a specific transaction
    /// @param _txId The transaction identifier
    /// @return to Target address
    /// @return value ETH value in wei
    /// @return data Calldata bytes
    /// @return approvalCount Current number of approvals
    /// @return executed Whether the transaction has been executed
    function getTransaction(
        uint256 _txId
    )
        external
        view
        txExists(_txId)
        returns (
            address to,
            uint256 value,
            bytes memory data,
            uint256 approvalCount,
            bool executed
        )
    {
        Transaction storage txn = transactions[_txId];
        return (txn.to, txn.value, txn.data, txn.approvalCount, txn.executed);
    }

    /// @notice Get the list of addresses that have approved a transaction
    /// @param _txId The transaction identifier
    /// @return approvers Array of owner addresses that approved
    function getApprovers(
        uint256 _txId
    ) external view txExists(_txId) returns (address[] memory approvers) {
        uint256 count = 0;

        // First pass: count approvers
        for (uint256 i = 0; i < owners.length; i++) {
            if (approved[_txId][owners[i]]) {
                count++;
            }
        }

        // Second pass: populate array
        approvers = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < owners.length; i++) {
            if (approved[_txId][owners[i]]) {
                approvers[index] = owners[i];
                index++;
            }
        }
    }

    /// @notice Get the total number of submitted transactions
    /// @return count The total transaction count
    function getTransactionCount() external view returns (uint256 count) {
        return transactions.length;
    }

    /// @notice Get the list of all owners
    /// @return Array of owner addresses
    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    /// @notice Converts a normal string to a hexadecimal string (bytes) directly
    /// @dev This utility can be used to easily convert plain strings to bytes for transaction data
    /// @param _str The normal string to convert
    /// @return The bytes (hexadecimal) representation of the string
    function convertStringToBytes(string memory _str) public pure returns (bytes memory) {
        return bytes(_str);
    }
}
