"use client";

import { Trade } from "@/hooks/use-tokens";
import { formatSol, shortenAddress, timeAgo, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, ExternalLink } from "lucide-react";

interface TradeHistoryProps {
  trades: Trade[];
}

export function TradeHistory({ trades }: TradeHistoryProps) {
  if (trades.length === 0) {
    return (
      <div className="text-center py-8 text-dark-400">
        <p>No trades yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-dark-400 border-b border-dark-800">
            <th className="pb-3 font-medium">Type</th>
            <th className="pb-3 font-medium">SOL</th>
            <th className="pb-3 font-medium">Tokens</th>
            <th className="pb-3 font-medium">Price</th>
            <th className="pb-3 font-medium">Trader</th>
            <th className="pb-3 font-medium">Time</th>
            <th className="pb-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr
              key={trade.id}
              className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors"
            >
              <td className="py-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium",
                    trade.type === "BUY"
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  )}
                >
                  {trade.type === "BUY" ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {trade.type}
                </span>
              </td>
              <td className="py-3 font-mono text-sm">
                {formatSol(trade.solAmount)} SOL
              </td>
              <td className="py-3 font-mono text-sm">
                {formatNumber(Number(trade.tokenAmount) / 1e6)}
              </td>
              <td className="py-3 font-mono text-sm">
                {trade.price.toFixed(8)}
              </td>
              <td className="py-3">
                <a
                  href={`https://solscan.io/account/${trade.trader}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-dark-400 hover:text-claw-400 transition-colors"
                >
                  {shortenAddress(trade.trader)}
                </a>
              </td>
              <td className="py-3 text-sm text-dark-400">
                {timeAgo(trade.timestamp)}
              </td>
              <td className="py-3">
                <a
                  href={`https://solscan.io/tx/${trade.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-dark-400 hover:text-white transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
