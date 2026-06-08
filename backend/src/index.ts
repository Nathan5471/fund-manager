import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    credentials: true,
  },
});
app.use(express.json());
app.use(cookieParser());

server.listen(3000, () => {
  console.log;
  ("Server is running on port 3000");
});
