import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const stats = await prisma.platformStats.findUnique({
      where: { id: "singleton" },
    });

    if (!stats) {
      return NextResponse.json({
        totalVolume: "0",
        totalTrades: 0,
        totalTokens: 0,
        totalMigrated: 0,
      });
    }

    return NextResponse.json({
      totalVolume: stats.totalVolume.toString(),
      totalTrades: stats.totalTrades,
      totalTokens: stats.totalTokens,
      totalMigrated: stats.totalMigrated,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
