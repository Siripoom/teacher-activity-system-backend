import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

const comparePassword = async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
};


// POST /api/employees -> สร้าง Employee ใหม่ (Register)
export const createEmployee = async (req, res) => {
    try {
        const { fullname, email, password, phone, departmentId, role } = req.body;
        const hashedPassword = await hashPassword(password);

        const newEmployee = await prisma.employee.create({
            data: {
                fullname,
                email,
                password: hashedPassword,
                phone,
                departmentId,
                role: role || 'teacher',
            },
            select: {
                id: true, fullname: true, email: true, phone: true, role: true, departmentId: true, createdAt: true, updatedAt: true
            }
        });

        res.status(201).json(newEmployee);
    } catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            return res.status(409).json({ message: 'This email is already in use.' });
        }
        console.error("Error creating employee:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/employees -> ดึง Employee ทั้งหมด
export const getAllEmployees = async (req, res) => {
    try {
        const employees = await prisma.employee.findMany({
            select: {
                id: true, fullname: true, email: true, phone: true, role: true, departmentId: true, createdAt: true, updatedAt: true,
                department: {
                    select: { id: true, name: true, shortName: true }
                }
            }
        });

        if (!employees || employees.length === 0) {
            return res.status(404).json({ message: "No employees found" });
        }
        res.status(200).json(employees);
    } catch (error) {
        console.error("Error fetching employees:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/employees/:id -> ดึง Employee ตาม ID
export const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await prisma.employee.findUnique({
            where: { id: id },
            select: {
                id: true, fullname: true, email: true, phone: true, role: true, departmentId: true, createdAt: true, updatedAt: true,
                department: {
                    select: { id: true, name: true, shortName: true }
                }
            }
        });

        if (!employee) {
            return res.status(404).json({ message: `Employee with ID ${id} not found` });
        }
        res.status(200).json(employee);
    } catch (error) {
        console.error(`Error fetching employee with ID ${id}:`, error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// PUT /api/employees/:id -> อัปเดต Employee
export const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullname, email, password, phone, departmentId, role } = req.body;

        let updateData = { fullname, email, phone, departmentId, role };

        if (password) {
            updateData.password = await hashPassword(password);
        }

        const updatedEmployee = await prisma.employee.update({
            where: { id: id },
            data: updateData,
            select: {
                id: true, fullname: true, email: true, phone: true, role: true, departmentId: true, createdAt: true, updatedAt: true,
                department: {
                    select: { id: true, name: true, shortName: true }
                }
            }
        });

        res.status(200).json(updatedEmployee);
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: `Employee with ID ${id} not found` });
        }

        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            return res.status(409).json({ message: 'This email is already in use by another employee.' });
        }
        console.error(`Error updating employee with ID ${id}:`, error);
        res.status(500).json({ message: "Internal server error" });
    }
};


// DELETE /api/employees/:id -> ลบ Employee
export const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const employeeToDelete = await prisma.employee.findUnique({
            where: { id: id },
        });

        if (!employeeToDelete) {
            return res.status(404).json({ message: `Employee with ID ${id} not found.` });
        }

        await prisma.employee.delete({
            where: { id: id }
        });

        return res.status(200).json({
            message: `Successfully deleted employee '${employeeToDelete.fullname}' (ID: ${id}).`
        });

    } catch (error) {
        if (error.code === 'P2003') {
            return res.status(409).json({
                message: `Cannot delete employee. It is still associated with existing activities or records.`
            });
        }
        if (error.code === 'P2025') {
            return res.status(404).json({ message: `Employee with ID ${req.params.id} not found.` });
        }

        console.error(`Error deleting employee with ID ${req.params.id}:`, error);
        return res.status(500).json({ message: "Internal server error" });
    }
};