import prisma from "../config/db.js";

// ดึงข้อมูล log ทั้งหมด
export const getAllLogs = async (req, res) => {
  try {
    const { action, role, startDate, endDate, limit = 100 } = req.query;

    const where = {};

    if (action) where.action = action;
    if (role) where.role = role;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const logs = await prisma.log.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: parseInt(limit),
    });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ดึงข้อมูล log ตาม ID
export const getLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await prisma.log.findUnique({
      where: { id },
    });

    if (!log) {
      return res.status(404).json({ error: "ไม่พบข้อมูล log" });
    }

    res.json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// สร้าง log ใหม่
export const createLog = async (req, res) => {
  try {
    const { action, fullname, role, description } = req.body;

    if (!action || !fullname || !role) {
      return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    const newLog = await prisma.log.create({
      data: {
        action,
        fullname,
        role,
        description,
      },
    });

    res.status(201).json(newLog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ลบ log
export const deleteLog = async (req, res) => {
  try {
    const { id } = req.params;

    const existingLog = await prisma.log.findUnique({
      where: { id },
    });

    if (!existingLog) {
      return res.status(404).json({ error: "ไม่พบข้อมูล log" });
    }

    await prisma.log.delete({
      where: { id },
    });

    res.json({ message: "ลบ log เรียบร้อยแล้ว" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ลบ log ทั้งหมดที่เก่ากว่าวันที่กำหนด
export const deleteOldLogs = async (req, res) => {
  try {
    const { beforeDate } = req.body;

    if (!beforeDate) {
      return res.status(400).json({ error: "กรุณาระบุวันที่" });
    }

    // ตรวจสอบว่าผู้ใช้เป็น admin
    if (req.user.userType !== "admin") {
      return res.status(403).json({ error: "ไม่มีสิทธิ์ในการลบ log" });
    }

    const result = await prisma.log.deleteMany({
      where: {
        createdAt: {
          lt: new Date(beforeDate),
        },
      },
    });

    res.json({
      message: "ลบ log เรียบร้อยแล้ว",
      count: result.count,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ดึงสถิติ log
export const getLogStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // นับจำนวน log แยกตาม action
    const actionStats = await prisma.log.groupBy({
      by: ["action"],
      where,
      _count: {
        action: true,
      },
      orderBy: {
        _count: {
          action: "desc",
        },
      },
    });

    // นับจำนวน log แยกตาม role
    const roleStats = await prisma.log.groupBy({
      by: ["role"],
      where,
      _count: {
        role: true,
      },
      orderBy: {
        _count: {
          role: "desc",
        },
      },
    });

    // นับจำนวนทั้งหมด
    const totalLogs = await prisma.log.count({ where });

    res.json({
      totalLogs,
      actionStats: actionStats.map((stat) => ({
        action: stat.action,
        count: stat._count.action,
      })),
      roleStats: roleStats.map((stat) => ({
        role: stat.role,
        count: stat._count.role,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Helper function สำหรับสร้าง log (ใช้ในส่วนอื่นๆ)
export const createLogEntry = async (
  action,
  fullname,
  role,
  description = null
) => {
  try {
    await prisma.log.create({
      data: {
        action,
        fullname,
        role,
        description,
      },
    });
  } catch (error) {
    console.error("Error creating log:", error);
  }
};
