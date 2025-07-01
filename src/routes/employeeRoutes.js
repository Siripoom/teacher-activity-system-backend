import express from "express";
import authMiddleware from "../middleware/middleware.js";
import { getAllEmployees } from "../controllers/employeeControllers.js";


const route = express.Router()
// route.use(authMiddleware)

route.get("/", getAllEmployees)

export default route;

