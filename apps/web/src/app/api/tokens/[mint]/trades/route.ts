import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { mint: string } }
) {
  try {
    const { mint } = params;
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

    // First get the token
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

    const trades = await prisma.trade.findMany({
      where: { tokenId: token.id },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    // Transform BigInt to string for JSON serialization
    const transformedTrades = trades.map((trade) => ({
      ...trade,
      solAmount: trade.solAmount.toString(),
      tokenAmount: trade.tokenAmount.toString(),
    }));

    return NextResponse.json(transformedTrades);
  } catch (error) {
    console.error("Error fetching trades:", error);
    return NextResponse.json(
      { error: "Failed to fetch trades" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { mint: string } }
) {
  try {
    const { mint } = params;
    const body = await request.json();

    const { signature, trader, type, solAmount, tokenAmount, price, timestamp } =
      body;

    // Validate required fields
    if (!signature || !trader || !type || !solAmount || !tokenAmount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

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

    // Create trade
    const trade = await prisma.trade.create({
      data: {
        tokenId: token.id,
        signature,
        trader,
        type,
        solAmount: BigInt(solAmount),
        tokenAmount: BigInt(tokenAmount),
        price: price || 0,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });

    // Update platform stats
    await prisma.platformStats.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        totalTrades: 1,
        totalVolume: BigInt(solAmount),
      },
      update: {
        totalTrades: { increment: 1 },
        totalVolume: { increment: BigInt(solAmount) },
      },
    });

    return NextResponse.json(
      {
        ...trade,
        solAmount: trade.solAmount.toString(),
        tokenAmount: trade.tokenAmount.toString(),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating trade:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Trade with this signature already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create trade" },
      { status: 500 }
    );
  }
}
