import express from "express";
import auth from "./auth.route.js";
import users from "./user.route.js";

const routes = express.Router();

routes.use("/auth", auth);
routes.use("/users", users);

export default routes;
