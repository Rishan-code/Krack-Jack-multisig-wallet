import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { CONTRACT_ABI, loadDeploymentInfo, DEFAULT_CONFIG } from "../utils/constants";
import { getNetworkName } from "../utils/helpers";

const Web3Context = createContext(null);

export function useWeb3() {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error("useWeb3 must be used within Web3Provider");
  return ctx;
}

export function Web3Provider({ children }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [networkName, setNetworkName] = useState("");
  const [chainId, setChainId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [contractAddress, setContractAddress] = useState("");
  const [contractError, setContractError] = useState(null);
  const [deploymentNetwork, setDeploymentNetwork] = useState(null);

  // Load deployment info on mount
  useEffect(() => {
    loadDeploymentInfo().then((info) => {
      if (info) {
        setContractAddress(info.contractAddress);
        setDeploymentNetwork(info.network || null);
      }
    });
  }, []);

  // Initialize contract once we have provider + signer + address
  const initContract = useCallback(
    async (signerInstance, account, address, currentChainId) => {
      setContractError(null);
      try {
        // Check if there is contract code at the address
        const providerInstance = signerInstance.provider;
        const code = await providerInstance.getCode(address);
        if (code === "0x" || code === "0x0") {
          const msg = `No contract found at ${address.slice(0, 10)}... on this network. ` +
            `The contract may be deployed on a different network.`;
          setContractError(msg);
          console.error(msg);
          setContract(null);
          setIsOwner(false);
          return null;
        }

        const c = new ethers.Contract(address, CONTRACT_ABI, signerInstance);
        const ownerStatus = await c.isOwner(account);
        setContract(c);
        setIsOwner(ownerStatus);
        setContractError(null);
        return c;
      } catch (err) {
        console.error("Contract init error:", err);
        const msg = `Failed to connect to contract: ${err.message?.slice(0, 100)}`;
        setContractError(msg);
        setContract(null);
        setIsOwner(false);
        return null;
      }
    },
    []
  );

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error("MetaMask not detected. Please install MetaMask.");
    }

    setIsConnecting(true);
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      const signerInstance = await browserProvider.getSigner();
      const network = await browserProvider.getNetwork();
      const account = accounts[0].toLowerCase();
      const currentChainId = Number(network.chainId);

      setProvider(browserProvider);
      setSigner(signerInstance);
      setCurrentAccount(account);
      setChainId(currentChainId);
      setNetworkName(getNetworkName(network.chainId));
      setIsConnected(true);

      // Try to connect to contract
      let addr = contractAddress;
      if (!addr) {
        const info = await loadDeploymentInfo();
        if (info) {
          addr = info.contractAddress;
          setContractAddress(addr);
          setDeploymentNetwork(info.network || null);
        }
      }

      if (addr) {
        await initContract(signerInstance, account, addr, currentChainId);
      }

      return account;
    } catch (err) {
      console.error("Connection error:", err);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [contractAddress, initContract]);

  // Listen for account/chain changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        setIsConnected(false);
        setCurrentAccount(null);
        setSigner(null);
        setContract(null);
        setIsOwner(false);
        setContractError(null);
      } else {
        const account = accounts[0].toLowerCase();
        setCurrentAccount(account);
        if (provider) {
          const signerInstance = await provider.getSigner();
          setSigner(signerInstance);
          if (contractAddress) {
            await initContract(signerInstance, account, contractAddress, chainId);
          }
        }
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [provider, contractAddress, chainId, initContract]);

  // Auto-connect on load if already authorized
  useEffect(() => {
    if (window.ethereum && window.ethereum.selectedAddress) {
      connectWallet().catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    provider,
    signer,
    contract,
    currentAccount,
    isOwner,
    networkName,
    chainId,
    isConnected,
    isConnecting,
    contractAddress,
    contractError,
    deploymentNetwork,
    connectWallet,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}
