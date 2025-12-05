import prisma from "../config/db.js";

// ดึงข้อมูลกิจกรรมทั้งหมด
export const getAllActivities = async (req, res) => {
  try {
    const { status, departmentId, responsibleId } = req.query;

    const where = {};
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (responsibleId) where.responsibleId = responsibleId;

    const activities = await prisma.activity.findMany({
      where,
      include: {
        department: true,
        responsible: {
          select: {
            id: true,
            fullname: true,
            email: true,
            userType: true,
          },
        },
        attendances: {
          include: {
            user: {
              select: {
                id: true,
                studentId: true,
                fullname: true,
                email: true,
              },
            },
          },
        },
        fileActivities: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ดึงข้อมูลกิจกรรมตาม ID
export const getActivityById = async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        department: true,
        responsible: {
          select: {
            id: true,
            fullname: true,
            email: true,
            phone: true,
            userType: true,
          },
        },
        attendances: {
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
        },
        fileActivities: true,
      },
    });

    if (!activity) {
      return res.status(404).json({ error: "ไม่พบข้อมูลกิจกรรม" });
    }

    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// สร้างกิจกรรมใหม่
export const createActivity = async (req, res) => {
  try {
    const {
      name,
      description,
      date,
      address,
      departmentId,
      responsibleId,
      peopleCount,
      maxPeopleCount,
      hour,
    } = req.body;

    if (!name || !date || !address || !departmentId || !responsibleId) {
      return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    // ตรวจสอบว่าผู้รับผิดชอบเป็นพนักงาน (admin หรือ teacher)
    const responsible = await prisma.user.findUnique({
      where: { id: responsibleId },
    });

    if (
      !responsible ||
      (responsible.userType !== "admin" && responsible.userType !== "teacher")
    ) {
      return res
        .status(400)
        .json({ error: "ผู้รับผิดชอบต้องเป็นพนักงาน (admin หรือ teacher)" });
    }

    const newActivity = await prisma.activity.create({
      data: {
        name,
        description,
        date: new Date(date),
        address,
        departmentId,
        responsibleId,
        peopleCount,
        maxPeopleCount,
        hour,
      },
      include: {
        department: true,
        responsible: {
          select: {
            id: true,
            fullname: true,
            email: true,
            userType: true,
          },
        },
      },
    });

    res.status(201).json(newActivity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// อัปเดตข้อมูลกิจกรรม
export const updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      date,
      address,
      departmentId,
      responsibleId,
      peopleCount,
      maxPeopleCount,
      hour,
      status,
    } = req.body;

    const existingActivity = await prisma.activity.findUnique({
      where: { id },
    });

    if (!existingActivity) {
      return res.status(404).json({ error: "ไม่พบข้อมูลกิจกรรม" });
    }

    // ถ้ามีการเปลี่ยนผู้รับผิดชอบ ให้ตรวจสอบว่าเป็นพนักงาน
    if (responsibleId && responsibleId !== existingActivity.responsibleId) {
      const responsible = await prisma.user.findUnique({
        where: { id: responsibleId },
      });

      if (
        !responsible ||
        (responsible.userType !== "admin" && responsible.userType !== "teacher")
      ) {
        return res
          .status(400)
          .json({ error: "ผู้รับผิดชอบต้องเป็นพนักงาน (admin หรือ teacher)" });
      }
    }

    const updateData = {
      name,
      description,
      address,
      departmentId,
      responsibleId,
      peopleCount,
      maxPeopleCount,
      hour,
      status,
    };

    if (date) {
      updateData.date = new Date(date);
    }

    const updatedActivity = await prisma.activity.update({
      where: { id },
      data: updateData,
      include: {
        department: true,
        responsible: {
          select: {
            id: true,
            fullname: true,
            email: true,
            userType: true,
          },
        },
      },
    });

    res.json(updatedActivity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ลบกิจกรรม
export const deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;

    const existingActivity = await prisma.activity.findUnique({
      where: { id },
      include: {
        attendances: true,
        fileActivities: true,
      },
    });

    if (!existingActivity) {
      return res.status(404).json({ error: "ไม่พบข้อมูลกิจกรรม" });
    }

    await prisma.activity.delete({
      where: { id },
    });

    res.json({ message: "ลบกิจกรรมเรียบร้อยแล้ว" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ดึงข้อมูลกิจกรรมที่ผู้ใช้รับผิดชอบ
export const getActivitiesByResponsible = async (req, res) => {
  try {
    const { userId } = req.params;

    const activities = await prisma.activity.findMany({
      where: {
        responsibleId: userId,
      },
      include: {
        department: true,
        attendances: {
          include: {
            user: {
              select: {
                id: true,
                studentId: true,
                fullname: true,
                email: true,
              },
            },
          },
        },
        fileActivities: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
