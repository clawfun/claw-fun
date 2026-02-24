"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";

interface PriceUpdate {
  type: "price";
  mint: string;
  price: number;
  marketCap: number;
  virtualSolReserves: string;
  virtualTokenReserves: string;
}

interface TradeUpdate {
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

interface NewTokenUpdate {
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

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Connect to WebSocket server
    const socket = io({
      path: "/api/socketio",
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("WebSocket connected");
    });

    socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
    });

    socket.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const subscribeToToken = useCallback((mint: string) => {
    if (socketRef.current) {
      socketRef.current.emit("subscribe:token", mint);
    }
  }, []);

  const unsubscribeFromToken = useCallback((mint: string) => {
    if (socketRef.current) {
      socketRef.current.emit("unsubscribe:token", mint);
    }
  }, []);

  const subscribeToNewTokens = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("subscribe:newTokens");
    }
  }, []);

  const onPriceUpdate = useCallback(
    (callback: (update: PriceUpdate) => void) => {
      if (socketRef.current) {
        socketRef.current.on("price", callback);
        return () => {
          socketRef.current?.off("price", callback);
        };
      }
    },
    []
  );

  const onTradeUpdate = useCallback(
    (callback: (update: TradeUpdate) => void) => {
      if (socketRef.current) {
        socketRef.current.on("trade", callback);
        return () => {
          socketRef.current?.off("trade", callback);
        };
      }
    },
    []
  );

  const onNewToken = useCallback(
    (callback: (update: NewTokenUpdate) => void) => {
      if (socketRef.current) {
        socketRef.current.on("newToken", callback);
        return () => {
          socketRef.current?.off("newToken", callback);
        };
      }
    },
    []
  );

  return {
    socket: socketRef.current,
    subscribeToToken,
    unsubscribeFromToken,
    subscribeToNewTokens,
    onPriceUpdate,
    onTradeUpdate,
    onNewToken,
  };
}

export function useTokenUpdates(mint: string) {
  const { subscribeToToken, unsubscribeFromToken, onPriceUpdate, onTradeUpdate } =
    useWebSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    subscribeToToken(mint);

    const unsubPrice = onPriceUpdate?.((update) => {
      if (update.mint === mint) {
        // Update token cache
        queryClient.setQueryData(["token", mint], (old: any) => ({
          ...old,
          marketCapSol: update.marketCap,
          virtualSolReserves: update.virtualSolReserves,
          virtualTokenReserves: update.virtualTokenReserves,
        }));
      }
    });

    const unsubTrade = onTradeUpdate?.((update) => {
      if (update.mint === mint) {
        // Add trade to cache
        queryClient.setQueryData(["trades", mint], (old: any[] = []) => [
          {
            id: update.trade.signature,
            ...update.trade,
          },
          ...old,
        ]);
      }
    });

    return () => {
      unsubscribeFromToken(mint);
      unsubPrice?.();
      unsubTrade?.();
    };
  }, [mint, subscribeToToken, unsubscribeFromToken, onPriceUpdate, onTradeUpdate, queryClient]);
}
