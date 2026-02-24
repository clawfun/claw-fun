import { PublicKey } from "@solana/web3.js";
import {
  OPENCLAW_PROGRAM_ID,
  GLOBAL_CONFIG_SEED,
  BONDING_CURVE_SEED,
} from "./constants";

export function findGlobalConfigPDA(
  programId: PublicKey = OPENCLAW_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([GLOBAL_CONFIG_SEED], programId);
}

export function findBondingCurvePDA(
  mint: PublicKey,
  programId: PublicKey = OPENCLAW_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [BONDING_CURVE_SEED, mint.toBuffer()],
    programId
  );
}

export function findCurveTokenVaultPDA(
  mint: PublicKey,
  bondingCurve: PublicKey
): PublicKey {
  const { getAssociatedTokenAddressSync } = require("@solana/spl-token");
  return getAssociatedTokenAddressSync(mint, bondingCurve, true);
}
