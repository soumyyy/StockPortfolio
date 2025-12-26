import { Holding } from './holding';

export interface Position {
  accountId: string;
  tradingsymbol: string;
  product: string;
  exchange: string;
  quantity: number;
  overnightQuantity: number;
  averagePrice: number;
  lastTradedPrice: number;
  pnl: number;
}

export interface AccountPortfolio {
  accountId: string;
  accountLabel: string;
  holdings: Holding[];
  positions: Position[];
  lastSyncedAt: string | null;
  needsSync: boolean;
  syncError?: string | null;
}

export interface PortfolioAPIResponse {
  combined: {
    holdings: Holding[];
    positions: Position[];
    fetchedAt: string | null;
  };
  accounts: AccountPortfolio[];
  errors: { accountId?: string; message: string }[];
}
