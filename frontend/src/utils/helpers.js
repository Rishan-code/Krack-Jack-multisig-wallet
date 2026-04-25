import { ethers } from "ethers";
import { CONTRACT_ABI } from "./constants";

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
  // 1. Try to extract the raw hex data payload from the MetaMask error
  let errorData = err.data;
  if (!errorData && err.info && err.info.error && err.info.error.data) {
    errorData = err.info.error.data;
  }
  if (!errorData && err.error && err.error.data) {
    errorData = err.error.data;
  }

  // 2. If we found hex data (the "random string"), try to decode it with our ABI
  if (errorData && typeof errorData === "string" && errorData.startsWith("0x")) {
    try {
      const iface = new ethers.Interface(CONTRACT_ABI);
      const parsedError = iface.parseError(errorData);
      if (parsedError) {
        // This will return the exact name of your custom error, e.g., "NotOwner" or "TransactionAlreadyExecuted"
        let msg = parsedError.name;
        // If the error has arguments (like RequirementTooHigh(uint256, uint256)), we can format it:
        if (parsedError.args && parsedError.args.length > 0) {
           msg += ` (${parsedError.args.join(", ")})`;
        }
        return msg;
      }
    } catch (e) {
      console.warn("Could not parse custom error data:", errorData);
    }
  }

  // 3. Fallbacks for standard errors
  if (err.reason) return err.reason;
  if (err.shortMessage) return err.shortMessage; // Ethers v6 standard short message
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
