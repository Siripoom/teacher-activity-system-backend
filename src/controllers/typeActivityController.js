import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ฟังก์ชันช่วยบันทึก Log ลงตาราง `logs`
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
    console.error('Failed to write log:', err);
  }
};

// สร้างประเภทกิจกรรมใหม่
// POST /api/type-activities
// body: { name }
export const createTypeActivity = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });

    const newType = await prisma.typeActivity.create({
      data: { name }
    });

    await logAction('create_type_activity', req, `Created typeActivity '${name}' (ID: ${newType.id})`);
    return res.status(201).json(newType);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'TypeActivity name already exists.' });
    }
    console.error('Error creating TypeActivity:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ดึงประเภทกิจกรรมทั้งหมด
// GET /api/type-activities
export const getAllTypeActivities = async (req, res) => {
  try {
    const typeActivities = await prisma.typeActivity.findMany({
      include: { activities: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' }
    });
    return res.status(200).json(typeActivities);
  } catch (error) {
    console.error('Error fetching type activities:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ดึงประเภทกิจกรรมตาม ID
// GET /api/type-activities/:id
export const getTypeActivityById = async (req, res) => {
  try {
    const { id } = req.params;
    const typeActivity = await prisma.typeActivity.findUnique({
      where: { id },
      include: { activities: true }
    });
    if (!typeActivity) return res.status(404).json({ message: `TypeActivity with ID '${id}' not found.` });
    return res.status(200).json(typeActivity);
  } catch (error) {
    console.error(`Error fetching TypeActivity with ID ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// อัปเดตประเภทกิจกรรม (partial)
// PUT /api/type-activities/:id
export const updateTypeActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;

    const updated = await prisma.typeActivity.update({ where: { id }, data: updateData });
    await logAction('update_type_activity', req, `Updated typeActivity '${id}'${Object.keys(updateData).length ? `, fields: ${Object.keys(updateData).join(', ')}` : ''}`);
    return res.status(200).json(updated);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: `TypeActivity with ID '${req.params.id}' not found.` });
    if (error.code === 'P2002') return res.status(409).json({ message: 'TypeActivity name already exists.' });
    console.error(`Error updating TypeActivity with ID ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ลบประเภทกิจกรรม
// DELETE /api/type-activities/:id
export const deleteTypeActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const typeToDelete = await prisma.typeActivity.findUnique({ where: { id } });
    if (!typeToDelete) return res.status(404).json({ message: `TypeActivity with ID '${id}' not found.` });

    // ป้องกันการลบถ้ามีกิจกรรมที่เกี่ยวข้อง (ถ้าต้องการเปลี่ยนเป็น cascade ให้ปรับ logic)
    const activityCount = await prisma.activity.count({ where: { typeActivityId: id } });
    if (activityCount > 0) return res.status(409).json({ message: 'Cannot delete typeActivity. There are associated activities.' });

    await prisma.typeActivity.delete({ where: { id } });
    await logAction('delete_type_activity', req, `Deleted typeActivity '${typeToDelete.name}' (ID: ${id})`);
    return res.status(200).json({ message: `Successfully deleted typeActivity '${typeToDelete.name}' (ID: ${id}).` });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: `TypeActivity with ID '${req.params.id}' not found.` });
    console.error(`Error deleting TypeActivity with ID ${req.params.id}:`, error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export default {
  createTypeActivity,
  getAllTypeActivities,
  getTypeActivityById,
  updateTypeActivity,
  deleteTypeActivity
};
