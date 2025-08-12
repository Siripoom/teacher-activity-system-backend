import { PrismaClient } from '@prisma/client';
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
      fileActivity,
      hour,
      status
    } = req.body;

    const newActivity = await prisma.activity.create({
      data: {
        name,
        description,
        date: new Date(date),
        address,
        departmentId,
        employeeId,
        peopleCount,
        maxPeopleCount,
        fileActivity,
        hour,
        status
      }
    });
    res.status(201).json(newActivity);
  } catch (error) {
    if (error.code === 'P2003') {
      if (error.meta?.field_name.includes('departmentId')) {
        return res.status(404).json({ message: `Department with ID ${req.body.departmentId} not found.` });
      }
      if (error.meta?.field_name.includes('employeeId')) {
        return res.status(404).json({ message: `Employee with ID ${req.body.employeeId} not found.` });
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
        department: { select: { name: true, shortName: true } },
        employee: { select: { fullname: true, email: true } }
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
        employee: { select: { id: true, fullname: true, email: true } },
        attendances: {
          include: {
            student: { select: { id: true, fullname: true, email: true } }
          }
        }
      }
    });

    if (!activity) {
      return res.status(404).json({ message: `Activity with ID ${id} not found.` });
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
    const updateData = { ...req.body };

    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    const updatedActivity = await prisma.activity.update({
      where: { id },
      data: updateData
    });
    res.status(200).json(updatedActivity);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: `Activity with ID ${req.params.id} not found to update.` });
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
      return res.status(404).json({ message: `Activity with ID ${id} not found.` });
    }

    await prisma.activity.delete({ where: { id } });
    res.status(200).json({ message: `Successfully deleted activity '${activityToDelete.name}' (ID: ${id}).` });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(409).json({ message: 'Cannot delete activity. It has existing attendance records.' });
    }
    console.error(`Error deleting activity with ID ${id}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};