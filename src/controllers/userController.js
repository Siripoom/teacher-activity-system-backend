import prisma from "../config/db.js";
import bcrypt from "bcryptjs";

// ดึงข้อมูลผู้ใช้ทั้งหมด
export const getAllUsers = async (req, res) => {
  try {
    const { userType, status, departmentId } = req.query;

    const where = {};
    if (userType) where.userType = userType;
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;

    const users = await prisma.user.findMany({
      where,
      include: {
        department: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ดึงข้อมูลผู้ใช้ตาม ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        department: true,
        activities: {
          include: {
            department: true,
          },
        },
        attendances: {
          include: {
            activity: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "ไม่พบข้อมูลผู้ใช้" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// สร้างผู้ใช้ใหม่
export const createUser = async (req, res) => {
  try {
    const {
      studentId,
      fullname,
      email,
      password,
      phone,
      departmentId,
      userType,
      birthday,
      profilePic,
    } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!fullname || !email || !userType) {
      return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    // ตรวจสอบ email ซ้ำ
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "อีเมลนี้ถูกใช้งานแล้ว" });
    }

    // ตรวจสอบ studentId ซ้ำ (ถ้ามี)
    if (studentId) {
      const existingStudent = await prisma.user.findUnique({
        where: { studentId },
      });

      if (existingStudent) {
        return res.status(400).json({ error: "รหัสนักศึกษานี้ถูกใช้งานแล้ว" });
      }
    }

    // Hash password ถ้ามี (สำหรับพนักงาน)
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const newUser = await prisma.user.create({
      data: {
        studentId,
        fullname,
        email,
        password: hashedPassword,
        phone,
        departmentId,
        userType,
        birthday,
        profilePic,
      },
      include: {
        department: true,
      },
    });

    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// อัปเดตข้อมูลผู้ใช้
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      studentId,
      fullname,
      email,
      password,
      phone,
      departmentId,
      userType,
      birthday,
      profilePic,
      status,
    } = req.body;

    // ตรวจสอบว่าผู้ใช้มีอยู่
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "ไม่พบข้อมูลผู้ใช้" });
    }

    // ตรวจสอบ email ซ้ำ
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return res.status(400).json({ error: "อีเมลนี้ถูกใช้งานแล้ว" });
      }
    }

    // ตรวจสอบ studentId ซ้ำ
    if (studentId && studentId !== existingUser.studentId) {
      const studentIdExists = await prisma.user.findUnique({
        where: { studentId },
      });

      if (studentIdExists) {
        return res.status(400).json({ error: "รหัสนักศึกษานี้ถูกใช้งานแล้ว" });
      }
    }

    const updateData = {
      studentId,
      fullname,
      email,
      phone,
      departmentId,
      userType,
      birthday,
      profilePic,
      status,
    };

    // Hash password ใหม่ถ้ามีการเปลี่ยน
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        department: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ลบผู้ใช้ (soft delete)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "ไม่พบข้อมูลผู้ใช้" });
    }

    // Soft delete โดยการเปลี่ยน status
    const deletedUser = await prisma.user.update({
      where: { id },
      data: {
        status: "deleted",
      },
    });

    res.json({ message: "ลบผู้ใช้เรียบร้อยแล้ว", user: deletedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ลบผู้ใช้ถาวร (hard delete)
export const permanentDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "ไม่พบข้อมูลผู้ใช้" });
    }

    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: "ลบผู้ใช้ถาวรเรียบร้อยแล้ว" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ดึงข้อมูลพนักงานทั้งหมด (admin + teacher)
export const getAllEmployees = async (req, res) => {
  try {
    const { status, departmentId } = req.query;

    const where = {
      userType: {
        in: ["admin", "teacher"],
      },
    };

    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;

    const employees = await prisma.user.findMany({
      where,
      include: {
        department: true,
        activities: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ดึงข้อมูลนักศึกษาทั้งหมด
export const getAllStudents = async (req, res) => {
  try {
    const { status, departmentId } = req.query;

    const where = {
      userType: "student",
    };

    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;

    const students = await prisma.user.findMany({
      where,
      include: {
        department: true,
        attendances: {
          include: {
            activity: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
