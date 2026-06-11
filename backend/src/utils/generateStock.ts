import { readFileSync } from "fs";
import { Owner } from "../gameTypes";

const generateStock = (
  industry: "Technology" | "Retail" | "Finance" | "Healthcare" | "Energy",
) => {
  const namesFile = `../../names/${industry.toLowerCase()}Names.txt`;
  const names = readFileSync(namesFile, "utf-8").split("\n");
  const name = names[Math.floor(Math.random() * names.length)].trim();
  const volatility = Math.random() * 0.1 + 0.05;
  const baseChange = (Math.random() - 0.5) * 0.02;
  const startingPrice = Math.random() * 100 + 20;
  const priceHistory = new Map<number, number>();
  const purchaseHistory = new Map<number, number>();
  const owners = new Map<string, Owner>();
  const stock = {
    name,
    industry,
    price: startingPrice,
    volatility,
    baseChange,
    priceHistory,
    purchaseHistory,
    owners,
  };
  return stock;
};

export default generateStock;
