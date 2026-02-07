import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helper function เพื่อลบข้อมูลอย่างปลอดภัย (ไม่ error ถ้า table ไม่มี)
async function safeDeleteMany(model, modelName) {
  try {
    await model.deleteMany();
    console.log(`   ✓ Cleared ${modelName}`);
  } catch (error) {
    if (error.code === 'P2021') {
      console.log(`   ⚠ Table ${modelName} does not exist, skipping...`);
    } else {
      throw error;
    }
  }
}

async function main() {
  console.log("🌱 Starting seed...");

  // ลบข้อมูลเก่าทั้งหมด (ในลำดับที่ถูกต้อง - child tables ก่อน)
  console.log("🗑️  Cleaning database...");

  await safeDeleteMany(prisma.fileAttendance, 'FileAttendance');
  await safeDeleteMany(prisma.attendance, 'Attendance');
  await safeDeleteMany(prisma.fileActivity, 'FileActivity');
  await safeDeleteMany(prisma.majorJoinActivity, 'MajorJoinActivity');
  await safeDeleteMany(prisma.activity, 'Activity');
  await safeDeleteMany(prisma.log, 'Log');
  await safeDeleteMany(prisma.user, 'User');
  await safeDeleteMany(prisma.major, 'Major');
  await safeDeleteMany(prisma.department, 'Department');
  await safeDeleteMany(prisma.typeActivity, 'TypeActivity');

  console.log("✅ Database cleaned successfully");

  // ข้อมูลแผนกและสาขาตามโครงสร้างจริง
  const departmentData = [
    {
      name: "ครุศาสตร์เครื่องกล",
      majors: [
        "วิศวกรรมเครื่องกล (TM)",
        "วิศวกรรมการผลิตและอุตสาหการ (TP, TTP)",
        "วิศวกรรมแมคคาทรอนิกส์และหุ่นยนต์ (TT)",
        "วิศวกรรมเครื่องกลศึกษา (MTM, S-MTM)",
        "วิศวกรรมเครื่องกลศึกษา (DMEE)"
      ]
    },
    {
      name: "ครุศาสตร์ไฟฟ้า",
      majors: [
        "วิศวกรรมไฟฟ้า (TE, TTE)",
        "วิศวกรรมไฟฟ้า (MTE, S-MTE)",
        "วิศวกรรมไฟฟ้าศึกษา (DTE)",
        "วิศวกรรมไฟฟ้าและพลังงาน (E-DEEE)",
        "วิศวกรรมไฟฟ้าและการศึกษา (TEE)",
        "วิศวกรรมไฟฟ้าและพลังงาน (หลักสูตรภาษาอังกฤษ)"
      ]
    },
    {
      name: "คอมพิวเตอร์ศึกษา",
      majors: [
        "เทคโนโลยีคอมพิวเตอร์ (CED, TCT)",
        "คอมพิวเตอร์ศึกษา (MTCT, S-MTCT)",
        "คอมพิวเตอร์ศึกษา (DTCT, S-DTCT)"
      ]
    },
    {
      name: "ครุศาสตร์เทคโนโลยีและสารสนเทศ",
      majors: [
        "เทคโนโลยีดิจิทัลเทคนิคศึกษา (MET, S-MET)",
        "เทคโนโลยีดิจิทัลเทคนิคศึกษา (DET, S-DET)",
        "เทคโนโลยีสารสนเทศและสื่อสารเพื่อการศึกษา (DICT, S-DICT)",
        "เทคโนโลยีสารสนเทศและการสื่อสารเพื่อการศึกษา (MICT, S-MICT)"
      ]
    },
    {
      name: "ครุศาสตร์โยธา",
      majors: [
        "วิศวกรรมโยธาและการศึกษา (CEE)",
        "วิศวกรรมโยธาและการศึกษา (DCEE)",
        "วิศวกรรมโยธาและการศึกษา (MCEE, S-MCEE, G-MCEE)"
      ]
    },
    {
      name: "บริหารเทคนิคศึกษา",
      majors: [
        "บริหารอาชีวะและเทคนิคศึกษา (TEM)",
        "บริหารอาชีวะและเทคนิคศึกษา (DVTM)"
      ]
    }
  ];

  // สร้างแผนก
  console.log("📂 Creating departments...");
  const departments = [];
  for (const dept of departmentData) {
    const department = await prisma.department.create({
      data: { name: dept.name },
    });
    departments.push({ ...department, majorNames: dept.majors });
  }
  console.log(`✅ Created ${departments.length} departments`);

  // สร้างสาขา
  console.log("📚 Creating majors...");
  const allMajors = [];
  for (const dept of departments) {
    for (const majorName of dept.majorNames) {
      const major = await prisma.major.create({
        data: {
          name: majorName,
          departmentId: dept.id,
        },
      });
      allMajors.push(major);
    }
  }
  console.log(`✅ Created ${allMajors.length} majors`);

  // สร้างประเภทกิจกรรม
  console.log("🏷️  Creating type activities...");
  const typeActivities = await Promise.all([
    prisma.typeActivity.create({ data: { name: "วิชาการ" } }),
    prisma.typeActivity.create({ data: { name: "บริการวิชาการ" } }),
    prisma.typeActivity.create({ data: { name: "จิตอาสา" } }),
  ]);
  console.log(`✅ Created ${typeActivities.length} type activities`);

  // สร้างผู้ดูแลระบบ (Admin)
  console.log("👑 Creating admin user...");
  const adminPassword = await bcrypt.hash("Admin@2025!", 12);
  const admin = await prisma.user.create({
    data: {
      fullname: "ผู้ดูแลระบบ",
      email: "admin@fte.kmutnb.ac.th",
      password: adminPassword,
      phone: "0812345678",
      userType: "admin",
      status: "active",
      departmentId: departments[2].id, // คอมพิวเตอร์ศึกษา
    },
  });
  console.log(`✅ Created admin: ${admin.email}`);

  // สร้างอาจารย์ (1 คนต่อแผนก)
  console.log("👨‍🏫 Creating teachers...");
  const teacherPassword = await bcrypt.hash("Teacher@2025!", 12);
  const teacherData = [
    { fullname: "อาจารย์สมชาย เครื่องกล", email: "somchai.me@fte.kmutnb.ac.th", deptIndex: 0 },
    { fullname: "อาจารย์สมหญิง ไฟฟ้า", email: "somying.ee@fte.kmutnb.ac.th", deptIndex: 1 },
    { fullname: "อาจารย์วิชัย คอมพิวเตอร์", email: "vichai.ced@fte.kmutnb.ac.th", deptIndex: 2 },
    { fullname: "อาจารย์ศิริพร เทคโนโลยี", email: "siriporn.ite@fte.kmutnb.ac.th", deptIndex: 3 },
    { fullname: "อาจารย์ประยุทธ โยธา", email: "prayut.ce@fte.kmutnb.ac.th", deptIndex: 4 },
    { fullname: "อาจารย์กมลวรรณ บริหาร", email: "kamonwan.tem@fte.kmutnb.ac.th", deptIndex: 5 },
  ];

  const teachers = [];
  for (let i = 0; i < teacherData.length; i++) {
    const t = teacherData[i];
    // หา major แรกของแผนกนั้น
    const deptMajor = allMajors.find(m => m.departmentId === departments[t.deptIndex].id);
    const teacher = await prisma.user.create({
      data: {
        fullname: t.fullname,
        email: t.email,
        password: teacherPassword,
        phone: `08${(23456789 + i).toString()}`,
        departmentId: departments[t.deptIndex].id,
        majorId: deptMajor?.id,
        userType: "teacher",
        status: "active",
      },
    });
    teachers.push(teacher);
  }
  console.log(`✅ Created ${teachers.length} teachers`);

  // สร้างนักศึกษาตัวอย่าง (2 คนต่อแผนก)
  console.log("👨‍🎓 Creating students...");
  const studentData = [
    // ครุศาสตร์เครื่องกล
    { studentId: "6701501001", fullname: "นายกิตติพงศ์ เครื่องกล", deptIndex: 0, level: "1" },
    { studentId: "6701501002", fullname: "นางสาวกมลชนก เครื่องกล", deptIndex: 0, level: "2" },
    // ครุศาสตร์ไฟฟ้า
    { studentId: "6702502001", fullname: "นายธนากร ไฟฟ้า", deptIndex: 1, level: "1" },
    { studentId: "6702502002", fullname: "นางสาวพิมพ์ชนก ไฟฟ้า", deptIndex: 1, level: "2" },
    // คอมพิวเตอร์ศึกษา
    { studentId: "6703503001", fullname: "นายวีรภัทร คอมพิวเตอร์", deptIndex: 2, level: "1" },
    { studentId: "6703503002", fullname: "นางสาวสุภาวดี คอมพิวเตอร์", deptIndex: 2, level: "2" },
    // ครุศาสตร์เทคโนโลยีและสารสนเทศ
    { studentId: "6704504001", fullname: "นายอนุชา เทคโนโลยี", deptIndex: 3, level: "1" },
    { studentId: "6704504002", fullname: "นางสาวนิภาพร เทคโนโลยี", deptIndex: 3, level: "2" },
    // ครุศาสตร์โยธา
    { studentId: "6705505001", fullname: "นายชัยวัฒน์ โยธา", deptIndex: 4, level: "1" },
    { studentId: "6705505002", fullname: "นางสาวปิยนุช โยธา", deptIndex: 4, level: "2" },
    // บริหารเทคนิคศึกษา
    { studentId: "6706506001", fullname: "นายสุรศักดิ์ บริหาร", deptIndex: 5, level: "1" },
    { studentId: "6706506002", fullname: "นางสาวรัตนา บริหาร", deptIndex: 5, level: "2" },
  ];

  const students = [];
  for (let i = 0; i < studentData.length; i++) {
    const s = studentData[i];
    const deptMajor = allMajors.find(m => m.departmentId === departments[s.deptIndex].id);
    const student = await prisma.user.create({
      data: {
        studentId: s.studentId,
        fullname: s.fullname,
        email: `s${s.studentId}@student.kmutnb.ac.th`,
        phone: `09${(10000000 + i).toString()}`,
        departmentId: departments[s.deptIndex].id,
        majorId: deptMajor?.id,
        userType: "student",
        level: s.level,
        birthday: "2547-01-01",
        status: "active",
      },
    });
    students.push(student);
  }
  console.log(`✅ Created ${students.length} students`);

  // สร้างกิจกรรมตัวอย่าง
  console.log("🎉 Creating activities...");
  const activities = await Promise.all([
    prisma.activity.create({
      data: {
        name: "กิจกรรมปฐมนิเทศนักศึกษาใหม่",
        description: "กิจกรรมต้อนรับนักศึกษาใหม่ ประจำปีการศึกษา 2568",
        date: dayjs().add(7, "day").toDate(),
        address: "หอประชุมใหญ่",
        departmentId: departments[2].id,
        responsibleId: teachers[2].id,
        typeActivityId: typeActivities[0].id,
        maxPeopleCount: 200,
        hour: 4,
        status: "planned",
      },
    }),
    prisma.activity.create({
      data: {
        name: "Hackathon 2025",
        description: "การแข่งขันพัฒนาซอฟต์แวร์ 24 ชั่วโมง",
        date: dayjs().add(30, "day").toDate(),
        address: "อาคารคณะครุศาสตร์อุตสาหกรรม",
        departmentId: departments[2].id,
        responsibleId: teachers[2].id,
        typeActivityId: typeActivities[0].id,
        maxPeopleCount: 100,
        hour: 24,
        status: "planned",
      },
    }),
    prisma.activity.create({
      data: {
        name: "กิจกรรมจิตอาสาพัฒนาชุมชน",
        description: "กิจกรรมพัฒนาชุมชนรอบมหาวิทยาลัย",
        date: dayjs().subtract(7, "day").toDate(),
        address: "ชุมชนบ้านสวนดอก",
        departmentId: departments[2].id,
        responsibleId: teachers[2].id,
        typeActivityId: typeActivities[2].id,
        peopleCount: 45,
        maxPeopleCount: 50,
        hour: 8,
        status: "completed",
      },
    }),
  ]);
  console.log(`✅ Created ${activities.length} activities`);

  // เชื่อมสาขาเข้ากับกิจกรรม
  console.log("🔗 Linking majors to activities...");
  const cedMajor = allMajors.find(m => m.name.includes("เทคโนโลยีคอมพิวเตอร์"));
  if (cedMajor) {
    await prisma.majorJoinActivity.createMany({
      data: activities.map(a => ({ majorId: cedMajor.id, activityId: a.id })),
      skipDuplicates: true,
    });
  }
  console.log("✅ Linked majors to activities");

  // สร้างการลงทะเบียนเข้าร่วมกิจกรรม
  console.log("📝 Creating attendances...");
  const attendances = await Promise.all([
    prisma.attendance.create({
      data: { userId: students[4].id, activityId: activities[0].id, status: "joined" },
    }),
    prisma.attendance.create({
      data: { userId: students[5].id, activityId: activities[0].id, status: "joined" },
    }),
    prisma.attendance.create({
      data: { userId: students[4].id, activityId: activities[2].id, status: "completed" },
    }),
    prisma.attendance.create({
      data: { userId: students[5].id, activityId: activities[2].id, status: "completed" },
    }),
  ]);
  console.log(`✅ Created ${attendances.length} attendances`);

  // สร้าง Logs
  console.log("📊 Creating logs...");
  const logs = await Promise.all([
    prisma.log.create({
      data: {
        action: "CREATE_USER",
        fullname: admin.fullname,
        role: "admin",
        description: "สร้างบัญชีผู้ดูแลระบบ",
      },
    }),
    prisma.log.create({
      data: {
        action: "CREATE_ACTIVITY",
        fullname: teachers[2].fullname,
        role: "teacher",
        description: `สร้างกิจกรรม: ${activities[0].name}`,
      },
    }),
  ]);
  console.log(`✅ Created ${logs.length} logs`);

  console.log("");
  console.log("✨ Seed completed successfully!");
  console.log("");
  console.log("📋 Summary:");
  console.log(`   - Departments: ${departments.length}`);
  console.log(`   - Majors: ${allMajors.length}`);
  console.log(`   - Type Activities: ${typeActivities.length}`);
  console.log(`   - Admin: 1`);
  console.log(`   - Teachers: ${teachers.length}`);
  console.log(`   - Students: ${students.length}`);
  console.log(`   - Activities: ${activities.length}`);
  console.log(`   - Attendances: ${attendances.length}`);
  console.log(`   - Logs: ${logs.length}`);
  console.log("");
  console.log("🔐 Login credentials:");
  console.log("   Admin:   admin@fte.kmutnb.ac.th / Admin@2025!");
  console.log("   Teacher: vichai.ced@fte.kmutnb.ac.th / Teacher@2025!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
