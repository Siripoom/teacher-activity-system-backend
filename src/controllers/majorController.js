import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ฟังก์ชันช่วยบันทึก Log ลงตาราง `logs`
// - action: รหัสการกระทำ (string) เช่น 'create_major'
// - req: request object เพื่อดึงข้อมูลผู้ทำรายการ (req.user)
// - description: ข้อความรายละเอียดเพิ่มเติมสำหรับ Log
// หมายเหตุ: ถ้าการเขียน log ล้มเหลว จะ catch ไว้ไม่ให้กระทบ flow หลัก
const logAction = async (action, req, description) => {
  try {
    await prisma.log.create({
      data: {
        action,
        fullname: req.user?.fullname || 'unknown',
        role: req.user?.role || 'unknown',
        description
      }
    });
  } catch (err) {
    // ป้องกันไม่ให้การเขียน log ทำให้ flow หลักล้มเหลว
    console.error('Failed to write log:', err);
  }
};

// สร้างสาขาใหม่
// POST /api/majors
// Request body: { name, departmentId }
// ตรวจสอบความถูกต้องของ input และตรวจสอบว่ามี department ที่อ้างอิงหรือไม่
export const createMajor = async (req, res) => {
  try {
    const { name, departmentId } = req.body;
    if (!name || !departmentId) {
      return res.status(400).json({ message: 'name and departmentId are required' });
    }

    // ตรวจสอบว่า department มีอยู่จริง
    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) {
      return res.status(404).json({ message: `Department with ID '${departmentId}' not found.` });
    }

    // สร้าง major
    const newMajor = await prisma.major.create({
      data: {
        name,
        departmentId
      }
    });

    await logAction('create_major', req, `Created major '${name}' (ID: ${newMajor.id}) in department ${departmentId}`);
    res.status(201).json(newMajor);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Major name already exists.' });
    }
    console.error('Error creating major:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ดึงรายการสาขาทั้งหมด (รองรับการกรองด้วย departmentId)
// GET /api/majors?departmentId=<id>
export const getAllMajors = async (req, res) => {
  try {
    const { departmentId } = req.query;
    const where = {};
    if (departmentId) where.departmentId = departmentId;

    const majors = await prisma.major.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        users: { select: { id: true, fullname: true, email: true } },
        activities: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json(majors);
  } catch (error) {
    console.error('Error fetching majors:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ดึงข้อมูลสาขาตาม ID พร้อมความสัมพันธ์สำคัญ
// GET /api/majors/:id
export const getMajorById = async (req, res) => {
  try {
    const { id } = req.params;
    const major = await prisma.major.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        users: { select: { id: true, fullname: true, email: true } },
        activities: true
      }
    });
    if (!major) return res.status(404).json({ message: `Major with ID '${id}' not found.` });
    res.status(200).json(major);
  } catch (error) {
    console.error(`Error fetching major with ID ${req.params.id}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// อัปเดตสาขา (partial update)
// PUT /api/majors/:id
// Request body: อาจมี { name, departmentId }
// - ถ้าเปลี่ยน departmentId จะตรวจสอบว่ามี department ดังกล่าวหรือไม่
export const updateMajor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, departmentId } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (departmentId !== undefined) {
      // check department exists
      const department = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!department) return res.status(404).json({ message: `Department with ID '${departmentId}' not found.` });
      updateData.departmentId = departmentId;
    }

    const updated = await prisma.major.update({ where: { id }, data: updateData });
    await logAction('update_major', req, `Updated major '${id}'${Object.keys(updateData).length ? `, fields: ${Object.keys(updateData).join(', ')}` : ''}`);
    res.status(200).json(updated);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: `Major with ID '${req.params.id}' not found.` });
    if (error.code === 'P2002') return res.status(409).json({ message: 'Major name already exists.' });
    console.error(`Error updating major with ID ${req.params.id}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ลบสาขา
// DELETE /api/majors/:id
// ก่อนลบจะตรวจสอบว่ามีผู้ใช้หรือกิจกรรมที่เกี่ยวข้องหรือไม่
export const deleteMajor = async (req, res) => {
  try {
    const { id } = req.params;
    const majorToDelete = await prisma.major.findUnique({ where: { id } });
    if (!majorToDelete) return res.status(404).json({ message: `Major with ID '${id}' not found.` });

    // Check for dependent users or activities (optional: decide whether to cascade or prevent)
    const userCount = await prisma.user.count({ where: { majorId: id } });
    const activityCount = await prisma.activity.count({ where: { id: id } });
    if (userCount > 0 || activityCount > 0) {
      return res.status(409).json({ message: 'Cannot delete major. It has associated users or activities.' });
    }

    await prisma.major.delete({ where: { id } });
    await logAction('delete_major', req, `Deleted major '${majorToDelete.name}' (ID: ${id})`);
    res.status(200).json({ message: `Successfully deleted major '${majorToDelete.name}' (ID: ${id}).` });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: `Major with ID '${req.params.id}' not found.` });
    console.error(`Error deleting major with ID ${req.params.id}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export default {
  createMajor,
  getAllMajors,
  getMajorById,
  updateMajor,
  deleteMajor
};
