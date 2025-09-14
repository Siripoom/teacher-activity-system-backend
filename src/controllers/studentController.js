// Log helper
const logAction = async (action, req, description) => {
  await prisma.log.create({
    data: {
      action,
      fullname: req.user?.fullname || 'unknown',
      role: req.user?.role || 'unknown',
      description
    }
  });
};
import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import { validate as isUuid } from 'uuid';
import { createLog} from './logController.js'; // Adjust the import path as necessary

const prisma = new PrismaClient();

export const getAllStudents = async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      include: { department: true }
    });
    if (students.length === 0) {
      return res.status(404).json({ message: "No students found." });
    }
    const log = await createLog(req.user, "Student" , "Retrieved all student records from the database.");
    console.log(log);
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

    if (!student) return res.status(404).json({ message: "Student not found." });
    await createLog(req.user, "Student", `Retrieved student record with ID: ${id}`);

    if (!student) return res.status(404).json({ message: `Student with ID '${id}' not found.` });

    res.status(200).json(student);
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createStudent = async (req, res) => {
  try {
    const { id, fullname, departmentId, birthday, email, phone, profilePic, status } = req.body;
    if (!id || !fullname || !departmentId || !birthday || !email) {
      return res.status(400).json({ message: "Required fields (id, fullname, departmentId, birthdate, email) are missing." });
    }
    const newStudent = await prisma.student.create({
      data: {
        id,
        fullname,
        departmentId,
        birthday: dayjs(birthday).add(543, 'year').format('DD-MM-YYYY'),
        email,
        phone,
        profilePic,
        status
      }
    });
    if (!newStudent) {
      return res.status(500).json({ message: "Failed to create student." });
    }

    await createLog(req.user, "Student", `New student created with ID: ${newStudent.id}`);
  await logAction('create_student', req, `Created student '${newStudent.fullname}' (ID: ${newStudent.id})`);
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
    const { fullname, departmentId, birthday, email, phone, profilePic, status } = req.body;

    // Partial update: อัปเดตเฉพาะ field ที่ส่งมา
    let updateData = {};
    if (fullname !== undefined) updateData.fullname = fullname;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (birthday !== undefined) {
      // แปลงเป็น พ.ศ. ถ้าปี < 2500
      const d = dayjs(birthday, ['YYYY-MM-DD', 'YYYY/MM/DD', 'DD/MM/YYYY', 'DD-MM-YYYY']);
      let year = d.year();
      if (year < 2500) year += 543;
      updateData.birthday = d.set('year', year).format('YYYY-MM-DD');
    }
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (profilePic !== undefined) updateData.profilePic = profilePic;
    if (status !== undefined) updateData.status = status;

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: updateData
    });
    if (!updatedStudent) {
      return res.status(404).json({ message: "Student not found." });
    }
    await createLog(req.user, "Student", `Student record with ID: ${id} updated successfully.`)
  await logAction('update_student', req, `Updated student '${id}'`);
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
    await createLog(req.user, "Student", `Student record with ID: ${id} deleted successfully.`);
  await logAction('delete_student', req, `Deleted student '${studentToDelete?.fullname}' (ID: ${id})`);
  res.status(200).json({ message: `Successfully deleted student '${studentToDelete.fullname}' (ID: ${id}).` });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(409).json({ message: 'Cannot delete student. It is still associated with attendance records.' });
    }
    console.error("Error deleting student:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};