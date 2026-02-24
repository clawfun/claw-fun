import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { wallet: string } }
) {
  try {
    const { wallet } = params;

    let user = await prisma.user.findUnique({
      where: { wallet },
      include: {
        comments: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Auto-create user if doesn't exist
    if (!user) {
      user = await prisma.user.create({
        data: { wallet },
        include: { comments: true },
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { wallet: string } }
) {
  try {
    const { wallet } = params;
    const body = await request.json();

    const { username, bio, avatar, twitter } = body;

    const updateData: Record<string, string> = {};
    if (username !== undefined) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (twitter !== undefined) updateData.twitter = twitter;

    const user = await prisma.user.upsert({
      where: { wallet },
      update: updateData,
      create: { wallet, ...updateData },
    });

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Error updating user:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
