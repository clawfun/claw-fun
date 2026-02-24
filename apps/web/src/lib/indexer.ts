import { Connection, PublicKey, Logs, Context } from "@solana/web3.js";
import { prisma } from "./db";
import { publishPriceUpdate, publishTradeUpdate, publishNewToken } from "./websocket-server";
import { SOLANA_RPC_URL, SOLANA_WS_URL } from "./constants";

const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_OPENCLAW_PROGRAM_ID || "11111111111111111111111111111111"
);

let connection: Connection | null = null;
let subscriptionId: number | null = null;

export function startIndexer() {
  if (connection) {
    console.log("Indexer already running");
    return;
  }

  console.log("Starting Solana indexer...");

  connection = new Connection(SOLANA_RPC_URL, {
    wsEndpoint: SOLANA_WS_URL,
    commitment: "confirmed",
  });

  // Subscribe to program logs
  subscriptionId = connection.onLogs(
    PROGRAM_ID,
    (logs: Logs, ctx: Context) => {
      processLogs(logs, ctx).catch(console.error);
    },
    "confirmed"
  );

  console.log(`Indexer started, subscription ID: ${subscriptionId}`);
}

export function stopIndexer() {
  if (connection && subscriptionId !== null) {
    connection.removeOnLogsListener(subscriptionId);
    subscriptionId = null;
    connection = null;
    console.log("Indexer stopped");
  }
}

async function processLogs(logs: Logs, ctx: Context) {
  const signature = logs.signature;

  // Skip failed transactions
  if (logs.err) {
    return;
  }

  for (const log of logs.logs) {
    // Parse instruction logs
    if (log.includes("Instruction: CreateToken")) {
      await processTokenCreation(signature, logs.logs);
    } else if (log.includes("Buy:")) {
      await processBuy(signature, log);
    } else if (log.includes("Sell:")) {
      await processSell(signature, log);
    } else if (log.includes("Token") && log.includes("migrated")) {
      await processMigration(signature, log);
    }
  }
}

async function processTokenCreation(signature: string, logs: string[]) {
  try {
    // Parse token info from logs
    // Log format: "Token created: {name} ({symbol}) at {mint}"
    const createdLog = logs.find((l) => l.includes("Token created:"));
    if (!createdLog) return;

    const match = createdLog.match(/Token created: (.+) \((.+)\) at (.+)/);
    if (!match) return;

    const [, name, symbol, mint] = match;

    // Check if token already exists
    const existing = await prisma.token.findUnique({
      where: { mint },
    });

    if (existing) return;

    // Fetch on-chain data for bonding curve
    if (!connection) return;

    // Get transaction details for creator info
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) return;

    const creator = tx.transaction.message.staticAccountKeys[0].toString();

    // Find bonding curve PDA
    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding_curve"), new PublicKey(mint).toBuffer()],
      PROGRAM_ID
    );

    // Create token in database
    const token = await prisma.token.create({
      data: {
        mint,
        name,
        symbol,
        creator,
        bondingCurve: bondingCurve.toString(),
      },
    });

    // Update platform stats
    await prisma.platformStats.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", totalTokens: 1 },
      update: { totalTokens: { increment: 1 } },
    });

    // Publish WebSocket event
    await publishNewToken({
      token: {
        mint,
        name,
        symbol,
        creator,
        marketCapSol: 0,
      },
    });

    console.log(`Indexed new token: ${name} (${symbol}) - ${mint}`);
  } catch (error) {
    console.error("Error processing token creation:", error);
  }
}

async function processBuy(signature: string, log: string) {
  try {
    // Log format: "Buy: {solAmount} lamports -> {tokenAmount} tokens (fee: {fee} lamports)"
    const match = log.match(/Buy: (\d+) lamports -> (\d+) tokens \(fee: (\d+) lamports\)/);
    if (!match) return;

    const [, solAmount, tokenAmount, fee] = match;

    // Get transaction details
    if (!connection) return;

    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) return;

    const accountKeys = tx.transaction.message.staticAccountKeys;
    const trader = accountKeys[0].toString();

    // Find the token mint from accounts
    // Account layout: [buyer, config, bondingCurve, curveTokenVault, buyerTokenAccount, ...]
    const buyerTokenAccount = accountKeys[4];

    // Get token info from ATA
    const ataInfo = await connection.getAccountInfo(buyerTokenAccount);
    if (!ataInfo) return;

    // Parse ATA to get mint (bytes 0-32)
    const mint = new PublicKey(ataInfo.data.subarray(0, 32)).toString();

    // Get token from database
    const token = await prisma.token.findUnique({
      where: { mint },
    });

    if (!token) {
      console.warn(`Token not found for buy: ${mint}`);
      return;
    }

    // Calculate price
    const solAmountNum = BigInt(solAmount);
    const tokenAmountNum = BigInt(tokenAmount);
    const price = Number(solAmountNum) / Number(tokenAmountNum);

    // Create trade record
    await prisma.trade.create({
      data: {
        tokenId: token.id,
        signature,
        trader,
        type: "BUY",
        solAmount: solAmountNum,
        tokenAmount: tokenAmountNum,
        price,
        timestamp: new Date(),
      },
    });

    // Update token reserves
    const updatedToken = await prisma.token.update({
      where: { mint },
      data: {
        virtualSolReserves: { increment: solAmountNum - BigInt(fee) },
        virtualTokenReserves: { decrement: tokenAmountNum },
        realSolReserves: { increment: solAmountNum - BigInt(fee) },
        realTokenReserves: { decrement: tokenAmountNum },
      },
    });

    // Calculate new market cap
    const newPrice = Number(updatedToken.virtualSolReserves) / Number(updatedToken.virtualTokenReserves);
    const marketCapSol = (newPrice * 1e15) / 1e9; // Total supply is 1B tokens

    await prisma.token.update({
      where: { mint },
      data: { marketCapSol },
    });

    // Update platform stats
    await prisma.platformStats.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", totalTrades: 1, totalVolume: solAmountNum },
      update: {
        totalTrades: { increment: 1 },
        totalVolume: { increment: solAmountNum },
      },
    });

    // Publish WebSocket events
    await publishTradeUpdate({
      mint,
      trade: {
        signature,
        trader,
        type: "BUY",
        solAmount: solAmount,
        tokenAmount: tokenAmount,
        price,
        timestamp: new Date().toISOString(),
      },
    });

    await publishPriceUpdate({
      mint,
      price: newPrice,
      marketCap: marketCapSol,
      virtualSolReserves: updatedToken.virtualSolReserves.toString(),
      virtualTokenReserves: updatedToken.virtualTokenReserves.toString(),
    });

    console.log(`Indexed buy: ${trader} bought ${tokenAmount} tokens for ${solAmount} lamports`);
  } catch (error) {
    console.error("Error processing buy:", error);
  }
}

