"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { useCallback } from "react";
import toast from "react-hot-toast";

export function useSolana() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const sendTransaction = useCallback(
    async (transaction: Transaction | VersionedTransaction) => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error("Wallet not connected");
      }

      try {
        const signature = await wallet.sendTransaction(transaction, connection);

        const latestBlockhash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
          signature,
          ...latestBlockhash,
        });

        return signature;
      } catch (error: any) {
        console.error("Transaction error:", error);
        throw error;
      }
    },
    [connection, wallet]
  );

  const getBalance = useCallback(
    async (pubkey?: PublicKey) => {
      const address = pubkey || wallet.publicKey;
      if (!address) return 0;
      return connection.getBalance(address);
    },
    [connection, wallet.publicKey]
  );

  return {
    connection,
    wallet,
    publicKey: wallet.publicKey,
    connected: wallet.connected,
    connecting: wallet.connecting,
    sendTransaction,
    getBalance,
  };
}
