import { type Request, type Response } from "express";
import { prisma } from "../config/prisma";

async function getAllUsers(_req: Request, res: Response) {
	try {
		const users = await prisma.user.findMany();

		return res.status(200).json(users);
	} catch (error) {
		if (error instanceof Error) {
			return res.status(500).json({ message: error.message });
		}
	}
}

async function getUserbyId(req: Request<{ id: string }>, res: Response) {
	try {
		const { id } = req.params;
		const user = await prisma.user.findUnique({
			where: {
				id,
			},
		});

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		return res.status(200).json(user);
	} catch (error) {
		if (error instanceof Error) {
			return res.status(500).json({ message: error.message });
		}
	}
}

async function updateUserbyId(req: Request<{ id: string }>, res: Response) {
	try {
		const { id } = req.params;
		const { fullname, role } = req.body;
		const user = await prisma.user.update({
			where: {
				id,
			},
			data: {
				fullname,
				role,
			},
		});

		return res.status(200).json({
			message: "User updated successfully",
			user,
		});
	} catch (error) {
		if (error instanceof Error) {
			return res.status(500).json({ message: error.message });
		}
	}
}

export { getAllUsers, getUserbyId, updateUserbyId };
