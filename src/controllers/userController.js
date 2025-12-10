import prisma from "../config/db.js";
import bcrypt from "bcryptjs";

// ดึงข้อมูลผู้ใช้ทั้งหมด
// รองรับ filter: userType, status, majorId
export const getAllUsers = async (req, res) => {
  try {
    const { userType, status, majorId } = req.query;

    const where = {};
    if (userType) where.userType = userType;
    // ถ้าไม่ระบุ status ให้แสดงเฉพาะ active (ไม่แสดง deleted)
    if (status) {
      where.status = status;
    } else {
      where.status = "active";
    }
    if (majorId) where.majorId = majorId;

    const users = await prisma.user.findMany({
      where,
      include: {
        major: true,
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
// รวมความสัมพันธ์: major, activities (ที่รับผิดชอบ), attendances
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        major: true,
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
      majorId,
      userType,
      birthday,
      profilePic,
    } = req.body;
    let level = null;
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!fullname || !email || !userType) {
      return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    // ตรวจสอบ email ซ้ำ
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(400).json({ error: "อีเมลนี้ถูกใช้งานแล้ว" });
    }

    // ตรวจสอบ studentId ซ้ำ (ถ้ามี) และคำนวนระดับชั้นจาก 2 หลักหน้า
    if (studentId) {
      const existingStudent = await prisma.user.findUnique({
        where: { studentId },
      });
      if (existingStudent) {
        return res.status(400).json({ error: "รหัสนักศึกษานี้ถูกใช้งานแล้ว" });
      }

      // เลข 2 หลักหน้าเป็นปีการศึกษา ตัวอย่าง: '67' => 2567
      try {
        const currentYear = new Date().getFullYear(); // ค.ศ.
        const yearStr = studentId.substring(0, 2);
        const entryYear = 2500 + parseInt(yearStr, 10); // พ.ศ. เช่น 2567
        const currentBuddhist = parseInt(currentYear, 10) + 543; // แปลงเป็น พ.ศ.

        // สูตรที่ผู้ใช้ระบุ: ปีที่เข้าศึกษา - (ปีปัจจุบัน + 543) + 1
        let computed = currentBuddhist - entryYear + 1;
        computed = parseInt(computed, 10);
        // เก็บเป็นสตริงตาม schema (level เป็น String?)
        level = String(computed);
      } catch (err) {
        level = null;
      }
    }

    // ถ้ามี majorId ให้ตรวจสอบว่า major มีอยู่จริง
    if (majorId) {
      const major = await prisma.major.findUnique({ where: { id: majorId } });
      if (!major) return res.status(404).json({ error: "Major not found" });
    }

    // ถ้ามี departmentId ให้ตรวจสอบว่า department มีอยู่
    if (departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });
      if (!department)
        return res.status(404).json({ error: "Department not found" });
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
        majorId,
        userType,
        birthday,
        profilePic,
        level,
      },
      include: {
        major: true,
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
      majorId,
      level,
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

    // สร้าง updateData แบบ partial: เฉพาะ field ที่ส่งมาเท่านั้น
    const updateData = {};

    // ตรวจสอบ email ซ้ำ (เฉพาะกรณีอัปเดต)
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists)
        return res.status(400).json({ error: "อีเมลนี้ถูกใช้งานแล้ว" });
    }

    // ตรวจสอบ studentId ซ้ำ (เฉพาะกรณีอัปเดต) และคำนวน level ถ้ามีการเปลี่ยน
    if (studentId && studentId !== existingUser.studentId) {
      const studentIdExists = await prisma.user.findUnique({
        where: { studentId },
      });
      if (studentIdExists)
        return res.status(400).json({ error: "รหัสนักศึกษานี้ถูกใช้งานแล้ว" });

      try {
        const currentYear = new Date().getFullYear();
        const yearStr = studentId.substring(0, 2);
        const entryYear = 2500 + parseInt(yearStr, 10);
        const currentBuddhist = currentYear + 543;
        let computed = entryYear - currentBuddhist + 1;
        computed = parseInt(computed, 10);
        updateData.level = String(computed);
      } catch (err) {
        // If parsing fails, don't set level
      }
    }

    // ถ้ามี majorId ให้ตรวจสอบว่า major มีอยู่
    if (majorId && majorId !== existingUser.majorId) {
      const major = await prisma.major.findUnique({ where: { id: majorId } });
      if (!major) return res.status(404).json({ error: "Major not found" });
    }

    // ถ้ามี departmentId ให้ตรวจสอบว่า department มีอยู่
    if (departmentId && departmentId !== existingUser.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });
      if (!department)
        return res.status(404).json({ error: "Department not found" });
    }

    if (studentId !== undefined) updateData.studentId = studentId;
    if (fullname !== undefined) updateData.fullname = fullname;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (majorId !== undefined) updateData.majorId = majorId;
    if (level !== undefined) updateData.level = level;
    if (userType !== undefined) updateData.userType = userType;
    if (birthday !== undefined) updateData.birthday = birthday;
    if (profilePic !== undefined) updateData.profilePic = profilePic;
    if (status !== undefined) updateData.status = status;

    // Hash password ใหม่ถ้ามีการเปลี่ยน
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Hash password ใหม่ถ้ามีการเปลี่ยน
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { major: true, department: true },
    });
    return res.json(updatedUser);
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
      data: { status: "deleted" },
      include: { major: true },
    });

    return res.json({ message: "ลบผู้ใช้เรียบร้อยแล้ว", user: deletedUser });
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