async function processSell(signature: string, log: string) {
  try {
    // Log format: "Sell: {tokenAmount} tokens -> {solAmount} lamports (fee: {fee} lamports)"
    const match = log.match(/Sell: (\d+) tokens -> (\d+) lamports \(fee: (\d+) lamports\)/);
    if (!match) return;

    const [, tokenAmount, solAmount, fee] = match;

    // Get transaction details
    if (!connection) return;

    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) return;

    const accountKeys = tx.transaction.message.staticAccountKeys;
    const trader = accountKeys[0].toString();

    // Find the token mint from accounts
    const sellerTokenAccount = accountKeys[4];
    const ataInfo = await connection.getAccountInfo(sellerTokenAccount);
    if (!ataInfo) return;

    const mint = new PublicKey(ataInfo.data.subarray(0, 32)).toString();

    // Get token from database
    const token = await prisma.token.findUnique({
      where: { mint },
    });

    if (!token) {
      console.warn(`Token not found for sell: ${mint}`);
      return;
    }

    const solAmountNum = BigInt(solAmount);
    const tokenAmountNum = BigInt(tokenAmount);
    const feeNum = BigInt(fee);
    const price = Number(solAmountNum) / Number(tokenAmountNum);

    // Create trade record
    await prisma.trade.create({
      data: {
        tokenId: token.id,
        signature,
        trader,
        type: "SELL",
        solAmount: solAmountNum,
        tokenAmount: tokenAmountNum,
        price,
        timestamp: new Date(),
      },
    });

    // Update token reserves
    const updatedToken = await prisma.token.update({
      where: { mint },
      data: {
        virtualSolReserves: { decrement: solAmountNum + feeNum },
        virtualTokenReserves: { increment: tokenAmountNum },
        realSolReserves: { decrement: solAmountNum + feeNum },
        realTokenReserves: { increment: tokenAmountNum },
      },
    });

    // Calculate new market cap
    const newPrice = Number(updatedToken.virtualSolReserves) / Number(updatedToken.virtualTokenReserves);
    const marketCapSol = (newPrice * 1e15) / 1e9;

    await prisma.token.update({
      where: { mint },
      data: { marketCapSol },
    });

    // Update platform stats
    await prisma.platformStats.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", totalTrades: 1, totalVolume: solAmountNum + feeNum },
      update: {
        totalTrades: { increment: 1 },
        totalVolume: { increment: solAmountNum + feeNum },
      },
    });

    // Publish WebSocket events
    await publishTradeUpdate({
      mint,
      trade: {
        signature,
        trader,
        type: "SELL",
        solAmount: solAmount,
        tokenAmount: tokenAmount,
        price,
        timestamp: new Date().toISOString(),
      },
    });

    await publishPriceUpdate({
      mint,
      price: newPrice,
      marketCap: marketCapSol,
      virtualSolReserves: updatedToken.virtualSolReserves.toString(),
      virtualTokenReserves: updatedToken.virtualTokenReserves.toString(),
    });

    console.log(`Indexed sell: ${trader} sold ${tokenAmount} tokens for ${solAmount} lamports`);
  } catch (error) {
    console.error("Error processing sell:", error);
  }
}

async function processMigration(signature: string, log: string) {
  try {
    // Log format: "Token {mint} migrated to DEX..."
    const match = log.match(/Token (\w+) migrated/);
    if (!match) return;

    const [, mint] = match;

    await prisma.token.update({
      where: { mint },
      data: {
        migrated: true,
        migrationTx: signature,
      },
    });

    // Update platform stats
    await prisma.platformStats.update({
      where: { id: "singleton" },
      data: { totalMigrated: { increment: 1 } },
    });

    console.log(`Indexed migration: ${mint}`);
  } catch (error) {
    console.error("Error processing migration:", error);
  }
}
