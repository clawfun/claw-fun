import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number, decimals = 2): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(decimals) + "B";
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(decimals) + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(decimals) + "K";
  }
  return num.toFixed(decimals);
}

export function formatSol(lamports: bigint | number): string {
  const sol = Number(lamports) / 1_000_000_000;
  if (sol < 0.001) {
    return sol.toFixed(6);
  }
  if (sol < 1) {
    return sol.toFixed(4);
  }
  return formatNumber(sol);
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function timeAgo(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return past.toLocaleDateString();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

export function calculatePrice(
  virtualSolReserves: bigint,
  virtualTokenReserves: bigint
): number {
  if (virtualTokenReserves === BigInt(0)) return 0;
  return Number(virtualSolReserves) / Number(virtualTokenReserves);
}

export function calculateMarketCap(
  virtualSolReserves: bigint,
  virtualTokenReserves: bigint,
  totalSupply: bigint
): number {
  const price = calculatePrice(virtualSolReserves, virtualTokenReserves);
  return price * Number(totalSupply);
}
