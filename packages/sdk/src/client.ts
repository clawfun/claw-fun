import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import BN from "bn.js";
import {
  OPENCLAW_PROGRAM_ID,
  DEFAULT_FEE_BPS,
  DEFAULT_MIGRATION_THRESHOLD,
  DEFAULT_INITIAL_VIRTUAL_SOL,
  DEFAULT_INITIAL_VIRTUAL_TOKENS,
} from "./constants";
import { findGlobalConfigPDA, findBondingCurvePDA } from "./pda";
import {
  BondingCurve,
  GlobalConfig,
  CreateTokenParams,
  InitializeParams,
  TradeResult,
} from "./types";
import { calculateTokensOut, calculateSolOut } from "./utils";

export class OpenClawClient {
  public connection: Connection;
  public programId: PublicKey;

  constructor(connection: Connection, programId?: PublicKey) {
    this.connection = connection;
    this.programId = programId || OPENCLAW_PROGRAM_ID;
  }

  // === Account Fetching ===

  async getGlobalConfig(): Promise<GlobalConfig | null> {
    const [configPDA] = findGlobalConfigPDA(this.programId);
    const accountInfo = await this.connection.getAccountInfo(configPDA);

    if (!accountInfo) return null;

    // Parse account data (simplified - in production use Anchor's IDL)
    const data = accountInfo.data;
    return this.parseGlobalConfig(data);
  }

  async getBondingCurve(mint: PublicKey): Promise<BondingCurve | null> {
    const [curvePDA] = findBondingCurvePDA(mint, this.programId);
    const accountInfo = await this.connection.getAccountInfo(curvePDA);

    if (!accountInfo) return null;

    return this.parseBondingCurve(accountInfo.data);
  }

  // === Instructions ===

