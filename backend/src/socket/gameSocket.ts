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

cron.schedule("*/5 * * * * *", () => {
  // Simulates a day
  activeGames.forEach((game, gameId) => {});
});

const gameSocket = (io: Server) => {
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
