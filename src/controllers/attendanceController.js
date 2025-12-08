import prisma from "../config/db.js";

const ACTIVE_STATUSES_FOR_COUNT = ["joined", "accepted", "completed"];

// ดึงข้อมูลการเข้าร่วมกิจกรรมทั้งหมด
export const getAllAttendances = async (req, res) => {
  try {
    const { status, activityId, userId } = req.query;

    const where = {};
    if (status) where.status = status;
    if (activityId) where.activityId = activityId;
    if (userId) where.userId = userId;

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            studentId: true,
            fullname: true,
            email: true,
            phone: true,
            department: true,
          },
        },
        activity: {
          include: {
            department: true,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(attendances);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ดึงข้อมูลการเข้าร่วมกิจกรรมตาม ID
export const getAttendanceById = async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await prisma.attendance.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            studentId: true,
            fullname: true,
            email: true,
            phone: true,
            department: true,
          },
        },
        activity: {
          include: {
            department: true,
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

    if (!attendance) {
      return res.status(404).json({ error: "ไม่พบข้อมูลการเข้าร่วมกิจกรรม" });
    }

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// สร้างการเข้าร่วมกิจกรรม
export const createAttendance = async (req, res) => {
  try {
    const { userId, activityId, reason, status } = req.body;

    if (!userId || !activityId) {
      return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    // ตรวจสอบว่าผู้ใช้เป็นนักศึกษา
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.userType !== "student") {
      return res
        .status(400)
        .json({ error: "ผู้เข้าร่วมกิจกรรมต้องเป็นนักศึกษาเท่านั้น" });
    }

    // ตรวจสอบว่ากิจกรรมมีอยู่จริง
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      return res.status(404).json({ error: "ไม่พบข้อมูลกิจกรรม" });
    }

    // ตรวจสอบว่าลงทะเบียนซ้ำหรือไม่
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        userId,
        activityId,
      },
    });

    if (existingAttendance) {
      return res.status(400).json({ error: "ลงทะเบียนกิจกรรมนี้แล้ว" });
    }

    const newAttendance = await prisma.attendance.create({
      data: {
        userId,
        activityId,
        reason,
        status: status || "joined",
      },
      include: {
        user: {
          select: {
            id: true,
            studentId: true,
            fullname: true,
            email: true,
          },
        },
        activity: {
          include: {
            department: true,
          },
        },
      },
    });

    // อัปเดตจำนวนผู้เข้าร่วมในกิจกรรม
    const attendanceCount = await prisma.attendance.count({
      where: {
        activityId,
        status: {
          in: ACTIVE_STATUSES_FOR_COUNT,
        },
      },
    });

    await prisma.activity.update({
      where: { id: activityId },
      data: {
        peopleCount: attendanceCount,
      },
    });

    res.status(201).json(newAttendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// อัปเดตข้อมูลการเข้าร่วมกิจกรรม
export const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, status } = req.body;

    const existingAttendance = await prisma.attendance.findUnique({
      where: { id },
    });

    if (!existingAttendance) {
      return res.status(404).json({ error: "ไม่พบข้อมูลการเข้าร่วมกิจกรรม" });
    }

    const updatedAttendance = await prisma.attendance.update({
      where: { id },
      data: {
        reason,
        status,
      },
      include: {
        user: {
          select: {
            id: true,
            studentId: true,
            fullname: true,
            email: true,
          },
        },
        activity: {
          include: {
            department: true,
          },
        },
      },
    });

    // อัปเดตจำนวนผู้เข้าร่วมในกิจกรรม
    const attendanceCount = await prisma.attendance.count({
      where: {
        activityId: existingAttendance.activityId,
        status: {
          in: ACTIVE_STATUSES_FOR_COUNT,
        },
      },
    });

    await prisma.activity.update({
      where: { id: existingAttendance.activityId },
      data: {
        peopleCount: attendanceCount,
      },
    });

    res.json(updatedAttendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ลบการเข้าร่วมกิจกรรม
export const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const existingAttendance = await prisma.attendance.findUnique({
      where: { id },
    });

    if (!existingAttendance) {
      return res.status(404).json({ error: "ไม่พบข้อมูลการเข้าร่วมกิจกรรม" });
    }

    const activityId = existingAttendance.activityId;

    await prisma.attendance.delete({
      where: { id },
    });

    // อัปเดตจำนวนผู้เข้าร่วมในกิจกรรม
    const attendanceCount = await prisma.attendance.count({
      where: {
        activityId,
        status: {
          in: ACTIVE_STATUSES_FOR_COUNT,
        },
      },
    });

    await prisma.activity.update({
      where: { id: activityId },
      data: {
        peopleCount: attendanceCount,
      },
    });

    res.json({ message: "ลบการเข้าร่วมกิจกรรมเรียบร้อยแล้ว" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// เปลี่ยนสถานะการเข้าร่วมจาก Inprogress เป็น completed ตาม userId + activityId
export const completeAttendanceIfInProgress = async (req, res) => {
  try {
    const { userId, activityId } = req.body;

    if (!userId || !activityId) {
      return res.status(400).json({ error: "กรุณาระบุ userId และ activityId" });
    }

    const attendance = await prisma.attendance.findUnique({
      where: { userId_activityId: { userId, activityId } },
      include: {
        user: {
          select: {
            id: true,
            studentId: true,
            fullname: true,
            email: true,
            phone: true,
            department: true,
          },
        },
        activity: {
          include: {
            department: true,
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

    if (!attendance) {
      return res.status(404).json({ error: "ไม่พบข้อมูลการเข้าร่วมกิจกรรม" });
    }

    const isInProgress =
      attendance.status === "Inprogress" || attendance.status === "inprogress";
    if (!isInProgress) {
      return res.status(400).json({ error: "สถานะปัจจุบันไม่ใช่ Inprogress" });
    }

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: { status: "completed" },
      include: {
        user: {
          select: {
            id: true,
            studentId: true,
            fullname: true,
            email: true,
            phone: true,
            department: true,
          },
        },
        activity: {
          include: {
            department: true,
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

    // อัปเดตจำนวนผู้เข้าร่วมในกิจกรรม
    const attendanceCount = await prisma.attendance.count({
      where: {
        activityId,
        status: {
          in: ACTIVE_STATUSES_FOR_COUNT,
        },
      },
    });

    await prisma.activity.update({
      where: { id: activityId },
      data: {
        peopleCount: attendanceCount,
      },
    });

    return res.json(updatedAttendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ดึงข้อมูลการเข้าร่วมกิจกรรมของนักศึกษาคนหนึ่ง
export const getAttendancesByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const attendances = await prisma.attendance.findMany({
      where: {
        userId,
      },
      include: {
        activity: {
          include: {
            department: true,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(attendances);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ดึงข้อมูลการเข้าร่วมกิจกรรมของกิจกรรมหนึ่ง
export const getAttendancesByActivity = async (req, res) => {
  try {
    const { activityId } = req.params;

    const attendances = await prisma.attendance.findMany({
      where: {
        activityId,
      },
      include: {
        user: {
          select: {
            id: true,
            studentId: true,
            fullname: true,
            email: true,
            phone: true,
            department: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(attendances);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
