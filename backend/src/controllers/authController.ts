import bcrypt from "bcrypt";
import prisma from "../prisma/client";
import generateToken from "../utils/generateToken";

export const signup = async (req: any, res: any) => {
  const { username, password } = req.body as {
    username: string;
    password: string;
  };

  try {
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
      },
    });
    return res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error("Error during signup:", error);
    return res.status(500).json({ message: "Error creating user" });
  }
};

export const login = async (req: any, res: any) => {
  const { username, password } = req.body as {
    username: string;
    password: string;
  };

  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });
    if (!user) {
      return res.status(400).json({ message: "Invalid username or password" });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: "Invalid username or password" });
    }
    const token = generateToken(user.id);
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    });
    return res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({ message: "Error logging in" });
  }
};
