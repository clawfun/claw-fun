"use client";

import { useParams } from "next/navigation";
import { useToken, useTrades } from "@/hooks/use-tokens";
import { TradingPanel } from "@/components/trading-panel";
import { PriceChart } from "@/components/price-chart";
import { TradeHistory } from "@/components/trade-history";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatSol, shortenAddress, timeAgo, formatNumber } from "@/lib/utils";
import {
  ExternalLink,
  Copy,
  Twitter,
  Send,
  Globe,
  TrendingUp,
  Users,
  BarChart3,
} from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";

export default function TokenDetailPage() {
  const params = useParams();
  const mint = params.mint as string;

  const { data: token, isLoading } = useToken(mint);
  const { data: trades } = useTrades(mint);

  const copyAddress = () => {
    navigator.clipboard.writeText(mint);
    toast.success("Address copied!");
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-32 bg-dark-800 rounded-xl" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-dark-800 rounded-xl" />
          <div className="h-96 bg-dark-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Token Not Found</h1>
        <p className="text-dark-400">
          The token with address {shortenAddress(mint)} does not exist.
        </p>
      </div>
    );
  }

  const price = token.marketCapSol / 1_000_000_000; // Simplified price calculation
  const holders = 0; // TODO: Fetch from API

  return (
    <div className="space-y-6">
      {/* Token Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Token Info */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-dark-800 rounded-xl overflow-hidden flex-shrink-0">
                {token.image ? (
                  <Image
                    src={token.image}
                    alt={token.name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-dark-500">
                    {token.symbol.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{token.name}</h1>
                <p className="text-dark-400">${token.symbol}</p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs font-mono text-dark-400">
                    {shortenAddress(token.mint)}
                  </code>
                  <button
                    onClick={copyAddress}
                    className="text-dark-400 hover:text-white"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <a
                    href={`https://solscan.io/token/${token.mint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-dark-400 hover:text-white"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-dark-800 rounded-lg">
                <p className="text-xs text-dark-400 mb-1">Price</p>
                <p className="font-bold text-claw-400">
                  {formatSol(price * 1e9)} SOL
                </p>
              </div>
              <div className="text-center p-3 bg-dark-800 rounded-lg">
                <p className="text-xs text-dark-400 mb-1">Market Cap</p>
                <p className="font-bold">
                  {formatNumber(token.marketCapSol)} SOL
                </p>
              </div>
              <div className="text-center p-3 bg-dark-800 rounded-lg">
                <p className="text-xs text-dark-400 mb-1">Holders</p>
                <p className="font-bold">{formatNumber(holders)}</p>
              </div>
              <div className="text-center p-3 bg-dark-800 rounded-lg">
                <p className="text-xs text-dark-400 mb-1">Trades</p>
                <p className="font-bold">{formatNumber(trades?.length || 0)}</p>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-2">
              {token.twitter && (
                <a
                  href={`https://twitter.com/${token.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="icon">
                    <Twitter className="w-4 h-4" />
                  </Button>
                </a>
              )}
              {token.telegram && (
                <a
                  href={token.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="icon">
                    <Send className="w-4 h-4" />
                  </Button>
                </a>
              )}
              {token.website && (
                <a
                  href={token.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="icon">
                    <Globe className="w-4 h-4" />
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* Description */}
          {token.description && (
            <p className="mt-4 text-dark-300 text-sm">{token.description}</p>
          )}

          {/* Migration Progress */}
          {!token.migrated && (
            <div className="mt-4 p-4 bg-dark-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-dark-400">
                  Migration Progress
                </span>
                <span className="text-sm font-mono">
                  {formatNumber(Number(token.realSolReserves) / 1e9)} / 85 SOL
                </span>
              </div>
              <div className="h-2 bg-dark-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-claw-500 transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      (Number(token.realSolReserves) / 85e9) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs text-dark-500 mt-2">
                Token will migrate to Raydium at 85 SOL (~$69K)
              </p>
            </div>
          )}

          {token.migrated && (
            <div className="mt-4 p-4 bg-claw-500/10 border border-claw-500/20 rounded-lg">
              <p className="text-claw-400 font-medium">
                This token has migrated to Raydium
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Price Chart
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PriceChart mint={mint} />
            </CardContent>
          </Card>
        </div>

        {/* Trading Panel */}
        <div>
          <TradingPanel token={token} />
        </div>
      </div>

      {/* Trade History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Recent Trades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TradeHistory trades={trades || []} />
        </CardContent>
      </Card>
    </div>
  );
}
