import prisma from "../config/db.js";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { parse } from 'csv-parse';
import bcrypt from 'bcryptjs';

const unlinkAsync = promisify(fs.unlink);

// ดึงไฟล์กิจกรรมทั้งหมด
export const getAllFileActivities = async (req, res) => {
  try {
    const { activityId } = req.query;

    const where = {};
    if (activityId) where.activityId = activityId;

    const files = await prisma.fileActivity.findMany({
      where,
      include: {
        activity: {
          select: {
            id: true,
            name: true,
            date: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * CSV import students
 * Expected CSV headers (case-insensitive):
 * - id (required)
 * - fullname (required)
 * - birthday (required)  -- stored as-is and used as the raw password input (hashed)
 * - major (optional): major name (NOT id). Will be resolved to `major.id` case-insensitively.
 * - email (optional): if omitted, created as `s{studentId}@email.kmutnb.ac.th`
 * - phone (optional)
 *
 * Response: { message, created, errors }
 */
export const uploadStudentsCsv = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const rows = [];
    const errors = [];

    fs.createReadStream(req.file.path)
      .pipe(parse({ columns: header => header.map(h => h.replace(/['"\uFEFF]/g, '').trim()), skip_empty_lines: true }))
      .on('data', (data) => rows.push(data))
      .on('end', async () => {
        let created = 0;
        const student = await prisma.student.findMany({where:{userType:'student',status:'active'}});
        
        student.forEach(async(element) => {
          const currentYear = new Date().getFullYear();
        const yearStr = studentId.substring(0, 2);
        const entryYear = 2500 + parseInt(yearStr, 10);
        const currentBuddhist = currentYear + 543;
        let computed = entryYear - currentBuddhist + 1;
        computed = parseInt(computed, 10);
        let level = String(computed);
          await prisma.user.update({
            where:{studentId:element.id},
            data:{level:level}
          });
        });


        for (let i = 0; i < rows.length; i++) {
          const rowNumber = i + 2; // header is line 1
          const row = rows[i];
          try {
            const studentId = row.id?.toString().trim();
            const fullname = row.fullname?.toString().trim();
            const birthdayRaw = row.birthday?.toString().trim();
            const majorInput = row.major?.toString().trim();
            const phone = row.phone?.toString().trim();
            const emailInput = row.email?.toString().trim();

            if (!studentId || !fullname || !birthdayRaw) {
              errors.push({ row: rowNumber, error: 'Missing required fields (id, fullname, birthday)' });
              continue;
            }

            const email = emailInput || `s${studentId}@email.kmutnb.ac.th`;

            // check existing
            const exists = await prisma.user.findFirst({ where: { OR: [{ studentId }, { email }] } });
            if (exists) {
              errors.push({ row: rowNumber, error: 'User already exists (studentId or email)' });
              continue;
            }

            // resolve majorId by name (case-insensitive)
            let majorId = null;
            if (majorInput) {
              const major = await prisma.major.findFirst({ where: { name: { equals: majorInput, mode: 'insensitive' } } });
              if (!major) {
                errors.push({ row: rowNumber, error: `Major '${majorInput}' not found` });
                continue;
              }
              majorId = major.id;
            }



            // Use raw birthday string as password input (do NOT parse/format).
            const birthdayStored = birthdayRaw;
            const passwordRaw = birthdayRaw;
            const passwordHash = await bcrypt.hash(passwordRaw, 10);

            await prisma.user.create({ data: {
              studentId,
              fullname,
              email,
              password: passwordHash,
              phone: phone || null,
              majorId: majorId,
              userType: 'student',
              birthday: birthdayStored,
              status: 'active'
            }});

            created++;
          } catch (err) {
            errors.push({ row: rowNumber, error: err.message });
          }
        }

        try { await unlinkAsync(req.file.path); } catch (e) {}
        try { if (req.user) await prisma.log.create({ data: { action: 'import_students', fullname: req.user.fullname || 'unknown', role: req.user.role || 'unknown', description: `Imported ${created} students, ${errors.length} errors` } }); } catch (e) {}

        res.status(201).json({ message: 'Import finished', created, errors });
      })
      .on('error', (err) => {
        console.error(err);
        res.status(500).json({ error: err.message });
      });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ดึงไฟล์กิจกรรมตาม ID
export const getFileActivityById = async (req, res) => {
  try {
    const { id } = req.params;

    const file = await prisma.fileActivity.findUnique({
      where: { id },
      include: {
        activity: {
          include: {
            department: true,
            responsible: {
              select: {
                id: true,
                fullname: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!file) {
      return res.status(404).json({ error: "ไม่พบไฟล์" });
    }

    res.json(file);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// อัปโหลดไฟล์กิจกรรม
export const uploadFileActivity = async (req, res) => {
  try {
    const { activityId } = req.body;

    if (!activityId) {
      return res.status(400).json({ error: "กรุณาระบุกิจกรรม" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "กรุณาเลือกไฟล์" });
    }

    // ตรวจสอบว่ากิจกรรมมีอยู่จริง
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      // ลบไฟล์ที่อัปโหลดมา
      await unlinkAsync(req.file.path);
      return res.status(404).json({ error: "ไม่พบข้อมูลกิจกรรม" });
    }

    const newFile = await prisma.fileActivity.create({
      data: {
        activityId,
        filepath: req.file.path,
      },
      include: {
        activity: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json(newFile);
  } catch (error) {
    // ลบไฟล์ถ้ามี error
    if (req.file) {
      try {
        await unlinkAsync(req.file.path);
      } catch (unlinkError) {
        console.error("Error deleting file:", unlinkError);
      }
    }
    res.status(500).json({ error: error.message });
  }
};

// ลบไฟล์กิจกรรม
export const deleteFileActivity = async (req, res) => {
  try {
    const { id } = req.params;

    const existingFile = await prisma.fileActivity.findUnique({
      where: { id },
    });

    if (!existingFile) {
      return res.status(404).json({ error: "ไม่พบไฟล์" });
    }

    // ลบไฟล์จาก filesystem
    try {
      if (fs.existsSync(existingFile.filepath)) {
        await unlinkAsync(existingFile.filepath);
      }
    } catch (fileError) {
      console.error("Error deleting physical file:", fileError);
    }

    // ลบข้อมูลจาก database
    await prisma.fileActivity.delete({
      where: { id },
    });

    res.json({ message: "ลบไฟล์เรียบร้อยแล้ว" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ดาวน์โหลดไฟล์กิจกรรม
export const downloadFileActivity = async (req, res) => {
  try {
    const { id } = req.params;

    const file = await prisma.fileActivity.findUnique({
      where: { id },
    });

    if (!file) {
      return res.status(404).json({ error: "ไม่พบไฟล์" });
    }

    // ตรวจสอบว่าไฟล์มีอยู่จริง
    if (!fs.existsSync(file.filepath)) {
      return res.status(404).json({ error: "ไฟล์ไม่พบในระบบ" });
    }

    // ส่งไฟล์
    const filename = path.basename(file.filepath);
    res.download(file.filepath, filename);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ดึงไฟล์ทั้งหมดของกิจกรรมหนึ่ง
export const getFilesByActivity = async (req, res) => {
  try {
    const { activityId } = req.params;

    const files = await prisma.fileActivity.findMany({
      where: {
        activityId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// อัปโหลดหลายไฟล์พร้อมกัน
export const uploadMultipleFileActivities = async (req, res) => {
  try {
    const { activityId } = req.body;

    if (!activityId) {
      return res.status(400).json({ error: "กรุณาระบุกิจกรรม" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "กรุณาเลือกไฟล์" });
    }

    // ตรวจสอบว่ากิจกรรมมีอยู่จริง
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      // ลบไฟล์ทั้งหมดที่อัปโหลดมา
      for (const file of req.files) {
        await unlinkAsync(file.path);
      }
      return res.status(404).json({ error: "ไม่พบข้อมูลกิจกรรม" });
    }

    // สร้างข้อมูลไฟล์ทั้งหมด
    const filePromises = req.files.map((file) =>
      prisma.fileActivity.create({
        data: {
          activityId,
          filepath: file.path,
        },
      })
    );

    const newFiles = await Promise.all(filePromises);

    res.status(201).json({
      message: "อัปโหลดไฟล์สำเร็จ",
      files: newFiles,
      count: newFiles.length,
    });
  } catch (error) {
    // ลบไฟล์ทั้งหมดถ้ามี error
    if (req.files) {
      for (const file of req.files) {
        try {
          await unlinkAsync(file.path);
        } catch (unlinkError) {
          console.error("Error deleting file:", unlinkError);
        }
      }
    }
    res.status(500).json({ error: error.message });
  }
};



