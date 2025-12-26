// src/types/holding.ts
export interface Holding {
  ticker: string;
  name: string;
  buyPrice: number;
  quantity: number;
  lastTradedPrice: number;
  dailyChange: number;
  dailyChangePercentage: number;
  dayRange: string;
  volume: number;
  averageBuyPrice: number;
  unrealizedPL: number;
  unrealizedPLPercentage: number;
  accountId?: string;
  accountLabel?: string;
}
