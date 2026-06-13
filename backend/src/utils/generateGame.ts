import { Game, Player, Stock, ActiveGame } from "../gameTypes";
import generateStock from "./generateStock";

const generateGame = (game: Game) => {
  let newGame: ActiveGame = {
    ...game,
    currentDay: 0,
    marketRate: (Math.random() - 0.5) * 0.02,
    players: [] as Player[],
    stocks: [] as Stock[],
    allInvestors: new Map<string, number>(),
    currentEvents: [] as string[],
  };
  for (const user of game.players) {
    const player: Player = {
      ...user,
      fundName: `${user.username}'s Fund`,
      cash: 1000,
      totalValue: 1000,
      totalValueHistory: new Map<number, number>(),
      ownedStocks: new Map<string, number>(),
      investors: new Map<string, number>(),
    };
    player.totalValueHistory.set(0, player.totalValue);
    newGame.players.push(player);
  }
  for (let i = 0; i < 75; i++) {
    const industry = [
      "Technology",
      "Retail",
      "Finance",
      "Healthcare",
      "Energy",
    ][i % 5] as "Technology" | "Retail" | "Finance" | "Healthcare" | "Energy";
    const stock = generateStock(industry);
    newGame.stocks.push(stock);
  }
  newGame.allInvestors.set("Retirees", 500);
  newGame.allInvestors.set("High Growth", 300);
  newGame.allInvestors.set("Value Seekers", 300);
  newGame.allInvestors.set("Heroes", 200);
  return newGame;
};

export default generateGame;
