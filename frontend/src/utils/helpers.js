import { ethers } from "ethers";

export function truncateAddress(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export function truncateData(data) {
  if (!data || data === "0x") return "(none)";
  if (data.length <= 20) return data;
  return data.slice(0, 10) + "..." + data.slice(-6);
}

export function extractErrorMsg(err) {
  if (err.reason) return err.reason;
  if (err.data && err.data.message) return err.data.message;
  if (err.message && err.message.length < 120) return err.message;
  return "Transaction reverted";
}

export function formatEthValue(wei) {
  try {
    return parseFloat(ethers.formatEther(wei)).toFixed(4);
  } catch {
    return "0.0000";
  }
}

export function getNetworkName(chainId) {
  const networks = {
    1: "Ethereum",
    5: "Goerli",
    11155111: "Sepolia",
    137: "Polygon",
    80001: "Mumbai",
    31337: "Localhost",
    1337: "Localhost",
  };
  return networks[Number(chainId)] || `Chain ${chainId}`;
}

export function generateJazzicon(address) {
  // Create a simple deterministic color from address
  if (!address) return "#6366f1";
  const hash = address.slice(2, 8);
  const h = parseInt(hash, 16) % 360;
  return `hsl(${h}, 65%, 55%)`;
}
