// src/controllers/attendanceController.js

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// POST /api/activities/:activityId/attend
export const joinActivity = async (req, res) => {
  try {
    const { activityId } = req.params;
    const { studentId, reason } = req.body;

    // 1. เช็คว่านักศึกษาคนนี้เคยสมัครกิจกรรมนี้ไปแล้วหรือยัง
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId: studentId,
        activityId: activityId
      }
    });


    if (existingAttendance) {
      return res.status(409).json({ message: "You have already joined this activity." });
    }

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      select: { peopleCount: true, maxPeopleCount: true }
    });

    if (activity && activity.maxPeopleCount !== null && activity.peopleCount >= activity.maxPeopleCount) {
      return res.status(409).json({ message: "This activity is already full." });
    }

    // สร้าง record การเข้าร่วม
    const newAttendance = await prisma.attendance.create({
      data: {
        reason,
        status: 'joined',
        student: {
          connect: { id: studentId } // เชื่อมกับ Student ที่มี id ตรงกับ studentId
        },
        activity: {
          connect: { id: activityId } // เชื่อมกับ Activity ที่มี id ตรงกับ activityId
        }
      }
    });

    // อัปเดต peopleCount ในตาราง Activity
    await prisma.activity.update({
      where: { id: activityId },
      data: {
        peopleCount: { increment: 1 }
      }
    });

    res.status(201).json(newAttendance);
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(404).json({ message: `Student or Activity not found.` });
    }
    console.error("Error joining activity:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// PUT /api/attendances/:attendanceId
export const updateAttendanceStatus = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { status, reason } = req.body;

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        status,
        reason
      },
      include: { student: true, activity: true }
    });
    res.status(200).json(updatedAttendance);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: `Attendance record with ID ${req.params.attendanceId} not found.` });
    }
    console.error("Error updating attendance:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /api/attendances/:attendanceId
export const leaveActivity = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const attendanceToDelete = await prisma.attendance.findUnique({
      where: { id: attendanceId }
    });
    if (!attendanceToDelete) {
      return res.status(404).json({ message: `Attendance record not found.` });
    }

    await prisma.attendance.delete({ where: { id: attendanceId } });

    await prisma.activity.update({
      where: { id: attendanceToDelete.activityId },
      data: {
        peopleCount: { decrement: 1 }
      }
    });

    res.status(200).json({ message: "Successfully left the activity." });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/activities/:activityId/attendances
export const getActivityAttendances = async (req, res) => {
  try {
    const { activityId } = req.params;
    const attendances = await prisma.attendance.findMany({
      where: { activityId: activityId },
      include: {
        student: {
          select: { id: true, fullname: true, email: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.status(200).json(attendances);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};