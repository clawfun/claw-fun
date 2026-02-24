import { PublicKey } from "@solana/web3.js";

// Platform Configuration
export const PLATFORM_FEE_BPS = 100; // 1%
export const MIGRATION_THRESHOLD_SOL = 85; // ~$69K at $800/SOL

// Token Configuration
export const TOTAL_TOKEN_SUPPLY = BigInt(1_000_000_000) * BigInt(10 ** 6); // 1 billion with 6 decimals
export const INITIAL_VIRTUAL_SOL_RESERVES = BigInt(30) * BigInt(10 ** 9); // 30 SOL in lamports
export const INITIAL_VIRTUAL_TOKEN_RESERVES = TOTAL_TOKEN_SUPPLY;

// Solana
export const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
export const SOLANA_WS_URL = process.env.NEXT_PUBLIC_SOLANA_WS_URL || "wss://api.mainnet-beta.solana.com";

// Program IDs (update after deployment)
export const OPENCLAW_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_OPENCLAW_PROGRAM_ID || "11111111111111111111111111111111"
);

// Token Program
export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

// System
export const SYSTEM_PROGRAM_ID = new PublicKey("11111111111111111111111111111111");
export const RENT_PROGRAM_ID = new PublicKey("SysvarRent111111111111111111111111111111111");

// Vanity Mining
export const VANITY_SUFFIX = "claw";
export const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

// API
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
