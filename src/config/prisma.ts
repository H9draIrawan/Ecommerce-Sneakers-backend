import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import redis from "redis";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
const clientRedis = redis.createClient();

try {
	prisma.$connect();
	clientRedis.connect();
	console.log("Database connected");
} catch (error) {
	console.log(error);
}

export { clientRedis, prisma };
