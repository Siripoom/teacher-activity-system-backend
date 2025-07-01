import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();  

export const getAllEmployees = async (req , res) => {
    try {
        const employees = await prisma.employee.findMany({
            include: {
                department: true,
            }
        });

        if (!employees || employees.length === 0) {
            return res.status(404).json({ message: "No employees found" });
        }
         // Return the list of employees
        return res.status(200).json(employees);
    } catch (error) {
        console.error("Error fetching employees:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}   

export const createEmployee = async (req, res) => {
    try {
        const { fullname, email, password, phone, departmentId , role } = req.body;

        const hashPassword = await bcrypt.hash(password, 10);
        const employee = await prisma.employee.create({
            data: {
                fullname,
                email,
                hashPassword,
                phone,
                departmentId,
                role
            }
        });
        if(!employee){
            return res.status(400).json({ message: "Failed to create employee" });
        }
        return res.status(201).json(employee);
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
}



