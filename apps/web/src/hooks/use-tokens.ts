"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/constants";

export interface Token {
  id: string;
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  creator: string;
  bondingCurve: string;
  virtualSolReserves: string;
  virtualTokenReserves: string;
  realSolReserves: string;
  realTokenReserves: string;
  marketCapSol: number;
  migrated: boolean;
  createdAt: string;
  tradesCount?: number;
}

export interface Trade {
  id: string;
  signature: string;
  trader: string;
  type: "BUY" | "SELL";
  solAmount: string;
  tokenAmount: string;
  price: number;
  timestamp: string;
}

export interface TokensResponse {
  tokens: Token[];
  total: number;
  page: number;
  pageSize: number;
}

async function fetchTokens(params: {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: "asc" | "desc";
}): Promise<TokensResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.pageSize) searchParams.set("pageSize", params.pageSize.toString());
  if (params.sort) searchParams.set("sort", params.sort);
  if (params.order) searchParams.set("order", params.order);

  const res = await fetch(`${API_BASE_URL}/api/tokens?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch tokens");
  return res.json();
}

async function fetchToken(mint: string): Promise<Token> {
  const res = await fetch(`${API_BASE_URL}/api/tokens/${mint}`);
  if (!res.ok) throw new Error("Failed to fetch token");
  return res.json();
}

async function fetchTrades(mint: string): Promise<Trade[]> {
  const res = await fetch(`${API_BASE_URL}/api/tokens/${mint}/trades`);
  if (!res.ok) throw new Error("Failed to fetch trades");
  return res.json();
}

export function useTokens(params: {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: "asc" | "desc";
} = {}) {
  return useQuery({
    queryKey: ["tokens", params],
    queryFn: () => fetchTokens(params),
  });
}

export function useToken(mint: string) {
  return useQuery({
    queryKey: ["token", mint],
    queryFn: () => fetchToken(mint),
    enabled: !!mint,
  });
}

export function useTrades(mint: string) {
  return useQuery({
    queryKey: ["trades", mint],
    queryFn: () => fetchTrades(mint),
    enabled: !!mint,
  });
}
