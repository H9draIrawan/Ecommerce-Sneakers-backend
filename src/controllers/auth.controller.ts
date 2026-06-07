import bcrypt from "bcrypt";
import crypto from "crypto";
import { type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { Resend } from "resend";
import { clientRedis, prisma } from "../config/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

const createCookie = (user: any, res: Response) => {
	const session = jwt.sign(user, process.env.JWT_SECRET!, {
		expiresIn: "3m",
	});
	res.cookie("session", session, {
		maxAge: 7 * 24 * 60 * 60 * 1000,
		httpOnly: true,
		secure: true,
		sameSite: "lax",
	});
};

async function register(req: Request, res: Response) {
	try {
		const { email, fullname, username, password, role } = req.body;
		if (!email || !fullname || !username || !password || !role) {
			return res.status(400).json({ message: "All fields are required" });
		}

		await prisma.user
			.findUnique({
				where: {
					email,
				},
			})
			.then(() => {
				return res.status(400).json({ message: "User already used" });
			});

		await prisma.user
			.findUnique({
				where: {
					username,
				},
			})
			.then(() => {
				return res.status(400).json({ message: "Username already used" });
			});

		const hashPassword = await bcrypt.hash(password, 10);

		const user = await prisma.user.create({
			data: {
				email,
				fullname,
				username,
				password: hashPassword,
				role,
			},
		});

		if (!user) {
			return res.status(400).json({ message: "User already exists" });
		}

		return res.status(201).json({
			message: "User registered successfully",
			user: {
				email: user.email,
				fullname: user.fullname,
				username: user.username,
				role: user.role,
			},
		});
	} catch (error) {
		if (error instanceof Error) {
			return res.status(500).json({ message: error.message });
		}
	}
}

async function login(req: Request, res: Response) {
	try {
		const { email, password, rememberMe } = req.body;
		if (!email || !password) {
			return res.status(400).json({ message: "All fields are required" });
		}

		const user = await prisma.user.findUnique({
			where: {
				email,
			},
		});

		if (!user) {
			return res.status(404).json({ message: "Email not registered" });
		}

		const isPasswordValid = await bcrypt.compare(password, user.password);

		if (!isPasswordValid) {
			return res.status(401).json({ message: "Invalid password" });
		}

		if (user.status !== "active") {
			return res.status(403).json({
				message: "Account is not active.",
			});
		}

		if (rememberMe) {
			createCookie(user, res);
		}

		return res.status(200).json({
			message: "Login successful",
			user: {
				email: user.email,
				fullname: user.fullname,
				username: user.username,
				role: user.role,
			},
		});
	} catch (error) {
		if (error instanceof Error) {
			return res.status(500).json({ message: error.message });
		}
	}
}

async function resendActivation(req: Request, res: Response) {
	try {
		const { email } = req.body;
		const user = await prisma.user.findUnique({
			where: {
				email: email,
			},
		});

		if (!user) {
			return res.status(404).json({
				message: "Email isn't registered",
			});
		}

		if (user.status !== "pending") {
			return res.status(403).json({
				message: "Account has already active",
			});
		}

		const otp = crypto.randomBytes(32).toString("hex").slice(0, 6);
		await resend.emails.send({
			from: "Acme <onboarding@resend.dev>",
			to: email,
			template: {
				id: "account-permission",
				variables: {
					permission: "Activation",
					fullname: user.fullname,
					otp_code: otp,
				},
			},
		});
		clientRedis.setEx(`activation:${otp}`, 180, user.id);

		return res.status(200).json({
			message: "OTP sent successfully",
		});
	} catch (error) {
		if (error instanceof Error) {
			return res.status(500).json({ message: error.message });
		}
	}
}

async function activation(req: Request, res: Response) {
	try {
		const { otp } = req.query;
		const userId = await clientRedis.get(`activation:${otp}`);

		if (!userId) {
			return res.status(404).json({
				message: "OTP not found",
			});
		}

		await prisma.user.update({
			where: {
				id: userId,
			},
			data: {
				status: "active",
			},
		});

		return res.status(200).json({
			message: "Account activated successfully",
		});
	} catch (error) {
		if (error instanceof Error) {
			return res.status(500).json({ message: error.message });
		}
	}
}

async function checkSession(req: Request, res: Response) {
	try {
		const cookie = req.cookies.session;

		if (!cookie) {
			return res.status(401).json({
				message: "Unauthorized",
			});
		}

		const user = jwt.verify(cookie, process.env.JWT_SECRET!);
		return res.status(200).json({
			message: "Authorized",
			user: user,
		});
	} catch (error) {
		if (error instanceof Error) {
			return res.status(500).json({ message: error.message });
		}
	}
}

async function logout(req: Request, res: Response) {
	try {
		res.clearCookie("session");
		return res.status(200).json({
			message: "Logout successful",
		});
	} catch (error) {
		if (error instanceof Error) {
			return res.status(500).json({ message: error.message });
		}
	}
}

async function forgotPassword(req: Request, res: Response) {
	try {
		const { email } = req.body;

		const user = await prisma.user.findUnique({
			where: {
				email: email,
			},
		});

		if (!user) {
			return res.status(404).json({
				message: "Email not registered",
			});
		}

		const otp = crypto.randomBytes(32).toString("hex").slice(0, 6);
		await resend.emails.send({
			from: "Acme <onboarding@resend.dev>",
			to: email,
			template: {
				id: "account-permission",
				variables: {
					permission: "Reset Password",
					fullname: user.fullname,
					otp_code: otp,
				},
			},
		});
		clientRedis.setEx(`reset:${otp}`, 180, user.id);

		return res.status(200).json({
			message: "OTP sent successfully",
		});
	} catch (error) {
		if (error instanceof Error) {
			return res.status(500).json({ message: error.message });
		}
	}
}

async function verificationPassword(req: Request, res: Response) {
	try {
		const { otp } = req.query;
		const userId = await clientRedis.get(`reset:${otp}`);

		if (!userId) {
			return res.status(404).json({
				message: "OTP not found",
			});
		}

		return res.status(200).json({
			message: "Authorized",
			user: userId,
		});
	} catch (error) {
		if (error instanceof Error) {
			return res.status(500).json({ message: error.message });
		}
	}
}

async function resetPassword(req: Request, res: Response) {
	try {
		const { userId, password, confirmPassword } = req.body;

		if (!userId || !password || !confirmPassword) {
			return res.status(400).json({ message: "All fields are required" });
		}

		if (password !== confirmPassword) {
			return res.status(400).json({ message: "Passwords do not match" });
		}

		const user = await prisma.user.findUnique({
			where: {
				id: userId,
			},
		});

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		await prisma.user.update({
			where: {
				id: userId,
			},
			data: {
				password: hashedPassword,
			},
		});

		return res.status(200).json({
			message: "Password reset successfully",
		});
	} catch (error) {
		if (error instanceof Error) {
			return res.status(500).json({ message: error.message });
		}
	}
}

export {
	activation,
	checkSession,
	forgotPassword,
	login,
	logout,
	register,
	resendActivation,
	resetPassword,
	verificationPassword,
};