  createInitializeInstruction(
    authority: PublicKey,
    feeRecipient: PublicKey,
    params?: Partial<InitializeParams>
  ): TransactionInstruction {
    const [configPDA] = findGlobalConfigPDA(this.programId);

    const feeBps = params?.feeBps ?? DEFAULT_FEE_BPS;
    const migrationThreshold =
      params?.migrationThreshold ?? new BN(DEFAULT_MIGRATION_THRESHOLD.toString());
    const initialVirtualSol =
      params?.initialVirtualSol ?? new BN(DEFAULT_INITIAL_VIRTUAL_SOL.toString());
    const initialVirtualTokens =
      params?.initialVirtualTokens ?? new BN(DEFAULT_INITIAL_VIRTUAL_TOKENS.toString());

    // Instruction data layout:
    // 0: instruction discriminator (8 bytes)
    // 8: fee_bps (2 bytes)
    // 10: migration_threshold (8 bytes)
    // 18: initial_virtual_sol (8 bytes)
    // 26: initial_virtual_tokens (8 bytes)

    const data = Buffer.alloc(34);
    // Discriminator for "initialize" (first 8 bytes of sha256("global:initialize"))
    data.write("7afaf34e42a03d97", 0, "hex");
    data.writeUInt16LE(feeBps, 8);
    data.writeBigUInt64LE(BigInt(migrationThreshold.toString()), 10);
    data.writeBigUInt64LE(BigInt(initialVirtualSol.toString()), 18);
    data.writeBigUInt64LE(BigInt(initialVirtualTokens.toString()), 26);

    return new TransactionInstruction({
      keys: [
        { pubkey: authority, isSigner: true, isWritable: true },
        { pubkey: configPDA, isSigner: false, isWritable: true },
        { pubkey: feeRecipient, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  createTokenInstruction(
    creator: PublicKey,
    mint: Keypair,
    params: CreateTokenParams
  ): TransactionInstruction[] {
    const [configPDA] = findGlobalConfigPDA(this.programId);
    const [curvePDA] = findBondingCurvePDA(mint.publicKey, this.programId);
    const curveTokenVault = getAssociatedTokenAddressSync(
      mint.publicKey,
      curvePDA,
      true
    );

    const instructions: TransactionInstruction[] = [];

    // Instruction data (simplified)
    const nameBuffer = Buffer.from(params.name);
    const symbolBuffer = Buffer.from(params.symbol);
    const uriBuffer = Buffer.from(params.uri);

    const data = Buffer.alloc(
      8 + 4 + nameBuffer.length + 4 + symbolBuffer.length + 4 + uriBuffer.length
    );
    let offset = 0;

    // Discriminator
    data.write("181ec828051c0777", offset, "hex");
    offset += 8;

    // Name (length-prefixed string)
    data.writeUInt32LE(nameBuffer.length, offset);
    offset += 4;
    nameBuffer.copy(data, offset);
    offset += nameBuffer.length;

    // Symbol
    data.writeUInt32LE(symbolBuffer.length, offset);
    offset += 4;
    symbolBuffer.copy(data, offset);
    offset += symbolBuffer.length;

    // URI
    data.writeUInt32LE(uriBuffer.length, offset);
    offset += 4;
    uriBuffer.copy(data, offset);

    instructions.push(
      new TransactionInstruction({
        keys: [
          { pubkey: creator, isSigner: true, isWritable: true },
          { pubkey: configPDA, isSigner: false, isWritable: true },
          { pubkey: mint.publicKey, isSigner: true, isWritable: true },
          { pubkey: curvePDA, isSigner: false, isWritable: true },
          { pubkey: curveTokenVault, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          {
            pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
            isSigner: false,
            isWritable: false,
          },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          {
            pubkey: new PublicKey("SysvarRent111111111111111111111111111111111"),
            isSigner: false,
            isWritable: false,
          },
        ],
        programId: this.programId,
        data,
      })
    );

    return instructions;
  }

  createBuyInstruction(
    buyer: PublicKey,
    mint: PublicKey,
    feeRecipient: PublicKey,
    solAmount: BN,
    minTokensOut: BN
  ): TransactionInstruction[] {
    const [configPDA] = findGlobalConfigPDA(this.programId);
    const [curvePDA] = findBondingCurvePDA(mint, this.programId);
    const curveTokenVault = getAssociatedTokenAddressSync(mint, curvePDA, true);
    const buyerTokenAccount = getAssociatedTokenAddressSync(mint, buyer);

    const instructions: TransactionInstruction[] = [];

    // Create ATA if needed
    instructions.push(
      createAssociatedTokenAccountInstruction(
        buyer,
        buyerTokenAccount,
        buyer,
        mint
      )
    );

    const data = Buffer.alloc(24);
    data.write("66063d1201daebea", 0, "hex"); // buy discriminator
    data.writeBigUInt64LE(BigInt(solAmount.toString()), 8);
    data.writeBigUInt64LE(BigInt(minTokensOut.toString()), 16);

    instructions.push(
      new TransactionInstruction({
        keys: [
          { pubkey: buyer, isSigner: true, isWritable: true },
          { pubkey: configPDA, isSigner: false, isWritable: true },
          { pubkey: curvePDA, isSigner: false, isWritable: true },
          { pubkey: curveTokenVault, isSigner: false, isWritable: true },
          { pubkey: buyerTokenAccount, isSigner: false, isWritable: true },
          { pubkey: feeRecipient, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          {
            pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
            isSigner: false,
            isWritable: false,
          },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: this.programId,
        data,
      })
    );

    return instructions;
  }

  createSellInstruction(
    seller: PublicKey,
    mint: PublicKey,
    feeRecipient: PublicKey,
    tokenAmount: BN,
    minSolOut: BN
  ): TransactionInstruction {
    const [configPDA] = findGlobalConfigPDA(this.programId);
    const [curvePDA] = findBondingCurvePDA(mint, this.programId);
    const curveTokenVault = getAssociatedTokenAddressSync(mint, curvePDA, true);
    const sellerTokenAccount = getAssociatedTokenAddressSync(mint, seller);

    const data = Buffer.alloc(24);
    data.write("b44d7b4f5e4e7a9c", 0, "hex"); // sell discriminator
    data.writeBigUInt64LE(BigInt(tokenAmount.toString()), 8);
    data.writeBigUInt64LE(BigInt(minSolOut.toString()), 16);

    return new TransactionInstruction({
      keys: [
        { pubkey: seller, isSigner: true, isWritable: true },
        { pubkey: configPDA, isSigner: false, isWritable: true },
        { pubkey: curvePDA, isSigner: false, isWritable: true },
        { pubkey: curveTokenVault, isSigner: false, isWritable: true },
        { pubkey: sellerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: feeRecipient, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data,
    });
  }

  // === Quote Functions ===

  async quoteBuy(
    mint: PublicKey,
    solAmount: BN
  ): Promise<{ tokensOut: BN; fee: BN; priceImpact: number }> {
    const curve = await this.getBondingCurve(mint);
    const config = await this.getGlobalConfig();

    if (!curve || !config) {
      throw new Error("Token or config not found");
    }

    const { tokensOut, fee } = calculateTokensOut(
      solAmount,
      curve.virtualSolReserves,
      curve.virtualTokenReserves,
      config.feeBps
    );

    // Calculate price impact
    const priceBefore =
      curve.virtualSolReserves.toNumber() / curve.virtualTokenReserves.toNumber();
    const newSolReserves = curve.virtualSolReserves.add(solAmount.sub(fee));
    const newTokenReserves = curve.virtualTokenReserves.sub(tokensOut);
    const priceAfter = newSolReserves.toNumber() / newTokenReserves.toNumber();
    const priceImpact = ((priceAfter - priceBefore) / priceBefore) * 100;

    return { tokensOut, fee, priceImpact };
  }

  async quoteSell(
    mint: PublicKey,
    tokenAmount: BN
  ): Promise<{ solOut: BN; fee: BN; priceImpact: number }> {
    const curve = await this.getBondingCurve(mint);
    const config = await this.getGlobalConfig();

    if (!curve || !config) {
      throw new Error("Token or config not found");
    }

    const { solOut, fee } = calculateSolOut(
      tokenAmount,
      curve.virtualSolReserves,
      curve.virtualTokenReserves,
      config.feeBps
    );

    // Calculate price impact
    const priceBefore =
      curve.virtualSolReserves.toNumber() / curve.virtualTokenReserves.toNumber();
    const newSolReserves = curve.virtualSolReserves.sub(solOut.add(fee));
    const newTokenReserves = curve.virtualTokenReserves.add(tokenAmount);
    const priceAfter = newSolReserves.toNumber() / newTokenReserves.toNumber();
    const priceImpact = ((priceBefore - priceAfter) / priceBefore) * 100;

    return { solOut, fee, priceImpact };
  }

  // === Parsing Helpers ===

  private parseGlobalConfig(data: Buffer): GlobalConfig {
    // Skip 8-byte discriminator
    let offset = 8;

    const authority = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;

    const feeRecipient = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;

    const feeBps = data.readUInt16LE(offset);
    offset += 2;

    const migrationThreshold = new BN(
      data.readBigUInt64LE(offset).toString()
    );
    offset += 8;

    const initialVirtualSol = new BN(
      data.readBigUInt64LE(offset).toString()
    );
    offset += 8;

    const initialVirtualTokens = new BN(
      data.readBigUInt64LE(offset).toString()
    );
    offset += 8;

    const totalTokens = new BN(data.readBigUInt64LE(offset).toString());
    offset += 8;

    const totalVolume = new BN(data.readBigUInt64LE(offset).toString());
    offset += 8;

    const bump = data.readUInt8(offset);

    return {
      authority,
      feeRecipient,
      feeBps,
      migrationThreshold,
      initialVirtualSol,
      initialVirtualTokens,
      totalTokens,
      totalVolume,
      bump,
    };
  }

  private parseBondingCurve(data: Buffer): BondingCurve {
    // Skip 8-byte discriminator
    let offset = 8;

    const mint = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;

    const creator = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;

    const virtualSolReserves = new BN(
      data.readBigUInt64LE(offset).toString()
    );
    offset += 8;

    const virtualTokenReserves = new BN(
      data.readBigUInt64LE(offset).toString()
    );
    offset += 8;

    const realSolReserves = new BN(data.readBigUInt64LE(offset).toString());
    offset += 8;

    const realTokenReserves = new BN(
      data.readBigUInt64LE(offset).toString()
    );
    offset += 8;

    const tokensSold = new BN(data.readBigUInt64LE(offset).toString());
    offset += 8;

    const migrated = data.readUInt8(offset) === 1;
    offset += 1;

    const createdAt = new BN(data.readBigInt64LE(offset).toString());
    offset += 8;

    const bump = data.readUInt8(offset);

    return {
      mint,
      creator,
      virtualSolReserves,
      virtualTokenReserves,
      realSolReserves,
      realTokenReserves,
      tokensSold,
      migrated,
      createdAt,
      bump,
    };
  }
}
