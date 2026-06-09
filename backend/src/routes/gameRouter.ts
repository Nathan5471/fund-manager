import { Router } from "express";
import { createGame, getAllGames } from "../controllers/gameController";
import authenticate from "../middleware/authenticate";

const router = Router();

router.post("/create", authenticate, async (req: any, res: any) => {
  const { name } = req.body as { name: string };

  if (!name) {
    return res.status(400).json({ message: "Game name is required." });
  }

  await createGame(req, res);
});

// Join, Leave, Start, and End will be handled by the socket

router.get("/all", authenticate, getAllGames);

export default router;
