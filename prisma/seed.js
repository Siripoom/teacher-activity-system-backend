import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // ลบข้อมูลเก่าทั้งหมด
  console.log("🗑️  Cleaning database...");
  await prisma.attendance.deleteMany();
  await prisma.fileActivity.deleteMany();
  await prisma.majorJoinActivity.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.user.deleteMany();
  await prisma.major.deleteMany();
  await prisma.department.deleteMany();
  await prisma.typeActivity.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.log.deleteMany();

  // สร้างแผนก
  console.log("📂 Creating departments...");
  const departments = await Promise.all([
    prisma.department.create({
      data: {
        name: "คอมพิวเตอร์ศึกษา",
      },
    }),
    prisma.department.create({
      data: {
        name: "ครุศาสตร์โยธา",
      },
    }),
    prisma.department.create({
      data: {
        name: "ครุศาสตร์ไฟฟ้า",
      },
    }),
    prisma.department.create({
      data: {
        name: "ครุศาสตร์เครื่องกล",
      },
    }),
    prisma.department.create({
      data: {
        name: "ครุศาสตร์เทคโนโลยีและสารสนเทศ",
      },
    }),
    prisma.department.create({
      data: {
        name: "บริหารเทคนิคศึกษา",
      },
    }),
  ]);

  console.log(`✅ Created ${departments.length} departments`);

  // สร้างสาขา
  console.log("📚 Creating majors...");
  const majors = await Promise.all([
    prisma.major.create({ data: { name: "คอมพิวเตอร์ศึกษา", departmentId: departments[0].id } }),
    prisma.major.create({ data: { name: "ครุศาสตร์โยธา", departmentId: departments[1].id } }),
    prisma.major.create({ data: { name: "ครุศาสตร์ไฟฟ้า", departmentId: departments[2].id } }),
    prisma.major.create({ data: { name: "ครุศาสตร์เครื่องกล", departmentId: departments[3].id } }),
    prisma.major.create({ data: { name: "ครุศาสตร์เทคโนโลยีและสารสนเทศ", departmentId: departments[4].id } }),
    prisma.major.create({ data: { name: "บริหารเทคนิคศึกษา", departmentId: departments[5].id } }),
  ]);
  console.log(`✅ Created ${majors.length} majors`);

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
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      fullname: "ผู้ดูแลระบบ",
      email: "admin@example.com",
      password: adminPassword,
      phone: "0812345678",
      userType: "admin",
      status: "active",
      departmentId: departments[0].id,
    },
  });

  console.log(`✅ Created admin: ${admin.email}`);

  // สร้างอาจารย์
  console.log("👨‍🏫 Creating teachers...");
  const teacherPassword = await bcrypt.hash("teacher123", 10);
  const teachers = await Promise.all([
    prisma.user.create({
      data: {
        fullname: "อาจารย์สมชาย ใจดี",
        email: "somchai@example.com",
        password: teacherPassword,
        phone: "0823456789",
        departmentId: departments[0].id,
        majorId: majors[0].id,
        userType: "teacher",
        status: "active",
      },
    }),
    prisma.user.create({
      data: {
        fullname: "อาจารย์สมหญิง รักเรียน",
        email: "somying@example.com",
        password: teacherPassword,
        phone: "0834567890",
        departmentId: departments[1].id,
        majorId: majors[1].id,
        userType: "teacher",
        status: "active",
      },
    }),
    prisma.user.create({
      data: {
        fullname: "อาจารย์วิชัย ดีงาม",
        email: "vichai@example.com",
        password: teacherPassword,
        phone: "0845678901",
        departmentId: departments[2].id,
        majorId: majors[2].id,
        userType: "teacher",
        status: "active",
      },
    }),
    prisma.user.create({
      data: {
        fullname: "อาจารย์ศิริพร สุขใจ",
        email: "siriporn@example.com",
        password: teacherPassword,
        phone: "0856789012",
        departmentId: departments[3].id,
        majorId: majors[3].id,
        userType: "teacher",
        status: "active",
      },
    }),
    prisma.user.create({
      data: {
        fullname: "อาจารย์ประยุทธ แสงสว่าง",
        email: "prayut@example.com",
        password: teacherPassword,
        phone: "0867890123",
        departmentId: departments[4].id,
        majorId: majors[4].id,
        userType: "teacher",
        status: "active",
      },
    }),
    prisma.user.create({
      data: {
        fullname: "อาจารย์กมลวรรณ ดีงาม",
        email: "kamonwan@example.com",
        password: teacherPassword,
        phone: "0878901234",
        departmentId: departments[5].id,
        majorId: majors[5].id,
        userType: "teacher",
        status: "active",
      },
    }),
  ]);

  console.log(`✅ Created ${teachers.length} teachers`);

  // สร้างนักศึกษา
  console.log("👨‍🎓 Creating students...");
  const students = await Promise.all([
    // นักศึกษาภาควิชาคอมพิวเตอร์ศึกษา
    prisma.user.create({
      data: {
        studentId: "6501101001",
        fullname: "สมศักดิ์ แก้วใส",
        email: "somsak.k@student.ac.th",
        phone: "0867890123",
        departmentId: departments[0].id,
        majorId: majors[0].id,
        userType: "student",
        birthday: "2547-05-15",
        status: "active",
      },
    }),
    prisma.user.create({
      data: {
        studentId: "6501101002",
        fullname: "วิไล ดอกไม้",
        email: "wilai.d@student.ac.th",
        phone: "0878901234",
        departmentId: departments[0].id,
        majorId: majors[0].id,
        userType: "student",
        birthday: "2547-08-20",
        status: "active",
      },
    }),
    // นักศึกษาภาควิชาครุศาสตร์โยธา
    prisma.user.create({
      data: {
        studentId: "6502201001",
        fullname: "ประยุทธ สว่างแสง",
        email: "prayut.s@student.ac.th",
        phone: "0889012345",
        departmentId: departments[1].id,
        majorId: majors[1].id,
        userType: "student",
        birthday: "2547-03-10",
        status: "active",
      },
    }),
    prisma.user.create({
      data: {
        studentId: "6502201002",
        fullname: "กมลวรรณ ใจงาม",
        email: "kamonwan.j@student.ac.th",
        phone: "0890123456",
        departmentId: departments[1].id,
        majorId: majors[1].id,
        userType: "student",
        birthday: "2547-11-25",
        status: "active",
      },
    }),
    // นักศึกษาภาควิชาครุศาสตร์ไฟฟ้า
    prisma.user.create({
      data: {
        studentId: "6503301001",
        fullname: "อนุชา พัฒนา",
        email: "anucha.p@student.ac.th",
        phone: "0801234567",
        departmentId: departments[2].id,
        majorId: majors[2].id,
        userType: "student",
        birthday: "2547-07-18",
        status: "active",
      },
    }),
    prisma.user.create({
      data: {
        studentId: "6503301002",
        fullname: "รัตนา มีสุข",
        email: "rattana.m@student.ac.th",
        phone: "0812345679",
        departmentId: departments[2].id,
        majorId: majors[2].id,
        userType: "student",
        birthday: "2547-12-05",
        status: "active",
      },
    }),
    // นักศึกษาภาควิชาครุศาสตร์เครื่องกล
    prisma.user.create({
      data: {
        studentId: "6504401001",
        fullname: "ชัยวัฒน์ เจริญ",
        email: "chaiwat.c@student.ac.th",
        phone: "0823456780",
        departmentId: departments[3].id,
        majorId: majors[3].id,
        userType: "student",
        birthday: "2547-09-30",
        status: "active",
      },
    }),
    prisma.user.create({
      data: {
        studentId: "6504401002",
        fullname: "ปิยะนุช สดใส",
        email: "piyanut.s@student.ac.th",
        phone: "0834567891",
        departmentId: departments[3].id,
        majorId: majors[3].id,
        userType: "student",
        birthday: "2547-02-14",
        status: "active",
      },
    }),
    // นักศึกษาภาควิชาครุศาสตร์เทคโนโลยีและสารสนเทศ
    prisma.user.create({
      data: {
        studentId: "6505501001",
        fullname: "ธนากร รักษ์ดี",
        email: "thanakorn.r@student.ac.th",
        phone: "0845678902",
        departmentId: departments[4].id,
        majorId: majors[4].id,
        userType: "student",
        birthday: "2547-06-22",
        status: "active",
      },
    }),
    prisma.user.create({
      data: {
        studentId: "6505501002",
        fullname: "นิภาพร สว่างใจ",
        email: "nipaporn.s@student.ac.th",
        phone: "0856789013",
        departmentId: departments[4].id,
        majorId: majors[4].id,
        userType: "student",
        birthday: "2547-04-18",
        status: "active",
      },
    }),
    // นักศึกษาภาควิชาบริหารเทคนิคศึกษา
    prisma.user.create({
      data: {
        studentId: "6506601001",
        fullname: "สุรศักดิ์ มั่นคง",
        email: "surasak.m@student.ac.th",
        phone: "0867890124",
        departmentId: departments[5].id,
        majorId: majors[5].id,
        userType: "student",
        birthday: "2547-01-08",
        status: "active",
      },
    }),
    prisma.user.create({
      data: {
        studentId: "6506601002",
        fullname: "พิมพ์ชนก ดีเลิศ",
        email: "phimchanok.d@student.ac.th",
        phone: "0878901235",
        departmentId: departments[5].id,
        majorId: majors[5].id,
        userType: "student",
        birthday: "2547-10-12",
        status: "active",
      },
    }),
  ]);

  console.log(`✅ Created ${students.length} students`);

  // สร้างกิจกรรม
  console.log("🎉 Creating activities...");
  const activities = await Promise.all([
    prisma.activity.create({
      data: {
        name: "กิจกรรมปฐมนิเทศนักศึกษาใหม่",
        description: "กิจกรรมต้อนรับนักศึกษาใหม่ ประจำปีการศึกษา 2568",
        date: dayjs().add(7, "day").toDate(),
        address: "หอประชุมใหญ่",
        departmentId: departments[0].id,
        responsibleId: teachers[0].id,
        typeActivityId: typeActivities[0].id,
        maxPeopleCount: 200,
        hour: 4,
        status: "planned",
      },
    }),
    prisma.activity.create({
      data: {
        name: "การแข่งขันโครงงานวิศวกรรมโยธา",
        description: "การแข่งขันนำเสนอโครงงานวิศวกรรมโยธาระดับภาควิชา",
        date: dayjs().add(14, "day").toDate(),
        address: "ห้องประชุมภาควิชาครุศาสตร์โยธา",
        departmentId: departments[1].id,
        responsibleId: teachers[1].id,
        typeActivityId: typeActivities[0].id,
        maxPeopleCount: 100,
        hour: 6,
        status: "planned",
      },
    }),
    prisma.activity.create({
      data: {
        name: "สัมมนาเทคโนโลยีไฟฟ้าสมัยใหม่",
        description: "สัมมนาเทคโนโลยีไฟฟ้าและพลังงานทดแทน",
        date: dayjs().add(21, "day").toDate(),
        address: "ห้องประชุมภาควิชาครุศาสตร์ไฟฟ้า",
        departmentId: departments[2].id,
        responsibleId: teachers[2].id,
        typeActivityId: typeActivities[1].id,
        maxPeopleCount: 150,
        hour: 3,
        status: "planned",
      },
    }),
    prisma.activity.create({
      data: {
        name: "การแข่งขันออกแบบเครื่องจักรกล",
        description: "การแข่งขันออกแบบและประกอบเครื่องจักรกล",
        date: dayjs().add(28, "day").toDate(),
        address: "ห้องปฏิบัติการภาควิชาครุศาสตร์เครื่องกล",
        departmentId: departments[3].id,
        responsibleId: teachers[3].id,
        typeActivityId: typeActivities[1].id,
        maxPeopleCount: 80,
        hour: 8,
        status: "planned",
      },
    }),
    prisma.activity.create({
      data: {
        name: "Hackathon 2025",
        description: "การแข่งขันพัฒนาซอฟต์แวร์ 24 ชั่วโมง",
        date: dayjs().add(30, "day").toDate(),
        address: "ภาควิชาครุศาสตร์เทคโนโลยีและสารสนเทศ",
        departmentId: departments[4].id,
        responsibleId: teachers[4].id,
        typeActivityId: typeActivities[0].id,
        maxPeopleCount: 100,
        hour: 24,
        status: "planned",
      },
    }),
    prisma.activity.create({
      data: {
        name: "สัมมนาการบริหารจัดการเทคนิคศึกษา",
        description: "สัมมนาแนวทางการบริหารจัดการสถาบันเทคนิคศึกษา",
        date: dayjs().add(35, "day").toDate(),
        address: "ห้องประชุมภาควิชาบริหารเทคนิคศึกษา",
        departmentId: departments[5].id,
        responsibleId: teachers[5].id,
        typeActivityId: typeActivities[2].id,
        maxPeopleCount: 120,
        hour: 5,
        status: "planned",
      },
    }),
    prisma.activity.create({
      data: {
        name: "กิจกรรมจิตอาสาพัฒนาชุมชน",
        description: "กิจกรรมพัฒนาชุมชนรอบมหาวิทยาลัย",
        date: dayjs().subtract(7, "day").toDate(),
        address: "ชุมชนบ้านสวนดอก",
        departmentId: departments[0].id,
        responsibleId: teachers[0].id,
        typeActivityId: typeActivities[2].id,
        peopleCount: 45,
        maxPeopleCount: 50,
        hour: 8,
        status: "completed",
      },
    }),
  ]);

  console.log(`✅ Created ${activities.length} activities`);

  // เชื่อมสาขาเข้ากับกิจกรรม (ตัวอย่าง)
  console.log("🔗 Linking majors to activities...");
  await prisma.majorJoinActivity.createMany({
    data: [
      { majorId: majors[0].id, activityId: activities[0].id },
      { majorId: majors[1].id, activityId: activities[1].id },
      { majorId: majors[2].id, activityId: activities[2].id },
      { majorId: majors[3].id, activityId: activities[3].id },
      { majorId: majors[4].id, activityId: activities[4].id },
      { majorId: majors[5].id, activityId: activities[5].id },
      { majorId: majors[0].id, activityId: activities[6].id },
    ],
    skipDuplicates: true,
  });

  // สร้างการลงทะเบียนเข้าร่วมกิจกรรม
  console.log("📝 Creating attendances...");
  const attendances = await Promise.all([
    // กิจกรรมที่เสร็จสิ้นแล้ว
    prisma.attendance.create({
      data: {
        userId: students[0].id,
        activityId: activities[4].id,
        status: "completed",
      },
    }),
    prisma.attendance.create({
      data: {
        userId: students[1].id,
        activityId: activities[4].id,
        status: "completed",
      },
    }),
    prisma.attendance.create({
      data: {
        userId: students[2].id,
        activityId: activities[4].id,
        status: "completed",
      },
    }),
    // กิจกรรมที่กำลังจะมาถึง
    prisma.attendance.create({
      data: {
        userId: students[0].id,
        activityId: activities[0].id,
        status: "joined",
      },
    }),
    prisma.attendance.create({
      data: {
        userId: students[1].id,
        activityId: activities[0].id,
        status: "joined",
      },
    }),
    prisma.attendance.create({
      data: {
        userId: students[2].id,
        activityId: activities[1].id,
        status: "joined",
      },
    }),
    prisma.attendance.create({
      data: {
        userId: students[3].id,
        activityId: activities[1].id,
        status: "joined",
      },
    }),
    prisma.attendance.create({
      data: {
        userId: students[4].id,
        activityId: activities[2].id,
        status: "joined",
      },
    }),
    prisma.attendance.create({
      data: {
        userId: students[5].id,
        activityId: activities[2].id,
        status: "joined",
      },
    }),
    prisma.attendance.create({
      data: {
        userId: students[6].id,
        activityId: activities[3].id,
        status: "joined",
      },
    }),
    prisma.attendance.create({
      data: {
        userId: students[7].id,
        activityId: activities[3].id,
        status: "joined",
      },
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
        description: "สร้างบัญชีผู้ใช้ใหม่",
      },
    }),
    prisma.log.create({
      data: {
        action: "CREATE_ACTIVITY",
        fullname: teachers[0].fullname,
        role: "teacher",
        description: `สร้างกิจกรรม: ${activities[0].name}`,
      },
    }),
    prisma.log.create({
      data: {
        action: "UPDATE_ACTIVITY",
        fullname: teachers[0].fullname,
        role: "teacher",
        description: `อัปเดตกิจกรรม: ${activities[4].name}`,
      },
    }),
    prisma.log.create({
      data: {
        action: "JOIN_ACTIVITY",
        fullname: students[0].fullname,
        role: "student",
        description: `ลงทะเบียนเข้าร่วมกิจกรรม: ${activities[0].name}`,
      },
    }),
  ]);

  console.log(`✅ Created ${logs.length} logs`);

  console.log("");
  console.log("✨ Seed completed successfully!");
  console.log("");
  console.log("📋 Summary:");
  console.log(`   - Departments: ${departments.length}`);
  console.log(`   - Admin: 1`);
  console.log(`   - Teachers: ${teachers.length}`);
  console.log(`   - Students: ${students.length}`);
  console.log(`   - Activities: ${activities.length}`);
  console.log(`   - Attendances: ${attendances.length}`);
  console.log(`   - Logs: ${logs.length}`);
  console.log("");
  console.log("🔐 Login credentials:");
  console.log("   Admin:   admin@example.com / admin123");
  console.log("   Teacher: somchai@example.com / teacher123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
