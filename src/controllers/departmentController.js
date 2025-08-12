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

export const createDepartment = async (req, res) => {
    try {
        const { name, shortName } = req.body;
        if (!name || !shortName) {
            return res.status(400).json({ message: "Name and shortName are required" });
        }
        const newDepartment = await prisma.department.create({
            data: { name, shortName }
        });
        return res.status(201).json(newDepartment);
    } catch (error) {
        console.error("Error creating department:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


// GET /api/departments/:id
export const getDepartmentById = async (req, res) => {
    try {
        const { id } = req.params;
        const department = await prisma.department.findUnique({
            where: { id: id },
            include: {
                employees: true,
                students: true,
            }
        });

        if (!department) {
            return res.status(404).json({ message: `Department with ID ${id} not found` });
        }

        return res.status(200).json(department);
    } catch (error) {
        console.error(`Error fetching department with ID ${req.params.id}:`, error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// PUT /api/departments/:id
export const updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, shortName } = req.body;

        if (!name && !shortName) {
            return res.status(400).json({ message: "At least one field (name or shortName) is required to update" });
        }

        const updatedDepartment = await prisma.department.update({
            where: { id: id },
            data: {
                name,
                shortName
            }
        });

        return res.status(200).json(updatedDepartment);
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: `Department with ID ${req.params.id} not found` });
        }
        console.error(`Error updating department with ID ${req.params.id}:`, error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// DELETE /api/departments/:id
export const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.department.delete({
            where: { id: id }
        });

        return res.status(204).send();
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: `Department with ID ${req.params.id} not found` });
        }
        if (error.code === 'P2003') {
            return res.status(409).json({ message: `Cannot delete department. It is still associated with employees or students.` });
        }
        console.error(`Error deleting department with ID ${req.params.id}:`, error);
        return res.status(500).json({ message: "Internal server error" });
    }
};