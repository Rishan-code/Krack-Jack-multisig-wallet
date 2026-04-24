// ═══════════════════════════════════════════════════════
//  Contract ABI & Config
// ═══════════════════════════════════════════════════════

export const CONTRACT_ABI = [
  "constructor(address[] _owners, uint256 _requiredApprovals)",
  "event Deposit(address indexed sender, uint256 amount)",
  "event TransactionSubmitted(uint256 indexed txId, address indexed owner, address indexed to, uint256 value, bytes data)",
  "event Approved(uint256 indexed txId, address indexed owner)",
  "event ApprovalRevoked(uint256 indexed txId, address indexed owner)",
  "event Executed(uint256 indexed txId, address indexed owner)",
  "event OwnerAdded(address indexed owner)",
  "event OwnerRemoved(address indexed owner)",
  "event RequirementChanged(uint256 required)",
  "function owners(uint256) view returns (address)",
  "function isOwner(address) view returns (bool)",
  "function requiredApprovals() view returns (uint256)",
  "function transactions(uint256) view returns (address to, uint256 value, bytes data, uint256 approvalCount, bool executed)",
  "function approved(uint256, address) view returns (bool)",
  "function submitTransaction(address _to, uint256 _value, bytes _data) returns (uint256 txId)",
  "function approveTransaction(uint256 _txId)",
  "function revokeApproval(uint256 _txId)",
  "function executeTransaction(uint256 _txId)",
  "function addOwner(address _owner)",
  "function removeOwner(address _owner)",
  "function changeRequirement(uint256 _requiredApprovals)",
  "function getTransaction(uint256 _txId) view returns (address to, uint256 value, bytes data, uint256 approvalCount, bool executed)",
  "function getApprovers(uint256 _txId) view returns (address[])",
  "function getTransactionCount() view returns (uint256)",
  "function getOwners() view returns (address[])",
  "receive() payable",
  "fallback() payable",
];

export const DEFAULT_CONFIG = {
  contractAddress: "",
  chainId: 31337,
};

export async function loadDeploymentInfo() {
  try {
    const res = await fetch("/deployment.json");
    if (res.ok) {
      const info = await res.json();
      return {
        contractAddress: info.MultiSigWallet,
        owners: info.owners,
        requiredApprovals: info.requiredApprovals,
        network: info.network,
      };
    }
  } catch (e) {
    console.log("No deployment.json found");
  }
  return null;
}
