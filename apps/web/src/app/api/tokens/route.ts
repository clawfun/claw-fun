import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);
    const sort = searchParams.get("sort") || "createdAt";
    const order = (searchParams.get("order") || "desc") as "asc" | "desc";

    const skip = (page - 1) * pageSize;

    // Build sort object
    const orderBy: Record<string, "asc" | "desc"> = {};
    if (["createdAt", "marketCapSol", "name"].includes(sort)) {
      orderBy[sort] = order;
    } else {
      orderBy.createdAt = "desc";
    }

    const [tokens, total] = await Promise.all([
      prisma.token.findMany({
        skip,
        take: pageSize,
        orderBy,
        include: {
          _count: {
            select: { trades: true },
          },
        },
      }),
      prisma.token.count(),
    ]);

    // Transform data
    const transformedTokens = tokens.map((token) => ({
      ...token,
      virtualSolReserves: token.virtualSolReserves.toString(),
      virtualTokenReserves: token.virtualTokenReserves.toString(),
      realSolReserves: token.realSolReserves.toString(),
      realTokenReserves: token.realTokenReserves.toString(),
      tradesCount: token._count.trades,
    }));

    return NextResponse.json({
      tokens: transformedTokens,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Error fetching tokens:", error);
    return NextResponse.json(
      { error: "Failed to fetch tokens" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      mint,
      name,
      symbol,
      description,
      image,
      twitter,
      telegram,
      website,
      creator,
      bondingCurve,
    } = body;

    // Validate required fields
    if (!mint || !name || !symbol || !creator || !bondingCurve) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create token
    const token = await prisma.token.create({
      data: {
        mint,
        name,
        symbol,
        description,
        image,
        twitter,
        telegram,
        website,
        creator,
        bondingCurve,
      },
    });

    // Update platform stats
    await prisma.platformStats.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", totalTokens: 1 },
      update: { totalTokens: { increment: 1 } },
    });

    return NextResponse.json(token, { status: 201 });
  } catch (error: any) {
    console.error("Error creating token:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Token with this mint already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create token" },
      { status: 500 }
    );
  }
}
