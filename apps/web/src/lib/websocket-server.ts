import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { redis, REDIS_KEYS } from "./redis";

export interface PriceUpdate {
  type: "price";
  mint: string;
  price: number;
  marketCap: number;
  virtualSolReserves: string;
  virtualTokenReserves: string;
}

export interface TradeUpdate {
  type: "trade";
  mint: string;
  trade: {
    signature: string;
    trader: string;
    type: "BUY" | "SELL";
    solAmount: string;
    tokenAmount: string;
    price: number;
    timestamp: string;
  };
}

export interface NewTokenUpdate {
  type: "newToken";
  token: {
    mint: string;
    name: string;
    symbol: string;
    image?: string;
    creator: string;
    marketCapSol: number;
  };
}

export type WSMessage = PriceUpdate | TradeUpdate | NewTokenUpdate;

let io: SocketIOServer | null = null;

export function initWebSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "*",
      methods: ["GET", "POST"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Subscribe to specific token updates
    socket.on("subscribe:token", (mint: string) => {
      socket.join(`token:${mint}`);
      console.log(`${socket.id} subscribed to token:${mint}`);
    });

    socket.on("unsubscribe:token", (mint: string) => {
      socket.leave(`token:${mint}`);
      console.log(`${socket.id} unsubscribed from token:${mint}`);
    });

    // Subscribe to all new tokens
    socket.on("subscribe:newTokens", () => {
      socket.join("newTokens");
      console.log(`${socket.id} subscribed to newTokens`);
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  // Subscribe to Redis pub/sub for updates
  initRedisSubscriber();

  return io;
}

async function initRedisSubscriber() {
  const subscriber = redis.duplicate();

  await subscriber.subscribe("price_updates", "trade_updates", "new_tokens");

  subscriber.on("message", (channel, message) => {
    if (!io) return;

    try {
      const data = JSON.parse(message);

      switch (channel) {
        case "price_updates":
          io.to(`token:${data.mint}`).emit("price", data);
          break;

        case "trade_updates":
          io.to(`token:${data.mint}`).emit("trade", data);
          break;

        case "new_tokens":
          io.to("newTokens").emit("newToken", data);
          break;
      }
    } catch (error) {
      console.error("Error processing Redis message:", error);
    }
  });
}

// Helper functions to publish events
export async function publishPriceUpdate(update: Omit<PriceUpdate, "type">) {
  await redis.publish("price_updates", JSON.stringify({ type: "price", ...update }));
}

export async function publishTradeUpdate(update: Omit<TradeUpdate, "type">) {
  await redis.publish("trade_updates", JSON.stringify({ type: "trade", ...update }));
}

export async function publishNewToken(update: Omit<NewTokenUpdate, "type">) {
  await redis.publish("new_tokens", JSON.stringify({ type: "newToken", ...update }));
}

export function getIO(): SocketIOServer | null {
  return io;
}
