import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { mint: string } }
) {
  try {
    const { mint } = params;

    const token = await prisma.token.findUnique({
      where: { mint },
      include: {
        _count: {
          select: { trades: true, comments: true, holders: true },
        },
      },
    });

    if (!token) {
      return NextResponse.json(
        { error: "Token not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...token,
      virtualSolReserves: token.virtualSolReserves.toString(),
      virtualTokenReserves: token.virtualTokenReserves.toString(),
      realSolReserves: token.realSolReserves.toString(),
      realTokenReserves: token.realTokenReserves.toString(),
      tradesCount: token._count.trades,
      commentsCount: token._count.comments,
      holdersCount: token._count.holders,
    });
  } catch (error) {
    console.error("Error fetching token:", error);
    return NextResponse.json(
      { error: "Failed to fetch token" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { mint: string } }
) {
  try {
    const { mint } = params;
    const body = await request.json();

    const {
      virtualSolReserves,
      virtualTokenReserves,
      realSolReserves,
      realTokenReserves,
      marketCapSol,
      migrated,
      migrationTx,
    } = body;

    const updateData: Record<string, any> = {};

    if (virtualSolReserves !== undefined)
      updateData.virtualSolReserves = BigInt(virtualSolReserves);
    if (virtualTokenReserves !== undefined)
      updateData.virtualTokenReserves = BigInt(virtualTokenReserves);
    if (realSolReserves !== undefined)
      updateData.realSolReserves = BigInt(realSolReserves);
    if (realTokenReserves !== undefined)
      updateData.realTokenReserves = BigInt(realTokenReserves);
    if (marketCapSol !== undefined) updateData.marketCapSol = marketCapSol;
    if (migrated !== undefined) updateData.migrated = migrated;
    if (migrationTx !== undefined) updateData.migrationTx = migrationTx;

    const token = await prisma.token.update({
      where: { mint },
      data: updateData,
    });

    return NextResponse.json({
      ...token,
      virtualSolReserves: token.virtualSolReserves.toString(),
      virtualTokenReserves: token.virtualTokenReserves.toString(),
      realSolReserves: token.realSolReserves.toString(),
      realTokenReserves: token.realTokenReserves.toString(),
    });
  } catch (error: any) {
    console.error("Error updating token:", error);

    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Token not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update token" },
      { status: 500 }
    );
  }
}
