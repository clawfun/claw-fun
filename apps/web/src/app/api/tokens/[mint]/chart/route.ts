import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { mint: string } }
) {
  try {
    const { mint } = params;
    const searchParams = request.nextUrl.searchParams;
    const resolution = searchParams.get("resolution") || "1"; // minutes
    const from = parseInt(searchParams.get("from") || "0");
    const to = parseInt(searchParams.get("to") || String(Date.now() / 1000));

    // Get token
    const token = await prisma.token.findUnique({
      where: { mint },
      select: { id: true },
    });

    if (!token) {
      return NextResponse.json(
        { error: "Token not found" },
        { status: 404 }
      );
    }

    // Get trades in time range
    const trades = await prisma.trade.findMany({
      where: {
        tokenId: token.id,
        timestamp: {
          gte: new Date(from * 1000),
          lte: new Date(to * 1000),
        },
      },
      orderBy: { timestamp: "asc" },
    });

    if (trades.length === 0) {
      return NextResponse.json([]);
    }

    // Group trades into candles
    const resolutionMs = parseInt(resolution) * 60 * 1000;
    const candles: Map<number, OHLCV> = new Map();

    for (const trade of trades) {
      const timestamp = Math.floor(trade.timestamp.getTime() / resolutionMs) * resolutionMs / 1000;
      const price = trade.price;
      const volume = Number(trade.solAmount) / 1e9;

      if (!candles.has(timestamp)) {
        candles.set(timestamp, {
          time: timestamp,
          open: price,
          high: price,
          low: price,
          close: price,
          volume,
        });
      } else {
        const candle = candles.get(timestamp)!;
        candle.high = Math.max(candle.high, price);
        candle.low = Math.min(candle.low, price);
        candle.close = price;
        candle.volume += volume;
      }
    }

    // Convert to array and sort
    const ohlcvData = Array.from(candles.values()).sort((a, b) => a.time - b.time);

    return NextResponse.json(ohlcvData);
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return NextResponse.json(
      { error: "Failed to fetch chart data" },
      { status: 500 }
    );
  }
}
