import prisma from "../config/db.js";

const VALID_ACTIVITY_STATUSES = ["planned", "inprogress", "completed", "cancelled"];
const buildDate = (value, fieldName, res) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    res.status(400).json({ error: `รูปแบบ ${fieldName} ไม่ถูกต้อง` });
    return null;
  }
  return parsed;
};



/**
 * สรุปรายงานกิจกรรม
 * Query params (optional):
 * - `departmentId` (uuid)
 * - `majorId` (uuid) — ตรวจ majorJoin
 * - `status` (planned|inprogress|completed|cancelled)
 * - `typeActivityId` (uuid)
 * - `year` (number)
 * - `startDate` (ISO string) — filter by `date >= startDate`
 * - `endDate` (ISO string) — filter by `date <= endDate`
 * Response: totals + summary by status/department/major + activities list (with relations)
 */
export const getActivityReport = async (req, res) => {
  try {
    const { departmentId, majorId, status, typeActivityId, year, startDate, endDate } = req.query;

    if (status && !VALID_ACTIVITY_STATUSES.includes(status)) {
      return res.status(400).json({ error: "สถานะกิจกรรมไม่ถูกต้อง" });
    }

    let parsedYear;
    if (year !== undefined) {
      parsedYear = Number(year);
      if (Number.isNaN(parsedYear)) {
        return res.status(400).json({ error: "year ต้องเป็นตัวเลข" });
      }
    }

    const parsedStart = buildDate(startDate, "startDate", res);
    if (parsedStart === null) return;
    const parsedEnd = buildDate(endDate, "endDate", res);
    if (parsedEnd === null) return;
    if (parsedStart && parsedEnd && parsedEnd < parsedStart) {
      return res.status(400).json({ error: "endDate ต้องไม่น้อยกว่า startDate" });
    }

    const where = {};
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;
    if (typeActivityId) where.typeActivityId = typeActivityId;
    if (parsedYear !== undefined) where.year = parsedYear;
    if (parsedStart || parsedEnd) {
      where.date = {};
      if (parsedStart) where.date.gte = parsedStart;
      if (parsedEnd) where.date.lte = parsedEnd;
    }
    if (majorId) {
      where.majorJoins = { some: { majorId } };
    }

    const activities = await prisma.activity.findMany({
      where,
      include: {
        department: true,
        typeActivity: true,
        majorJoins: {
          include: {
            major: true,
          },
        },
        fileActivities: true,
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
        
      },
      orderBy: { date: "desc" },
    });

    const totalActivities = activities.length;
    const statusCount = {};
    const departmentCount = {};
    const majorCount = {};

    activities.forEach((act) => {
      statusCount[act.status] = (statusCount[act.status] || 0) + 1;
      if (act.department) {
        const deptKey = `${act.departmentId}|${act.department.name}`;
        departmentCount[deptKey] = (departmentCount[deptKey] || 0) + 1;
      }
      act.majorJoins.forEach((mj) => {
        if (mj.major) {
          const majorKey = `${mj.majorId}|${mj.major.name}`;
          majorCount[majorKey] = (majorCount[majorKey] || 0) + 1;
        }
      });
    });

    const byStatus = Object.entries(statusCount).map(([key, value]) => ({
      status: key,
      count: value,
    }));

    const byDepartment = Object.entries(departmentCount).map(([compound, count]) => {
      const [deptId, name] = compound.split("|");
      return { departmentId: deptId, departmentName: name, count };
    });

    const byMajor = Object.entries(majorCount).map(([compound, count]) => {
      const [majId, name] = compound.split("|");
      return { majorId: majId, majorName: name, count };
    });

    return res.json({
      filters: {
        departmentId: departmentId || null,
        majorId: majorId || null,
        status: status || null,
        typeActivityId: typeActivityId || null,
        year: parsedYear ?? null,
        startDate: parsedStart || null,
        endDate: parsedEnd || null,
      },
      totalActivities,
      summary: {
        byStatus,
        byDepartment,
        byMajor,
      },
      activities,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * ดึงกิจกรรมตาม filter อย่างใดอย่างหนึ่ง (departmentId | year | typeActivityId)
 * Query params: departmentId OR year OR typeActivityId (ต้องส่งมาอย่างใดอย่างหนึ่งเท่านั้น)
 */
export const getActivitiesBySingleFilter = async (req, res) => {
  try {
    const { departmentId, year, typeActivityId } = req.query;
    const provided = [
      departmentId ? "departmentId" : null,
      year ? "year" : null,
      typeActivityId ? "typeActivityId" : null,
    ].filter(Boolean);

    if (provided.length === 0) {
      return res.status(400).json({ error: "กรุณาระบุ departmentId หรือ year หรือ typeActivityId อย่างใดอย่างหนึ่ง" });
    }

    if (provided.length > 1) {
      return res.status(400).json({ error: "สามารถระบุได้ครั้งละ 1 ตัวเลือก (departmentId หรือ year หรือ typeActivityId)" });
    }

    const where = {};
    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (typeActivityId) {
      where.typeActivityId = typeActivityId;
    }

    if (year) {
      const parsedYear = Number(year);
      if (Number.isNaN(parsedYear)) {
        return res.status(400).json({ error: "year ต้องเป็นตัวเลข" });
      }
      where.year = parsedYear;
    }

    const activities = await prisma.activity.findMany({
      where,
      include: {
        department: true,
        typeActivity: true,
        responsible: {
          select: {
            id: true,
            fullname: true,
            email: true,
            userType: true,
          },
        },
        majorJoins: {
          include: { major: true },
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
      orderBy: { date: "desc" },
    });

    const totalHour = activities.reduce((sum, act) => sum + (act.hour || 0), 0);
    const countActivity = activities.length;

    return res.json({ filter: provided[0], totalHour, countActivity, activities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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
    const { status, departmentId, responsibleId, typeActivityId } = req.query;

    const where = {};
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (responsibleId) where.responsibleId = responsibleId;
    if (typeActivityId) where.typeActivityId = typeActivityId;

    const activities = await prisma.activity.findMany({
      where,
      include: {
        department: true,
        typeActivity: true,
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
        typeActivity: true,
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
 * - `typeActivityId` (string, uuid, required) — ประเภทกิจกรรม ต้องมีอยู่จริง
 * - `description` (string, optional)
 * - `peopleCount` (number, optional)
 * - `maxPeopleCount` (number, optional)
 * - `hour` (number, optional)
 * - `startDate` (ISO string, optional)
 * - `endDate` (ISO string, optional)
 * - `year` (number, optional)
 * - `level` (string, optional)
 * - `status` (string enum, optional) — หากไม่ส่งใช้ค่า default: planned
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
      typeActivityId,
      peopleCount,
      maxPeopleCount,
      hour,
      majorIds,
      startDate,
      endDate,
      year,
      level,
      status,
    } = req.body;

    if (!name || !date || !address || !departmentId || !responsibleId || !typeActivityId) {
      return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "รูปแบบวันที่ไม่ถูกต้อง" });
    }

    let parsedStartDate;
    if (startDate) {
      parsedStartDate = new Date(startDate);
      if (Number.isNaN(parsedStartDate.getTime())) {
        return res.status(400).json({ error: "รูปแบบ startDate ไม่ถูกต้อง" });
      }
    }

    let parsedEndDate;
    if (endDate) {
      parsedEndDate = new Date(endDate);
      if (Number.isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({ error: "รูปแบบ endDate ไม่ถูกต้อง" });
      }
    }

    if (parsedStartDate && parsedEndDate && parsedEndDate < parsedStartDate) {
      return res.status(400).json({ error: "endDate ต้องไม่น้อยกว่า startDate" });
    }

    let parsedYear;
    if (year !== undefined && year !== null) {
      parsedYear = Number(year);
      if (Number.isNaN(parsedYear)) {
        return res.status(400).json({ error: "year ต้องเป็นตัวเลข" });
      }
    }

    if (status && !VALID_ACTIVITY_STATUSES.includes(status)) {
      return res.status(400).json({ error: "สถานะกิจกรรมไม่ถูกต้อง" });
    }

    const typeActivity = await prisma.typeActivity.findUnique({
      where: { id: typeActivityId },
    });

    if (!typeActivity) {
      return res.status(400).json({ error: "ไม่พบประเภทกิจกรรม" });
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
        date: parsedDate,
        address,
        departmentId,
        responsibleId,
        typeActivityId,
        peopleCount,
        maxPeopleCount,
        hour,
        status,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        year: parsedYear,
        level,
      },
      include: {
        department: true,
        typeActivity: true,
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
 * - `typeActivityId` (string, uuid)
 * - `startDate` (ISO string | null)
 * - `endDate` (ISO string | null)
 * - `year` (number | null)
 * - `level` (string | null)
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
      typeActivityId,
      peopleCount,
      maxPeopleCount,
      hour,
      status,
      majorIds,
      startDate,
      endDate,
      year,
      level,
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

    if (
      typeActivityId &&
      typeActivityId !== existingActivity.typeActivityId
    ) {
      const typeActivity = await prisma.typeActivity.findUnique({
        where: { id: typeActivityId },
      });

      if (!typeActivity) {
        return res.status(400).json({ error: "ไม่พบประเภทกิจกรรม" });
      }
    }

    if (status && !VALID_ACTIVITY_STATUSES.includes(status)) {
      return res.status(400).json({ error: "สถานะกิจกรรมไม่ถูกต้อง" });
    }

    let parsedDate;
    if (date !== undefined) {
      parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: "รูปแบบวันที่ไม่ถูกต้อง" });
      }
    }

    const hasStartDate = startDate !== undefined;
    let parsedStartDate;
    if (hasStartDate) {
      if (startDate === null || startDate === "") {
        parsedStartDate = null;
      } else {
        parsedStartDate = new Date(startDate);
        if (Number.isNaN(parsedStartDate.getTime())) {
          return res.status(400).json({ error: "รูปแบบ startDate ไม่ถูกต้อง" });
        }
      }
    }

    const hasEndDate = endDate !== undefined;
    let parsedEndDate;
    if (hasEndDate) {
      if (endDate === null || endDate === "") {
        parsedEndDate = null;
      } else {
        parsedEndDate = new Date(endDate);
        if (Number.isNaN(parsedEndDate.getTime())) {
          return res.status(400).json({ error: "รูปแบบ endDate ไม่ถูกต้อง" });
        }
      }
    }

    const startToValidate = hasStartDate ? parsedStartDate : existingActivity.startDate;
    const endToValidate = hasEndDate ? parsedEndDate : existingActivity.endDate;
    if (startToValidate && endToValidate && endToValidate < startToValidate) {
      return res.status(400).json({ error: "endDate ต้องไม่น้อยกว่า startDate" });
    }

    let parsedYear;
    const hasYear = year !== undefined;
    if (hasYear) {
      if (year === null || year === "") {
        parsedYear = null;
      } else {
        parsedYear = Number(year);
        if (Number.isNaN(parsedYear)) {
          return res.status(400).json({ error: "year ต้องเป็นตัวเลข" });
        }
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

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (address !== undefined) updateData.address = address;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (responsibleId !== undefined) updateData.responsibleId = responsibleId;
    if (typeActivityId !== undefined) updateData.typeActivityId = typeActivityId;
    if (peopleCount !== undefined) updateData.peopleCount = peopleCount;
    if (maxPeopleCount !== undefined) updateData.maxPeopleCount = maxPeopleCount;
    if (hour !== undefined) updateData.hour = hour;
    if (status !== undefined) updateData.status = status;
    if (date !== undefined) updateData.date = parsedDate;
    if (hasStartDate) updateData.startDate = parsedStartDate;
    if (hasEndDate) updateData.endDate = parsedEndDate;
    if (hasYear) updateData.year = parsedYear;
    if (level !== undefined) updateData.level = level === null ? null : level;

    const updatedActivity = await prisma.activity.update({
      where: { id },
      data: updateData,
      include: {
        department: true,
        typeActivity: true,
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
        typeActivity: true,
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
