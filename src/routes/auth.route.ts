import express from "express";
import {
	activation,
	checkSession,
	forgotPassword,
	login,
	logout,
	register,
	resendActivation,
	resetPassword,
	verificationPassword,
} from "../controllers/auth.controller.js";

const routes = express.Router();

routes.get("/me", checkSession);
routes.post("/register", register);
routes.post("/login", login);
routes.post("/resend-activation", resendActivation);
routes.post("/activation", activation);
routes.post("/forgot-password", forgotPassword);
routes.post("/verification-password", verificationPassword);
routes.post("/reset-password", resetPassword);
routes.post("/logout", logout);

export default routes;
