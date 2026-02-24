"use client";

import Link from "next/link";
import { useTokens } from "@/hooks/use-tokens";
import { TokenCard } from "@/components/token-card";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Clock, Zap } from "lucide-react";

export default function HomePage() {
  const { data, isLoading } = useTokens({ pageSize: 12, sort: "createdAt", order: "desc" });

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-claw-500/10 border border-claw-500/20 text-claw-400 text-sm mb-6">
          <Sparkles className="w-4 h-4" />
          <span>The fairest token launchpad on Solana</span>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          Launch Your Token on{" "}
          <span className="gradient-text">CLAW.FUN</span>
        </h1>

        <p className="text-xl text-dark-400 max-w-2xl mx-auto mb-8">
          Create tokens with vanity addresses ending in &quot;claw&quot;.
          Fair bonding curve. Automatic liquidity migration to Raydium.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link href="/create">
            <Button size="lg" className="glow-green">
              <Zap className="w-5 h-5 mr-2" />
              Launch Token
            </Button>
          </Link>
          <Button variant="outline" size="lg">
            Learn More
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto mt-16">
          <div className="text-center">
            <div className="text-3xl font-bold text-claw-400">$0</div>
            <div className="text-dark-400 text-sm">Total Volume</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-claw-400">0</div>
            <div className="text-dark-400 text-sm">Tokens Launched</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-claw-400">0</div>
            <div className="text-dark-400 text-sm">Total Trades</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="w-12 h-12 bg-claw-500/10 rounded-lg flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-claw-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Vanity Addresses</h3>
          <p className="text-dark-400">
            Mine custom token addresses ending in &quot;claw&quot; for instant brand recognition.
          </p>
        </div>

        <div className="card p-6">
          <div className="w-12 h-12 bg-claw-500/10 rounded-lg flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6 text-claw-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Fair Bonding Curve</h3>
          <p className="text-dark-400">
            Transparent pricing with a constant product curve. No rugs, no presales.
          </p>
        </div>

        <div className="card p-6">
          <div className="w-12 h-12 bg-claw-500/10 rounded-lg flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-claw-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Auto Migration</h3>
          <p className="text-dark-400">
            Liquidity automatically migrates to Raydium at ~$69K market cap.
          </p>
        </div>
      </section>

      {/* Token List */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Latest Launches</h2>
          <Link href="/tokens" className="text-claw-400 hover:text-claw-300 text-sm">
            View all
          </Link>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="w-12 h-12 bg-dark-800 rounded-lg mb-3" />
                <div className="h-4 bg-dark-800 rounded w-3/4 mb-2" />
                <div className="h-3 bg-dark-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : data?.tokens.length === 0 ? (
          <div className="card p-12 text-center">
            <Sparkles className="w-12 h-12 text-dark-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tokens yet</h3>
            <p className="text-dark-400 mb-4">Be the first to launch a token on CLAW.FUN!</p>
            <Link href="/create">
              <Button>Launch Token</Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data?.tokens.map((token) => (
              <TokenCard key={token.id} token={token} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
