import express from "express";
import authMiddleware from "../middleware/middleware.js";
import { getAllEmployees } from "../controllers/employeeControllers.js";
import { createDepartment } from "../controllers/departmentController.js";


const route = express.Router()
// route.use(authMiddleware)

route.get("/", getAllEmployees)
route.post("/", createDepartment)

export default route;

