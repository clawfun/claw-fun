import { PublicKey } from "@solana/web3.js";

// Program ID (update after deployment)
export const OPENCLAW_PROGRAM_ID = new PublicKey(
  process.env.OPENCLAW_PROGRAM_ID || "CLAWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
);

// Seeds
export const GLOBAL_CONFIG_SEED = Buffer.from("global_config");
export const BONDING_CURVE_SEED = Buffer.from("bonding_curve");
export const CURVE_SOL_VAULT_SEED = Buffer.from("curve_sol_vault");
export const CURVE_TOKEN_VAULT_SEED = Buffer.from("curve_token_vault");

// Default configuration
export const DEFAULT_FEE_BPS = 100; // 1%
export const DEFAULT_MIGRATION_THRESHOLD = BigInt(85_000_000_000); // 85 SOL
export const DEFAULT_INITIAL_VIRTUAL_SOL = BigInt(30_000_000_000); // 30 SOL
export const DEFAULT_INITIAL_VIRTUAL_TOKENS = BigInt(1_000_000_000_000_000); // 1B with 6 decimals

// Token settings
export const TOKEN_DECIMALS = 6;
export const LAMPORTS_PER_SOL = 1_000_000_000;
