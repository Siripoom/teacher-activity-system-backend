import prisma from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ลงทะเบียนผู้ใช้ใหม่
export const register = async (req, res) => {
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

    // ตรวจสอบ departmentId ถ้ามี
    if (departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });
      if (!department) {
        return res.status(404).json({ error: "ไม่พบแผนกที่ระบุ" });
      }
    }

    // Hash password: ใช้ password ที่ส่งมา ถ้าไม่มีให้ใช้เบอร์โทรเป็น password เริ่มต้น
    let hashedPassword = null;
    const defaultPassword = password || phone;

    if (defaultPassword) {
      hashedPassword = await bcrypt.hash(defaultPassword, 10);
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
      },
      include: {
        department: true,
      },
    });

    // ไม่ส่ง password กลับไป
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      message: "ลงทะเบียนสำเร็จ",
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// เข้าสู่ระบบ
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "กรุณากรอกอีเมลและรหัสผ่าน" });
    }

    // ค้นหาผู้ใช้
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        department: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    // ตรวจสอบสถานะผู้ใช้
    if (user.status === "deleted" || user.status === "inactive") {
      return res.status(403).json({ error: "บัญชีถูกระงับหรือปิดการใช้งาน" });
    }

    // ตรวจสอบ password (ถ้าเป็นนักศึกษาอาจไม่มี password)
    if (!user.password) {
      return res
        .status(401)
        .json({ error: "ไม่สามารถเข้าสู่ระบบด้วยอีเมลนี้ได้" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    // สร้าง JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        userType: user.userType,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    // ไม่ส่ง password กลับไป
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: "เข้าสู่ระบบสำเร็จ",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ดึงข้อมูลผู้ใช้ปัจจุบัน (จาก token)
export const getMe = async (req, res) => {
  try {
    const userId = req.user.id; // มาจาก middleware

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "ไม่พบข้อมูลผู้ใช้" });
    }

    // ไม่ส่ง password กลับไป
    const { password: _, ...userWithoutPassword } = user;

    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// เปลี่ยนรหัสผ่าน
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id; // มาจาก middleware
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      return res.status(400).json({ error: "ไม่สามารถเปลี่ยนรหัสผ่านได้" });
    }

    // ตรวจสอบรหัสผ่านเดิม
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "รหัสผ่านเดิมไม่ถูกต้อง" });
    }

    // Hash รหัสผ่านใหม่
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    res.json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// รีเซ็ตรหัสผ่าน (สำหรับ admin)
export const resetPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    // ตรวจสอบว่าผู้ใช้ที่ทำการรีเซ็ตเป็น admin
    if (req.user.userType !== "admin") {
      return res.status(403).json({ error: "ไม่มีสิทธิ์ในการรีเซ็ตรหัสผ่าน" });
    }

    if (!newPassword) {
      return res.status(400).json({ error: "กรุณากรอกรหัสผ่านใหม่" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "ไม่พบข้อมูลผู้ใช้" });
    }

    // Hash รหัสผ่านใหม่
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    res.json({ message: "รีเซ็ตรหัสผ่านสำเร็จ" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ออกจากระบบ (client-side จะลบ token)
export const logout = async (req, res) => {
  try {
    res.json({ message: "ออกจากระบบสำเร็จ" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
