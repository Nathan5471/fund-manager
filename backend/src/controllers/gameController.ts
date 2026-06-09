import prisma from "../prisma/client";

export const createGame = async (req: any, res: any) => {
  const { name } = req.body as { name: string };

  try {
    const game = await prisma.game.create({
      data: {
        name,
      },
    });
    return res
      .status(201)
      .json({ message: "Game created successfully", id: game.id });
  } catch (error) {
    console.error("Error creating game:", error);
    return res
      .status(500)
      .json({ message: "An error occurred while creating the game" });
  }
};

export const joinGame = async (gameId: number, userId: string) => {
  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { players: true },
    });
    if (!game) {
      throw new Error("Game not found");
    }
    if (game.status !== "PENDING") {
      throw new Error("Game is not open for joining");
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new Error("User not found");
    }
    if (game.players.some((player) => player.id === userId)) {
      throw new Error("User is already part of the game");
    }
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        players: {
          connect: { id: userId },
        },
      },
      include: { players: true },
    });
    const returnedGame = {
      id: updatedGame.id,
      name: updatedGame.name,
      status: updatedGame.status,
      players: updatedGame.players.map((player) => ({
        id: player.id,
        username: player.username,
      })),
    };
    return returnedGame;
  } catch (error) {
    console.error("Error joining game:", error);
    throw new Error("An error occurred while joining the game");
  }
};

export const leaveGame = async (gameId: number, userId: string) => {
  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { players: true },
    });
    if (!game) {
      throw new Error("Game not found");
    }
    if (game.status === "COMPLETED") {
      throw new Error("Game is already completed");
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new Error("User not found");
    }
    if (!game.players.some((player) => player.id === userId)) {
      throw new Error("User is not part of the game");
    }
    if (game.players.length === 1) {
      await prisma.game.delete({
        where: { id: gameId },
      });
      return null;
    } else {
      const updatedGame = await prisma.game.update({
        where: { id: gameId },
        data: {
          players: {
            disconnect: { id: userId },
          },
        },
        include: { players: true },
      });
      const returnedGame = {
        id: updatedGame.id,
        name: updatedGame.name,
        status: updatedGame.status,
        players: updatedGame.players.map((player) => ({
          id: player.id,
          username: player.username,
        })),
      };
      return returnedGame;
    }
  } catch (error) {
    console.error("Error leaving game:", error);
    throw new Error("An error occurred while leaving the game");
  }
};

export const changeGameStatus = async (
  gameId: number,
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED",
) => {
  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });
    if (!game) {
      throw new Error("Game not found");
    }
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: { status },
      include: { players: true },
    });
    const returnedGame = {
      id: updatedGame.id,
      name: updatedGame.name,
      status: updatedGame.status,
      players: updatedGame.players.map((player) => ({
        id: player.id,
        username: player.username,
      })),
    };
    return returnedGame;
  } catch (error) {
    console.error("Error changing game status:", error);
    throw new Error("An error occurred while changing the game status");
  }
};

export const getAllGames = async (req: any, res: any) => {
  try {
    const games = await prisma.game.findMany({ include: { players: true } });
    const returnedGames = games.map((game) => ({
      id: game.id,
      name: game.name,
      status: game.status,
      players: game.players.length,
    }));
    return res
      .status(200)
      .json({ message: "Games fetched successfully", games: returnedGames });
  } catch (error) {
    console.error("Error fetching games:", error);
    return res
      .status(500)
      .json({ message: "An error occurred while fetching games" });
  }
};
