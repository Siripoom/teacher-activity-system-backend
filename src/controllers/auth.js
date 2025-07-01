import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

const loginStudent = async (req, res) => {
    const { username, password } = req.body;

    try {
        // ค้นหาผู้ใช้ตามชื่อผู้ใช้
        const student = await prisma.student.findUnique({
            where: { id },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // ตรวจสอบรหัสผ่าน
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid password" });
        }

        // สร้าง JWT token
        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
            expiresIn: '1h',
        });

        return res.status(200).json({ token });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}