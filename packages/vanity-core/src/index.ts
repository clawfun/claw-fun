import { Keypair } from "@solana/web3.js";

export interface VanityConfig {
  suffix: string;
  caseSensitive?: boolean;
}

export interface VanityResult {
  keypair: Keypair;
  address: string;
  attempts: number;
  duration: number;
}

export interface MiningProgress {
  attempts: number;
  rate: number;
  elapsedMs: number;
}

export type ProgressCallback = (progress: MiningProgress) => void;
export type FoundCallback = (result: VanityResult) => void;

export const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * Calculate the expected number of attempts to find a suffix
 */
export function calculateExpectedAttempts(suffixLength: number): number {
  return Math.pow(58, suffixLength);
}

/**
 * Check if an address matches the vanity suffix
 */
export function matchesSuffix(
  address: string,
  suffix: string,
  caseSensitive: boolean = false
): boolean {
  if (caseSensitive) {
    return address.endsWith(suffix);
  }
  return address.toLowerCase().endsWith(suffix.toLowerCase());
}

/**
 * Mine for a vanity address (synchronous, blocking)
 * Use this in a Web Worker or CLI
 */
export function mineVanityAddress(
  config: VanityConfig,
  onProgress?: ProgressCallback,
  shouldStop?: () => boolean
): VanityResult | null {
  const { suffix, caseSensitive = false } = config;
  const normalizedSuffix = caseSensitive ? suffix : suffix.toLowerCase();

  let attempts = 0;
  const startTime = Date.now();
  let lastProgressTime = startTime;
  let lastProgressAttempts = 0;

  while (true) {
    if (shouldStop?.()) {
      return null;
    }

    const keypair = Keypair.generate();
    const address = keypair.publicKey.toBase58();
    attempts++;

    // Check for match
    const checkAddress = caseSensitive ? address : address.toLowerCase();
    if (checkAddress.endsWith(normalizedSuffix)) {
      const duration = Date.now() - startTime;
      return {
        keypair,
        address,
        attempts,
        duration,
      };
    }

    // Report progress every 1000 attempts or 500ms
    const now = Date.now();
    if (attempts % 1000 === 0 || now - lastProgressTime >= 500) {
      const elapsed = now - lastProgressTime;
      const attemptsDelta = attempts - lastProgressAttempts;
      const rate = elapsed > 0 ? (attemptsDelta / elapsed) * 1000 : 0;

      onProgress?.({
        attempts,
        rate,
        elapsedMs: now - startTime,
      });

      lastProgressTime = now;
      lastProgressAttempts = attempts;
    }
  }
}

/**
 * Validate a keypair matches the expected suffix
 */
export function validateKeypair(
  keypair: Keypair,
  suffix: string,
  caseSensitive: boolean = false
): boolean {
  const address = keypair.publicKey.toBase58();
  return matchesSuffix(address, suffix, caseSensitive);
}

/**
 * Format mining statistics
 */
export function formatMiningStats(
  attempts: number,
  durationMs: number,
  suffix: string
): {
  attempts: string;
  rate: string;
  duration: string;
  efficiency: string;
} {
  const expected = calculateExpectedAttempts(suffix.length);
  const rate = durationMs > 0 ? (attempts / durationMs) * 1000 : 0;
  const efficiency = (expected / attempts) * 100;

  const formatNum = (n: number): string => {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
    return n.toFixed(0);
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return ms + "ms";
    if (ms < 60000) return (ms / 1000).toFixed(1) + "s";
    if (ms < 3600000) return (ms / 60000).toFixed(1) + "m";
    return (ms / 3600000).toFixed(1) + "h";
  };

  return {
    attempts: formatNum(attempts),
    rate: formatNum(rate) + "/s",
    duration: formatDuration(durationMs),
    efficiency: efficiency.toFixed(1) + "%",
  };
}
