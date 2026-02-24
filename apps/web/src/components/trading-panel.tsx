"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Token } from "@/hooks/use-tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatSol, formatNumber, cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface TradingPanelProps {
  token: Token;
}

type TradeMode = "buy" | "sell";

export function TradingPanel({ token }: TradingPanelProps) {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();

  const [mode, setMode] = useState<TradeMode>("buy");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Calculate estimated output
  const inputAmount = parseFloat(amount) || 0;
  const virtualSol = Number(token.virtualSolReserves);
  const virtualTokens = Number(token.virtualTokenReserves);

  let estimatedOutput = 0;
  let priceImpact = 0;
  const feeBps = 100; // 1%

  if (mode === "buy" && inputAmount > 0) {
    // Calculate tokens out
    const fee = (inputAmount * feeBps) / 10000;
    const solAfterFee = inputAmount - fee;
    const k = virtualSol * virtualTokens;
    const newSol = virtualSol + solAfterFee * 1e9;
    const newTokens = k / newSol;
    estimatedOutput = (virtualTokens - newTokens) / 1e6;

    // Price impact
    const priceBefore = virtualSol / virtualTokens;
    const priceAfter = newSol / newTokens;
    priceImpact = ((priceAfter - priceBefore) / priceBefore) * 100;
  } else if (mode === "sell" && inputAmount > 0) {
    // Calculate SOL out
    const tokenAmount = inputAmount * 1e6;
    const k = virtualSol * virtualTokens;
    const newTokens = virtualTokens + tokenAmount;
    const newSol = k / newTokens;
    const solOutGross = (virtualSol - newSol) / 1e9;
    const fee = (solOutGross * feeBps) / 10000;
    estimatedOutput = solOutGross - fee;

    // Price impact
    const priceBefore = virtualSol / virtualTokens;
    const priceAfter = newSol / newTokens;
    priceImpact = ((priceBefore - priceAfter) / priceBefore) * 100;
  }

  const handleTrade = async () => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!inputAmount || inputAmount <= 0) {
      toast.error("Please enter an amount");
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement actual trade transaction
      toast.success(
        `${mode === "buy" ? "Bought" : "Sold"} tokens successfully!`
      );
      setAmount("");
    } catch (error: any) {
      toast.error(error.message || "Transaction failed");
    } finally {
      setIsLoading(false);
    }
  };

  const quickAmounts = mode === "buy" ? [0.1, 0.5, 1, 5] : [25, 50, 75, 100];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex gap-2">
          <button
            className={cn(
              "flex-1 py-2 rounded-lg font-medium transition-colors",
              mode === "buy"
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-dark-800 text-dark-400 hover:text-white"
            )}
            onClick={() => setMode("buy")}
          >
            Buy
          </button>
          <button
            className={cn(
              "flex-1 py-2 rounded-lg font-medium transition-colors",
              mode === "sell"
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "bg-dark-800 text-dark-400 hover:text-white"
            )}
            onClick={() => setMode("sell")}
          >
            Sell
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-dark-400">
              {mode === "buy" ? "You pay" : "You sell"}
            </label>
            <span className="text-xs text-dark-500">
              Balance: {mode === "buy" ? "-- SOL" : `-- ${token.symbol}`}
            </span>
          </div>
          <div className="relative">
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pr-16"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400">
              {mode === "buy" ? "SOL" : token.symbol}
            </span>
          </div>
        </div>

        {/* Quick Amounts */}
        <div className="flex gap-2">
          {quickAmounts.map((qa) => (
            <button
              key={qa}
              className="flex-1 py-1.5 text-xs bg-dark-800 hover:bg-dark-700 rounded-lg transition-colors"
              onClick={() =>
                setAmount(mode === "buy" ? qa.toString() : qa.toString())
              }
            >
              {mode === "buy" ? `${qa} SOL` : `${qa}%`}
            </button>
          ))}
        </div>

        {/* Output Estimate */}
        {inputAmount > 0 && (
          <div className="p-3 bg-dark-800 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">You receive (est.)</span>
              <span className="font-mono">
                {formatNumber(estimatedOutput)}{" "}
                {mode === "buy" ? token.symbol : "SOL"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">Price impact</span>
              <span
                className={cn(
                  "font-mono",
                  priceImpact > 5
                    ? "text-red-400"
                    : priceImpact > 2
                    ? "text-yellow-400"
                    : "text-green-400"
                )}
              >
                {priceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">Fee (1%)</span>
              <span className="font-mono text-dark-300">
                {mode === "buy"
                  ? formatSol((inputAmount * 0.01 * 1e9).toString())
                  : formatNumber(inputAmount * 0.01)}{" "}
                {mode === "buy" ? "SOL" : token.symbol}
              </span>
            </div>
          </div>
        )}

        {/* Trade Button */}
        <Button
          className={cn(
            "w-full",
            mode === "buy"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-red-600 hover:bg-red-700"
          )}
          disabled={!connected || isLoading || !inputAmount}
          loading={isLoading}
          onClick={handleTrade}
        >
          {!connected
            ? "Connect Wallet"
            : mode === "buy"
            ? `Buy ${token.symbol}`
            : `Sell ${token.symbol}`}
        </Button>

        {priceImpact > 10 && (
          <p className="text-xs text-red-400 text-center">
            Warning: High price impact! Consider a smaller trade.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
