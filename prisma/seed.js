import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // ตัวอย่างข้อมูล student
    const department = await prisma.department.create({
        data: {
            name: 'Computer Education',
            shortName: 'CED',
        }
    })
    const students = 
        {
            id: '0000000000000',
            fullname: 'Test Student',
            departmentId: department.id,
            birthdate: new Date('2000-01-01'),
            email: 'test@example.com',
            phone: '0812345678',
        }
    ;
    await prisma.student.create({ data: students });

    console.log('Seed student success!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
