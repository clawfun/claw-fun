import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export interface GlobalConfig {
  authority: PublicKey;
  feeRecipient: PublicKey;
  feeBps: number;
  migrationThreshold: BN;
  initialVirtualSol: BN;
  initialVirtualTokens: BN;
  totalTokens: BN;
  totalVolume: BN;
  bump: number;
}

export interface BondingCurve {
  mint: PublicKey;
  creator: PublicKey;
  virtualSolReserves: BN;
  virtualTokenReserves: BN;
  realSolReserves: BN;
  realTokenReserves: BN;
  tokensSold: BN;
  migrated: boolean;
  createdAt: BN;
  bump: number;
}

export interface CreateTokenParams {
  name: string;
  symbol: string;
  uri: string;
}

export interface InitializeParams {
  feeBps: number;
  migrationThreshold: BN;
  initialVirtualSol: BN;
  initialVirtualTokens: BN;
}

export interface UpdateConfigParams {
  feeBps?: number;
  migrationThreshold?: BN;
  feeRecipient?: PublicKey;
}

export interface TradeResult {
  signature: string;
  tokensAmount: BN;
  solAmount: BN;
  fee: BN;
  newPrice: number;
}

export interface TokenInfo {
  mint: PublicKey;
  bondingCurve: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  creator: PublicKey;
  price: number;
  marketCap: number;
  virtualSolReserves: BN;
  virtualTokenReserves: BN;
  realSolReserves: BN;
  realTokenReserves: BN;
  migrated: boolean;
}
