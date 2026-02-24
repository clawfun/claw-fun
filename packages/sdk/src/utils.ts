import BN from "bn.js";
import { LAMPORTS_PER_SOL, TOKEN_DECIMALS } from "./constants";

/**
 * Calculate the current token price based on reserves
 */
export function calculatePrice(
  virtualSolReserves: BN,
  virtualTokenReserves: BN
): number {
  if (virtualTokenReserves.isZero()) return 0;

  // Price in SOL per token
  const price =
    virtualSolReserves.toNumber() /
    LAMPORTS_PER_SOL /
    (virtualTokenReserves.toNumber() / Math.pow(10, TOKEN_DECIMALS));

  return price;
}

/**
 * Calculate market cap in SOL
 */
export function calculateMarketCap(
  virtualSolReserves: BN,
  virtualTokenReserves: BN,
  totalSupply: BN
): number {
  const price = calculatePrice(virtualSolReserves, virtualTokenReserves);
  const supply = totalSupply.toNumber() / Math.pow(10, TOKEN_DECIMALS);
  return price * supply;
}

/**
 * Calculate tokens out for a given SOL input
 */
export function calculateTokensOut(
  solAmount: BN,
  virtualSolReserves: BN,
  virtualTokenReserves: BN,
  feeBps: number
): { tokensOut: BN; fee: BN } {
  // Calculate fee
  const fee = solAmount.muln(feeBps).divn(10000);
  const solAfterFee = solAmount.sub(fee);

  // Constant product: k = x * y
  const k = virtualSolReserves.mul(virtualTokenReserves);
  const newSol = virtualSolReserves.add(solAfterFee);
  const newTokens = k.div(newSol);
  const tokensOut = virtualTokenReserves.sub(newTokens);

  return { tokensOut, fee };
}

/**
 * Calculate SOL out for a given token input
 */
export function calculateSolOut(
  tokenAmount: BN,
  virtualSolReserves: BN,
  virtualTokenReserves: BN,
  feeBps: number
): { solOut: BN; fee: BN } {
  // Constant product: k = x * y
  const k = virtualSolReserves.mul(virtualTokenReserves);
  const newTokens = virtualTokenReserves.add(tokenAmount);
  const newSol = k.div(newTokens);
  const solOutGross = virtualSolReserves.sub(newSol);

  // Calculate fee
  const fee = solOutGross.muln(feeBps).divn(10000);
  const solOut = solOutGross.sub(fee);

  return { solOut, fee };
}

/**
 * Format lamports to SOL string
 */
export function formatSol(lamports: BN | number): string {
  const value =
    typeof lamports === "number" ? lamports : lamports.toNumber();
  const sol = value / LAMPORTS_PER_SOL;

  if (sol < 0.001) return sol.toFixed(6);
  if (sol < 1) return sol.toFixed(4);
  if (sol >= 1_000_000) return (sol / 1_000_000).toFixed(2) + "M";
  if (sol >= 1_000) return (sol / 1_000).toFixed(2) + "K";
  return sol.toFixed(2);
}

/**
 * Format token amount with decimals
 */
export function formatTokens(
  amount: BN | number,
  decimals: number = TOKEN_DECIMALS
): string {
  const value = typeof amount === "number" ? amount : amount.toNumber();
  const tokens = value / Math.pow(10, decimals);

  if (tokens >= 1_000_000_000) return (tokens / 1_000_000_000).toFixed(2) + "B";
  if (tokens >= 1_000_000) return (tokens / 1_000_000).toFixed(2) + "M";
  if (tokens >= 1_000) return (tokens / 1_000).toFixed(2) + "K";
  return tokens.toFixed(2);
}

/**
 * Calculate price impact percentage
 */
export function calculatePriceImpact(
  solAmount: BN,
  virtualSolReserves: BN,
  virtualTokenReserves: BN,
  feeBps: number
): number {
  const priceBefore = calculatePrice(virtualSolReserves, virtualTokenReserves);

  const { tokensOut, fee } = calculateTokensOut(
    solAmount,
    virtualSolReserves,
    virtualTokenReserves,
    feeBps
  );

  const newSolReserves = virtualSolReserves.add(solAmount.sub(fee));
  const newTokenReserves = virtualTokenReserves.sub(tokensOut);
  const priceAfter = calculatePrice(newSolReserves, newTokenReserves);

  return ((priceAfter - priceBefore) / priceBefore) * 100;
}
