import prisma from "../prisma/client";
import jwt from "jsonwebtoken";

const authenticate = async (token: string) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  try {
    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });
    if (!user) {
      throw new Error("User not found");
    }
    return { id: user.id, username: user.username };
  } catch (error) {
    console.error("Authentication error:", error);
    throw new Error("Unauthorized");
  }
};

export default authenticate;
