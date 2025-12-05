import { PrismaClient } from "@prisma/client";
// import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dayjs from "dayjs";

const prisma = new PrismaClient();

export const loginStudent = async (req, res) => {
  const { studentId, password } = req.body;

  try {
    // ค้นหาผู้ใช้ตามชื่อผู้ใช้
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { department: true },
    });

    if (!student) {
      return res.status(404).json({ message: "User not found" });
    }
    // console.log("password = ",password ," || birthday = ",dayjs(student.birthdate).add(543, 'year').format('DD-MM-YYYY'));
    if (
      dayjs(student.birthday).format("DD-MM-YYYY") !==
      dayjs(password).format("DD-MM-YYYY")
    ) {
      console.log(dayjs(student.birthday).format("DD-MM-YYYY"));
      return res.status(401).json({ message: "Invalid password" });
    }

    // สร้าง JWT token
    const token = jwt.sign(
      {
        id: student.id,
        fullname: student.fullname,
        role: "student",
        department: student.department.name,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "3h",
      }
    );

    return res.status(200).json({ token });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
