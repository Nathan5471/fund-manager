import { Server } from "socket.io";
import { parse } from "cookie";
import cron from "node-cron";
import authenticate from "../utils/authenticate";
import {
  joinGame,
  leaveGame,
  changeGameStatus,
} from "../controllers/gameController";
import generateGame from "../utils/generateGame";
import { Game, ActiveGame } from "../gameTypes";

const games = new Map<number, Game>();
const activeGames = new Map<number, ActiveGame>();

const gameSocket = (io: Server) => {
  cron.schedule("*/5 * * * * *", () => {
    // Simulates a day
    activeGames.forEach((game, gameId) => {
      game.currentDay += 1;
      if (game.currentDay > 365) {
        game.status = "COMPLETED";
        const updatedGame = games.get(gameId);
        if (updatedGame) {
          updatedGame.status = "COMPLETED";
          games.set(gameId, updatedGame);
        }
        io.to(`game_${gameId}`).emit("gameCompleted", game);
      } else {
        if (Math.random() < 0.6 && game.currentEvents.length > 0) {
          // 60% chance of ending a random event
          const eventIndex = Math.floor(
            Math.random() * game.currentEvents.length,
          );
          game.currentEvents = game.currentEvents.filter(
            (_, index) => index !== eventIndex,
          );
        }
        if (Math.random() < 0.05) {
          // 5% chance of a random event
          const events = [
            "Market Surge",
            "Market Crash",
            "Tech Surge",
            "Tech Crash",
            "Retail Surge",
            "Retail Crash",
            "Finance Surge",
            "Finance Crash",
            "Healthcare Surge",
            "Healthcare Crash",
            "Energy Surge",
            "Energy Crash",
          ];
          const event = events[Math.floor(Math.random() * events.length)];
          game.currentEvents.push(event);
        }
        for (const stock of game.stocks) {
          const eventImpact = game.currentEvents.reduce((acc, event) => {
            if (
              event.split(" ")[0] === stock.industry ||
              event.split(" ")[0] === "Market"
            ) {
              return acc + (event.split(" ")[1] === "Surge" ? 0.1 : -0.1);
            }
            return acc;
          }, 0);
          const stockChange =
            1 +
            game.marketRate +
            eventImpact +
            stock.volatility * (Math.random() - 0.5) +
            stock.baseChange +
            stock.playerSentiment;
          stock.price *= stockChange;
          stock.priceHistory.set(game.currentDay, stock.price);
          stock.playerSentiment *= 0.7;
          if (Math.abs(stock.playerSentiment) < 0.01) {
            stock.playerSentiment = 0;
          }
          for (const [playerId, owner] of stock.owners) {
            const player = game.players.find((p) => p.id === playerId);
            if (player) {
              const stockValue = owner.currentValue * stockChange;
              player.totalValue += stockValue - owner.currentValue;
              owner.currentValue = stockValue;
              owner.percentOwned = owner.currentValue / stock.price;
            }
          }
        }
        for (const player of game.players) {
          player.totalValueHistory.set(game.currentDay, player.totalValue);
        }
        io.to(`game_${gameId}`).emit("gameUpdated", game);
      }
    });
  });

  io.use(async (socket, next) => {
    try {
      const cookies = socket.handshake.headers.cookie;
      if (!cookies) {
        throw new Error("Unauthorized");
      }
      const { token } = parse(cookies);
      if (!token) {
        throw new Error("Unauthorized");
      }
      const user = await authenticate(token);
      (socket as any).user = user;
    } catch (error) {
      console.error("Socket authentication error:", error);
      throw new Error("Unauthorized");
    }
    next();
  });

  io.on("connection", (socket) => {
    const user = (socket as any).user;
    console.log(`User ${user.id} connected`);

    socket.on("joinGame", async (gameId: number) => {
      try {
        const game = (await joinGame(gameId, user.id)) as Game;
        if (game) {
          if (!games.has(gameId)) {
            games.set(gameId, game);
          }
          socket.join(`game_${gameId}`);
          io.to(`game_${gameId}`).emit("gameUpdated", game);
        }
      } catch (error) {
        console.error("Error joining game:", error);
        socket.emit("error", "An error occurred while joining the game");
      }
    });

    socket.on("leaveGame", async (gameId: number) => {
      try {
        const game = (await leaveGame(gameId, user.id)) as Game | null;
        if (game) {
          games.set(gameId, game);
          socket.leave(`game_${gameId}`);
          io.to(`game_${gameId}`).emit("gameUpdated", game);
        } else {
          games.delete(gameId);
          socket.leave(`game_${gameId}`);
          io.to(`game_${gameId}`).emit("gameDeleted");
        }
      } catch (error) {
        console.error("Error leaving game:", error);
        socket.emit("error", "An error occurred while leaving the game");
      }
    });

    socket.on("startGame", async (gameId: number) => {
      const game = games.get(gameId);
      if (!game) {
        socket.emit("error", "Game not found");
        return;
      }
      if (game.status !== "PENDING") {
        socket.emit("error", "Can't start game");
        return;
      }
      if (!game.players.some((player) => player.id === user.id)) {
        socket.emit("error", "You are not part of this game");
        return;
      }
      if (game.players.length < 2) {
        socket.emit(
          "error",
          "At least 2 players are required to start the game",
        );
        return;
      }
      try {
        const updatedGame = (await changeGameStatus(
          gameId,
          "IN_PROGRESS",
        )) as Game;
        games.set(gameId, updatedGame);
        const activeGame = generateGame(updatedGame);
        activeGames.set(gameId, activeGame);
        io.to(`game_${gameId}`).emit("gameStarted", activeGame);
      } catch (error) {
        console.error("Error starting game:", error);
        socket.emit("error", "An error occurred while starting the game");
      }
    });

    socket.on(
      "changeStockPicks",
      async (gameId: number, stockPicks: Map<string, number>) => {
        const game = activeGames.get(gameId);
        if (!game) {
          socket.emit("error", "Game not found");
          return;
        }
        const player = game.players.find((player) => player.id === user.id);
        if (!player) {
          socket.emit("error", "You are not part of this game");
          return;
        }
        let totalInvestment = 0;
        for (const [stockName, percent] of stockPicks) {
          totalInvestment += percent;
        }
        if (totalInvestment > 1) {
          socket.emit("error", "Total investment can't exceed 100%");
          return;
        }
        player.ownedStocks = stockPicks;
        const totalValue = player.totalValue;
        let cash = player.totalValue;
        for (const [stockName, percent] of stockPicks) {
          const stock = game.stocks.find((s) => s.name === stockName);
          if (!stock) {
            socket.emit("error", `Stock ${stockName} not found`);
            return;
          }
          const currentInvestment =
            stock.owners.get(player.id)?.currentValue || 0;
          const newInvestment = totalValue * percent;
          const investmentChange = newInvestment - currentInvestment;
          const newPrice = stock.price + investmentChange;
          stock.price = newPrice;
          cash -= newInvestment;
          stock.owners.set(player.id, {
            name: player.username,
            totalInvested: newInvestment,
            currentValue: newInvestment,
            percentOwned: newInvestment / newPrice,
          });
          stock.priceHistory.set(game.currentDay, stock.price);
          const impactOnPlayerSentiment = (investmentChange / totalValue) * 0.1;
          const newPlayerSentiment = Math.max(
            -0.1,
            Math.min(0.1, stock.playerSentiment + impactOnPlayerSentiment),
          );
          stock.playerSentiment = newPlayerSentiment;
          for (const [ownerId, owner] of stock.owners) {
            owner.percentOwned = owner.currentValue / stock.price;
          }
        }
        player.cash = cash;
        io.to(`game_${gameId}`).emit("gameUpdated", game);
      },
    );

    socket.on("disconnect", async () => {
      console.log(`User ${user.id} disconnected`);
      const userGames = Array.from(games.values()).filter((game) => {
        return game.players.some((player) => player.id === user.id);
      });
      for (const game of userGames) {
        try {
          const updatedGame = (await leaveGame(
            game.id,
            user.id,
          )) as Game | null;
          if (updatedGame) {
            games.set(game.id, updatedGame);
            io.to(`game_${game.id}`).emit("gameUpdated", updatedGame);
          } else {
            games.delete(game.id);
            io.to(`game_${game.id}`).emit("gameDeleted");
          }
        } catch (error) {
          console.error("Error handling disconnect:", error);
        }
      }
    });
  });
};

export default gameSocket;
