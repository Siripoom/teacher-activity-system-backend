import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getAllDepartments = async (req, res) => {
    try {
        const departments = await prisma.department.findMany({
            include: {
                employees: true,
            }
        });

        if (!departments || departments.length === 0) {
            return res.status(404).json({ message: "No departments found" });
        }

        // Return the list of departments
        return res.status(200).json(departments);
    } catch (error) {
        console.error("Error fetching departments:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const createDepartment = (req, res) => {
    const { name, shortName } = req.body;

    prisma.department.create({
        data: {
            name,
            shortName
        }
    })
        .then(department => {
            return res.status(201).json(department);
        })
        .catch(error => {
            console.error("Error creating department:", error);
            return res.status(500).json({ message: "Internal server error" });
        });
}