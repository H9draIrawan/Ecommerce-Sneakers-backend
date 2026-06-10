import express from "express";
import {
	getAllUsers,
	getUserbyId,
	updateUserbyId,
} from "../controllers/user.controller";

const router = express.Router();

router.get("/", getAllUsers);
router.get("/:id", getUserbyId);
router.put("/:id", updateUserbyId);

export default router;
