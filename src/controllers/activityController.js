import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();

// POST /api/activities
export const createActivity = async (req, res) => {
  try {
    const {
      name,
      description,
      date,
      address,
      departmentId,
      employeeId,
      peopleCount,
      maxPeopleCount,
      hour,
      status
    } = req.body;

    // เก็บชื่อไฟล์ทั้งหมด
    let images = [];
    let pdfs = [];
    if (req.files) {
      if (req.files.images) {
        images = req.files.images.slice(0, 5).map(f => f.filename);
      }
      if (req.files.pdf) {
        pdfs = req.files.pdf.slice(0, 3).map(f => f.filename);
      }
    }

    // สร้าง activity
    const newActivity = await prisma.activity.create({
      data: {
        name,
        description,
        date: new Date(date),
        address,
        departmentId,
        employeeId,
        peopleCount: peopleCount ? Number(peopleCount) : null,
        maxPeopleCount: maxPeopleCount ? Number(maxPeopleCount) : null,
        hour: hour ? Number(hour) : null,
        status
      }
    });

    // สร้าง FileActivity record สำหรับแต่ละไฟล์
    const fileRecords = [];
    for (const img of images) {
      fileRecords.push(prisma.fileActivity.create({
        data: {
          activityId: newActivity.id,
          filepath: img
        }

      }));
    }
    for (const pdf of pdfs) {
      fileRecords.push(prisma.fileActivity.create({
        data: {
          activityId: newActivity.id,
          filepath: pdf
        }
      }));
    }
    await Promise.all(fileRecords);

    // Log action
    await prisma.log.create({
      data: {
        action: 'create_activity',
        fullname: req.user?.fullname || 'unknown',
        role: req.user?.role || 'unknown',
        description: `Created activity '${name}' (ID: ${newActivity.id}) by employee ${employeeId} in department ${departmentId}`
      }
    });
    res.status(201).json(newActivity);
  } catch (error) {
    if (error.code === 'P2003') {
      const fieldName = error.meta?.field_name || '';
      if (fieldName.includes('departmentId')) {
        return res.status(404).json({ message: `Department with ID '${req.body.departmentId}' not found.` });
      }
      if (fieldName.includes('employeeId')) {
        return res.status(404).json({ message: `Employee with ID '${req.body.employeeId}' not found.` });
      }
    }
    console.error("Error creating activity:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/activities
export const getAllActivities = async (req, res) => {
  try {
    const { departmentId, status } = req.query;
    const whereClause = {};

    if (departmentId) whereClause.departmentId = departmentId;
    if (status) whereClause.status = status;

    const activities = await prisma.activity.findMany({
      where: whereClause,
      include: {
        department: true,
        Employee: true,
        attendances: {
          include: {
            student: true
          }
        },
        FileActivity: true
      },
      orderBy: {
        date: 'desc'
      }
    });
    res.status(200).json(activities);
  } catch (error) {
    console.error("Error fetching activities:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/activities/:id
export const getActivityById = async (req, res) => {
  try {
    const { id } = req.params;
    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        department: true,
        Employee: true,
        attendances: {
          include: {
            student: true
          }
        },
        FileActivity: true
      }
    });

    if (!activity) {
      return res.status(404).json({ message: `Activity with ID '${id}' not found.` });
    }
    res.status(200).json(activity);
  } catch (error) {
    console.error(`Error fetching activity with ID ${id}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT /api/activities/:id
export const updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    // Partial update เฉพาะ field ที่ส่งมา
    let updateData = {};
    const {
      name,
      description,
      date,
      address,
      departmentId,
      employeeId,
      peopleCount,
      maxPeopleCount,
      hour,
      status
    } = req.body;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (date !== undefined) updateData.date = new Date(date);
    if (address !== undefined) updateData.address = address;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (employeeId !== undefined) updateData.employeeId = employeeId;
    if (peopleCount !== undefined) updateData.peopleCount = Number(peopleCount);
    if (maxPeopleCount !== undefined) updateData.maxPeopleCount = Number(maxPeopleCount);
    if (hour !== undefined) updateData.hour = Number(hour);
    if (status !== undefined) updateData.status = status;

    // ถ้ามีไฟล์ใหม่ ให้ลบไฟล์เดิมออกจาก server และลบข้อมูลใน FileActivity
    let images = [];
    let pdfs = [];
    if (req.files && (req.files.images || req.files.pdf)) {
      // ดึงไฟล์เดิมจาก DB
      const oldFiles = await prisma.fileActivity.findMany({ where: { activityId: id } });
      for (const file of oldFiles) {
        const filePath = path.join(__dirname, '../../uploads/fileActivities', file.filepath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // ลบข้อมูลใน FileActivity
      await prisma.fileActivity.deleteMany({ where: { activityId: id } });

      // เตรียมไฟล์ใหม่
      if (req.files.images) {
        images = req.files.images.slice(0, 5).map(f => f.filename);
      }
      if (req.files.pdf) {
        pdfs = req.files.pdf.slice(0, 3).map(f => f.filename);
      }
    }
    console.log(updateData);
    const updatedActivity = await prisma.activity.update({
      where: { id },
      data: updateData
    });

    // เพิ่มไฟล์ใหม่ใน FileActivity
    const fileRecords = [];
    for (const img of images) {
      fileRecords.push(prisma.fileActivity.create({
        data: {
          activityId: id,
          filepath: img
        }
      }));
    }
    for (const pdf of pdfs) {
      fileRecords.push(prisma.fileActivity.create({
        data: {
          activityId: id,
          filepath: pdf
        }
      }));
    }
    if (fileRecords.length > 0) {
      await Promise.all(fileRecords);
    }

    // Log action
    await prisma.log.create({
      data: {
        action: 'update_activity',
        fullname: req.user?.fullname || 'unknown',
        role: req.user?.role || 'unknown',
        description: `Updated activity '${id}'${Object.keys(updateData).length ? `, fields: ${Object.keys(updateData).join(', ')}` : ''}`
      }
    });
    res.status(200).json(updatedActivity);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: `Activity with ID '${req.params.id}' not found to update.` });
    }
    if (error.code === 'P2003') {
      const fieldName = error.meta?.field_name || '';
      if (fieldName.includes('departmentId')) {
        return res.status(404).json({ message: `Cannot update: Department with ID '${req.body.departmentId}' not found.` });
      }
      if (fieldName.includes('employeeId')) {
        return res.status(404).json({ message: `Cannot update: Employee with ID '${req.body.employeeId}' not found.` });
      }
    }
    console.error(`Error updating activity with ID ${req.params.id}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// DELETE /api/activities/:id
export const deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const activityToDelete = await prisma.activity.findUnique({ where: { id } });

    if (!activityToDelete) {
      return res.status(404).json({ message: `Activity with ID '${id}' not found.` });
    }

    // ลบ attendances ที่เชื่อมกับ activity
    await prisma.attendance.deleteMany({ where: { activityId: id } });

    // ลบไฟล์ในเครื่องและข้อมูลใน fileActivity
    const files = await prisma.fileActivity.findMany({ where: { activityId: id } });
    for (const file of files) {
      const filePath = path.join(__dirname, '../../uploads/fileActivities', file.filepath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    await prisma.fileActivity.deleteMany({ where: { activityId: id } });

    // ลบ activity จริง
    await prisma.activity.delete({ where: { id } });
    // Log action
    await prisma.log.create({
      data: {
        action: 'delete_activity',
        fullname: req.user?.fullname || 'unknown',
        role: req.user?.role || 'unknown',
        description: `Deleted activity '${activityToDelete?.name}' (ID: ${id})`
      }
    });
    res.status(200).json({ message: `Successfully deleted activity '${activityToDelete.name}' (ID: ${id}).` });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(409).json({ message: 'Cannot delete activity. It has existing attendance records.' });
    }
    console.error(`Error deleting activity with ID ${id}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};