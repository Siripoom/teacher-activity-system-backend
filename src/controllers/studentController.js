import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getAllStudents = async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      include: { department: true }
    });
    res.status(200).json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({
      where: { id },
      include: { department: true }
    });

    if (!student) return res.status(404).json({ message: `Student with ID '${id}' not found.` });
    res.status(200).json(student);
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createStudent = async (req, res) => {
  try {
    const { id, fullname, departmentId, birthdate, email, phone, profilePic, status } = req.body;
    if (!id || !fullname || !departmentId || !birthdate || !email) {
      return res.status(400).json({ message: "Required fields (id, fullname, departmentId, birthdate, email) are missing." });
    }
    const newStudent = await prisma.student.create({
      data: {
        id,
        fullname,
        departmentId,
        birthdate: new Date(birthdate),
        email,
        phone,
        profilePic,
        status
      }
    });
    res.status(201).json(newStudent);
  } catch (error) {
    if (error.code === 'P2002') {
      const target = error.meta?.target || [];
      if (target.includes('id')) {
        return res.status(409).json({ message: `Student with ID '${req.body.id}' already exists.` });
      }
      if (target.includes('email')) {
        return res.status(409).json({ message: 'This email is already in use by another student.' });
      }
    }
    if (error.code === 'P2003' && error.meta?.target?.includes('departmentId')) {
      return res.status(404).json({ message: `Department with ID '${req.body.departmentId}' not found.` });
    }
    console.error("Error creating student:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullname, departmentId, birthdate, email, phone, profilePic, status } = req.body;
    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        fullname,
        departmentId,
        birthdate: birthdate ? new Date(birthdate) : undefined,
        email,
        phone,
        profilePic,
        status
      }
    });

    res.status(200).json(updatedStudent);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: `Student with ID '${req.params.id}' not found to update.` });
    }
    console.error("Error updating student:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const studentToDelete = await prisma.student.findUnique({ where: { id } });
    if (!studentToDelete) {
      return res.status(404).json({ message: `Student with ID '${id}' not found.` });
    }

    await prisma.student.delete({ where: { id } });

    res.status(200).json({ message: `Successfully deleted student '${studentToDelete.fullname}' (ID: ${id}).` });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(409).json({ message: 'Cannot delete student. It is still associated with attendance records.' });
    }
    console.error("Error deleting student:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};