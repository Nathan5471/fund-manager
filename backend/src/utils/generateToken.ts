import jwt from "jsonwebtoken";

const generateToken = (userId: string) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined in environment variables.");
  }

  const token = jwt.sign({ userId }, jwtSecret, { expiresIn: "90d" });
  return token;
};

export default generateToken;
