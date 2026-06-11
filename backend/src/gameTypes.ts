export interface Owner {
  name: string;
  totalInvested: number;
  currentValue: number;
  percentOwned: number;
}

export interface Stock {
  name: string;
  industry: "Technology" | "Retail" | "Finance" | "Healthcare" | "Energy";
  price: number;
  volatility: number;
  baseChange: number;
  priceHistory: Map<number, number>;
  purchaseHistory: Map<number, number>;
  owners: Map<string, Owner>;
}

export interface User {
  id: string;
  username: string;
}

export interface Player extends User {
  fundName: string;
  cash: number;
  totalValue: number;
  ownedStocks: string[];
  investors: Map<string, number>;
}

export interface Game {
  id: number;
  name: string;
  status: "PENDING" | "ACTIVE" | "COMPLETED";
  players: User[];
}

export interface ActiveGame extends Game {
  players: Player[];
  currentDay: number; // Lasts for 365 days
  stocks: Stock[];
  allInvestors: Map<string, number>; // Tracks the different types of investors
  marketRate: number;
  currentEvents: string[];
}
