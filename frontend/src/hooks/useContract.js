import { useState, useCallback, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import { formatEthValue } from "../utils/helpers";

export function useContract() {
  const { provider, contract, currentAccount, isOwner } = useWeb3();

  const [balance, setBalance] = useState("0.0000");
  const [owners, setOwners] = useState([]);
  const [threshold, setThreshold] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // 'submit' | 'approve-{id}' | 'revoke-{id}' | 'execute-{id}' | 'deposit'

  const contractRef = useRef(contract);
  contractRef.current = contract;

  const refreshStatusCards = useCallback(async () => {
    if (!contractRef.current || !provider) return;
    try {
      const c = contractRef.current;
      const addr = await c.getAddress();
      const [bal, ownerList, req, count] = await Promise.all([
        provider.getBalance(addr),
        c.getOwners(),
        c.requiredApprovals(),
        c.getTransactionCount(),
      ]);
      setBalance(formatEthValue(bal));
      setOwners(ownerList.map((a) => a.toLowerCase()));
      setThreshold(Number(req));
      setTxCount(Number(count));
      return { count: Number(count), threshold: Number(req) };
    } catch (err) {
      console.error("Status refresh error:", err);
      return null;
    }
  }, [provider]);

  const refreshTransactions = useCallback(
    async (countOverride, thresholdOverride) => {
      if (!contractRef.current) return;
      const c = contractRef.current;

      let count = countOverride;
      let thresh = thresholdOverride;

      if (count === undefined) {
        count = Number(await c.getTransactionCount());
      }
      if (thresh === undefined) {
        thresh = Number(await c.requiredApprovals());
      }

      if (count === 0) {
        setTransactions([]);
        return;
      }

      const txs = [];
      for (let i = count - 1; i >= 0; i--) {
        const [to, value, data, approvalCount, executed] = await c.getTransaction(i);
        const approvers = await c.getApprovers(i);
        let userApproved = false;
        if (isOwner && currentAccount) {
          userApproved = await c.approved(i, currentAccount);
        }

        txs.push({
          id: i,
          to,
          value,
          data,
          approvalCount: Number(approvalCount),
          executed,
          approvers: approvers.map((a) => a.toLowerCase()),
          userApproved,
          threshold: thresh,
        });
      }
      setTransactions(txs);
    },
    [isOwner, currentAccount]
  );

  const refreshAll = useCallback(async () => {
    if (!contractRef.current) return;
    setIsLoading(true);
    try {
      const info = await refreshStatusCards();
      if (info) {
        await refreshTransactions(info.count, info.threshold);
      }
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatusCards, refreshTransactions]);

  // Auto-refresh when contract changes
  useEffect(() => {
    if (contract) {
      refreshAll();
    }
  }, [contract, refreshAll]);

  const submitTransaction = useCallback(
    async (to, valueEth, data) => {
      if (!contract) throw new Error("Contract not connected");
      setActionLoading("submit");
      try {
        const tx = await contract.submitTransaction(
          to,
          ethers.parseEther(valueEth),
          data || "0x"
        );
        await tx.wait();
        await refreshAll();
        return tx;
      } finally {
        setActionLoading(null);
      }
    },
    [contract, refreshAll]
  );

  const approveTransaction = useCallback(
    async (txId) => {
      if (!contract) throw new Error("Contract not connected");
      setActionLoading(`approve-${txId}`);
      try {
        const tx = await contract.approveTransaction(txId);
        await tx.wait();
        await refreshAll();
        return tx;
      } finally {
        setActionLoading(null);
      }
    },
    [contract, refreshAll]
  );

  const revokeApproval = useCallback(
    async (txId) => {
      if (!contract) throw new Error("Contract not connected");
      setActionLoading(`revoke-${txId}`);
      try {
        const tx = await contract.revokeApproval(txId);
        await tx.wait();
        await refreshAll();
        return tx;
      } finally {
        setActionLoading(null);
      }
    },
    [contract, refreshAll]
  );

  const executeTransaction = useCallback(
    async (txId) => {
      if (!contract) throw new Error("Contract not connected");
      setActionLoading(`execute-${txId}`);
      try {
        const tx = await contract.executeTransaction(txId);
        await tx.wait();
        await refreshAll();
        return tx;
      } finally {
        setActionLoading(null);
      }
    },
    [contract, refreshAll]
  );

  const depositToVault = useCallback(
    async (amountEth) => {
      if (!contract) throw new Error("Contract not connected");
      const { signer } = await import("../context/Web3Context").then(() => {
        // We need the signer from the provider, not context import
        return { signer: null };
      });
      setActionLoading("deposit");
      try {
        const addr = await contract.getAddress();
        const provider_ = contract.runner?.provider || contract.provider;
        const signer_ = contract.runner;
        const tx = await signer_.sendTransaction({
          to: addr,
          value: ethers.parseEther(amountEth),
        });
        await tx.wait();
        await refreshAll();
        return tx;
      } finally {
        setActionLoading(null);
      }
    },
    [contract, refreshAll]
  );

  return {
    balance,
    owners,
    threshold,
    txCount,
    transactions,
    isLoading,
    actionLoading,
    refreshAll,
    submitTransaction,
    approveTransaction,
    revokeApproval,
    executeTransaction,
    depositToVault,
  };
}
