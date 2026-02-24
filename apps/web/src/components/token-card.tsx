"use client";

import Link from "next/link";
import Image from "next/image";
import { Token } from "@/hooks/use-tokens";
import { Card } from "@/components/ui/card";
import { formatSol, shortenAddress, timeAgo } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface TokenCardProps {
  token: Token;
}

export function TokenCard({ token }: TokenCardProps) {
  const marketCapSol = token.marketCapSol;
  const priceChange = 0; // TODO: Calculate from trades

  return (
    <Link href={`/token/${token.mint}`}>
      <Card className="p-4 hover:border-dark-700 transition-colors cursor-pointer group">
        <div className="flex items-start gap-3">
          {/* Token Image */}
          <div className="w-12 h-12 bg-dark-800 rounded-lg overflow-hidden flex-shrink-0">
            {token.image ? (
              <Image
                src={token.image}
                alt={token.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-dark-500 text-lg font-bold">
                {token.symbol.charAt(0)}
              </div>
            )}
          </div>

          {/* Token Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate group-hover:text-claw-400 transition-colors">
                {token.name}
              </h3>
              <span className="text-xs text-dark-400 font-mono">
                ${token.symbol}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-dark-400">
                MC: {formatSol(marketCapSol * 1e9)} SOL
              </span>
              {priceChange !== 0 && (
                <span className={`flex items-center text-xs ${priceChange > 0 ? "text-green-400" : "text-red-400"}`}>
                  {priceChange > 0 ? (
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-0.5" />
                  )}
                  {Math.abs(priceChange).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-dark-800">
          <span className="text-xs text-dark-500 font-mono">
            {shortenAddress(token.mint)}
          </span>
          <span className="text-xs text-dark-500">
            {timeAgo(token.createdAt)}
          </span>
        </div>
      </Card>
    </Link>
  );
}
