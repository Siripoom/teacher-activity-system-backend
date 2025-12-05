import prisma from "../config/db.js";

// ดึงข้อมูลแผนกทั้งหมด
export const getAllDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        _count: {
          select: {
            users: true,
            activities: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ดึงข้อมูลแผนกตาม ID
export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            studentId: true,
            fullname: true,
            email: true,
            userType: true,
            status: true,
          },
        },
        activities: {
          include: {
            responsible: {
              select: {
                id: true,
                fullname: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!department) {
      return res.status(404).json({ error: "ไม่พบข้อมูลแผนก" });
    }

    res.json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// สร้างแผนกใหม่
export const createDepartment = async (req, res) => {
  try {
    const { name, major } = req.body;

    if (!name || !major) {
      return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    // ตรวจสอบชื่อแผนกซ้ำ
    const existingName = await prisma.department.findUnique({
      where: { name },
    });

    if (existingName) {
      return res.status(400).json({ error: "ชื่อแผนกนี้มีอยู่แล้ว" });
    }

    // ตรวจสอบชื่อสาขาซ้ำ
    const existingMajor = await prisma.department.findUnique({
      where: { major },
    });

    if (existingMajor) {
      return res.status(400).json({ error: "ชื่อสาขานี้มีอยู่แล้ว" });
    }

    const newDepartment = await prisma.department.create({
      data: {
        name,
        major,
      },
    });

    res.status(201).json(newDepartment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// อัปเดตข้อมูลแผนก
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, major } = req.body;

    const existingDepartment = await prisma.department.findUnique({
      where: { id },
    });

    if (!existingDepartment) {
      return res.status(404).json({ error: "ไม่พบข้อมูลแผนก" });
    }

    // ตรวจสอบชื่อแผนกซ้ำ
    if (name && name !== existingDepartment.name) {
      const nameExists = await prisma.department.findUnique({
        where: { name },
      });

      if (nameExists) {
        return res.status(400).json({ error: "ชื่อแผนกนี้มีอยู่แล้ว" });
      }
    }

    // ตรวจสอบชื่อสาขาซ้ำ
    if (major && major !== existingDepartment.major) {
      const majorExists = await prisma.department.findUnique({
        where: { major },
      });

      if (majorExists) {
        return res.status(400).json({ error: "ชื่อสาขานี้มีอยู่แล้ว" });
      }
    }

    const updatedDepartment = await prisma.department.update({
      where: { id },
      data: {
        name,
        major,
      },
    });

    res.json(updatedDepartment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ลบแผนก
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const existingDepartment = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            activities: true,
          },
        },
      },
    });

    if (!existingDepartment) {
      return res.status(404).json({ error: "ไม่พบข้อมูลแผนก" });
    }

    // ตรวจสอบว่ามีผู้ใช้หรือกิจกรรมในแผนกหรือไม่
    if (existingDepartment._count.users > 0) {
      return res.status(400).json({
        error: "ไม่สามารถลบแผนกที่มีผู้ใช้อยู่ได้",
        usersCount: existingDepartment._count.users,
      });
    }

    if (existingDepartment._count.activities > 0) {
      return res.status(400).json({
        error: "ไม่สามารถลบแผนกที่มีกิจกรรมอยู่ได้",
        activitiesCount: existingDepartment._count.activities,
      });
    }

    await prisma.department.delete({
      where: { id },
    });

    res.json({ message: "ลบแผนกเรียบร้อยแล้ว" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ดึงสถิติของแผนก
export const getDepartmentStats = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        users: {
          where: {
            status: "active",
          },
        },
        activities: {
          where: {
            status: {
              in: ["planned", "inprogress"],
            },
          },
        },
      },
    });

    if (!department) {
      return res.status(404).json({ error: "ไม่พบข้อมูลแผนก" });
    }

    const stats = {
      totalUsers: department.users.length,
      totalEmployees: department.users.filter(
        (u) => u.userType === "admin" || u.userType === "teacher"
      ).length,
      totalStudents: department.users.filter((u) => u.userType === "student")
        .length,
      activeActivities: department.activities.length,
    };

    res.json({
      department: {
        id: department.id,
        name: department.name,
        major: department.major,
      },
      stats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
