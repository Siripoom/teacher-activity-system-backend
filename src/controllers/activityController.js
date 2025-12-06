import prisma from "../config/db.js";

/**
 * ดึงข้อมูลกิจกรรมทั้งหมด
 * Query params (optional):
 * - `status` (string) : กรองตามสถานะกิจกรรม (eg. "planned", "inprogress", "completed")
 * - `departmentId` (string, uuid) : กรองตามแผนก
 * - `responsibleId` (string, uuid) : กรองตามผู้รับผิดชอบ
 * Response: รายการกิจกรรมพร้อมความสัมพันธ์ (department, responsible, attendances, fileActivities, majorJoins)
 */
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
        majorJoins: {
          include: {
            major: true,
          },
        },
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

/**
 * ดึงข้อมูลกิจกรรมตาม ID
 * URL params:
 * - `id` (string, uuid) : รหัสกิจกรรม
 * Response: activity object รวมความสัมพันธ์ (department, responsible, attendances.user, fileActivities, majorJoins)
 */
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
        majorJoins: {
          include: {
            major: true,
          },
        },
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

/**
 * สร้างกิจกรรมใหม่
 * Request body (JSON):
 * - `name` (string, required)
 * - `date` (ISO string or date string, required) e.g. "2025-12-10T09:00:00.000Z"
 * - `address` (string, required)
 * - `departmentId` (string, uuid, required)
 * - `responsibleId` (string, uuid, required) — ผู้รับผิดชอบ ต้องเป็น userType: admin หรือ teacher
 * - `description` (string, optional)
 * - `peopleCount` (number, optional)
 * - `maxPeopleCount` (number, optional)
 * - `hour` (number, optional)
 * - `majorIds` (array of string uuids, optional) — ถ้าส่งมา จะสร้างความสัมพันธ์ใน `majorJoinActivity`. ทุก majorId ต้องมีอยู่จริงและสังกัด `departmentId` ที่ส่งเข้ามา
 * Response: สร้าง activity แล้วคืนข้อมูล activity (รวม department, responsible)
 */
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
      majorIds,
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

    // ถ้ามีการระบุ majorIds ให้ตรวจสอบว่าแต่ละสาขามีอยู่จริงและสังกัดแผนกเดียวกับ departmentId
    let majorsToJoin = [];
    if (majorIds && Array.isArray(majorIds) && majorIds.length > 0) {
      // ดึงสาขาทั้งหมดที่ส่งมา
      majorsToJoin = await prisma.major.findMany({
        where: { id: { in: majorIds } },
      });

      if (majorsToJoin.length !== majorIds.length) {
        return res.status(400).json({ error: "พบ majorId ที่ไม่ถูกต้อง" });
      }

      // ตรวจสอบว่าแต่ละสาขาสังกัดแผนกเดียวกับ departmentId
      const invalidMajor = majorsToJoin.find((m) => m.departmentId !== departmentId);
      if (invalidMajor) {
        return res.status(400).json({ error: "มีสาขาที่ไม่สังกัดแผนกที่ระบุ" });
      }
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

    // สร้างความสัมพันธ์ majorJoinActivity หากมี majorIds
    if (majorsToJoin.length > 0) {
      const createData = majorsToJoin.map((m) => ({
        majorId: m.id,
        activityId: newActivity.id,
      }));

      await prisma.majorJoinActivity.createMany({ data: createData, skipDuplicates: true });
    }

    res.status(201).json(newActivity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * อัปเดตข้อมูลกิจกรรม
 * URL params:
 * - `id` (string, uuid) : รหัสกิจกรรมที่ต้องการอัปเดต
 * Request body (JSON) — ทุกฟิลด์เป็น optional ถ้าไม่ส่งจะไม่เปลี่ยนค่า:
 * - `name` (string)
 * - `date` (ISO string หรือ date string)
 * - `address` (string)
 * - `departmentId` (string, uuid)
 * - `responsibleId` (string, uuid) — ถ้าเปลี่ยน จะถูกตรวจสอบว่าเป็น admin/teacher
 * - `description` (string)
 * - `peopleCount` (number)
 * - `maxPeopleCount` (number)
 * - `hour` (number)
 * - `status` (string enum)
 * - `majorIds` (array of string uuids) — ถาส่งมา จะลบความสัมพันธ์ `majorJoinActivity` เดิมทั้งหมดและแทนที่ด้วยรายการใหม่; ทุก majorId ต้องมีอยู่จริงและสังกัด departmentId (ปัจจุบันหรือที่อัปเดต)
 * Response: activity ที่อัปเดต (รวม department, responsible)
 */
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
      majorIds,
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

    // หากส่ง majorIds มา ให้ตรวจสอบความถูกต้องของ majorIds
    let majorsToJoin = [];
    if (majorIds && Array.isArray(majorIds)) {
      majorsToJoin = await prisma.major.findMany({
        where: { id: { in: majorIds } },
      });

      if (majorsToJoin.length !== majorIds.length) {
        return res.status(400).json({ error: "พบ majorId ที่ไม่ถูกต้อง" });
      }

      // ถ้ามีการเปลี่ยน departmentId ให้ตรวจสอบว่าสาขายังสังกัดแผนกที่ถูกต้อง
      const deptIdToCheck = departmentId || existingActivity.departmentId;
      const invalidMajor = majorsToJoin.find((m) => m.departmentId !== deptIdToCheck);
      if (invalidMajor) {
        return res.status(400).json({ error: "มีสาขาที่ไม่สังกัดแผนกที่ระบุ" });
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

    // หากส่ง majorIds มา ให้แทนที่ majorJoinActivity เดิมด้วยของใหม่
    if (majorIds && Array.isArray(majorIds)) {
      await prisma.majorJoinActivity.deleteMany({ where: { activityId: id } });

      if (majorsToJoin.length > 0) {
        const createData = majorsToJoin.map((m) => ({
          majorId: m.id,
          activityId: id,
        }));

        await prisma.majorJoinActivity.createMany({ data: createData, skipDuplicates: true });
      }
    }

    res.json(updatedActivity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * ลบกิจกรรม
 * URL params:
 * - `id` (string, uuid) : รหัสกิจกรรม
 * Note: การลบจะลบ attendances และ fileActivities ที่สัมพันธ์ตามการตั้งค่า cascade ใน schema
 */
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

/**
 * ดึงกิจกรรมทั้งหมดที่ผู้ใช้คนหนึ่งเป็นผู้รับผิดชอบ
 * URL params:
 * - `userId` (string, uuid) : รหัสผู้ใช้
 * Response: รายการกิจกรรม (รวม department, attendances, fileActivities, majorJoins)
 */
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
        majorJoins: {
          include: {
            major: true,
          },
        },
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
