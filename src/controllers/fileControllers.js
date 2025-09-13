import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse';
import fs from 'fs';
import dayjs from 'dayjs';
const prisma = new PrismaClient();

export const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const results = [];
        const errorAdd = [];
        fs.createReadStream(req.file.path)
            .pipe(parse({
                columns: header => header.map(h => h.replace(/['"]/g, '').trim()),
                skip_empty_lines: true
            }))
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                for (const element of results) {
                    const department = await prisma.department.findFirst({
                        where: { shortName: element.department }
                    });
                    console.log(department)

                    if (!department) {
                        errorAdd.push(`Department ${element.department} not found for student ID ${element.id}`);
                        continue;
                    }

                    if (!element.id || !element.fullname || !element.department || !element.birthday) {
                        errorAdd.push(`Missing required fields for student ID ${element.id}`);
                        continue;
                    }

                    const email = "s" + element.id + "@email.kmutnb.ac.th";
                    await prisma.student.create({
                        data: {
                            id: element.id,
                            fullname: element.fullname,
                            departmentId: department.id,
                            birthday: dayjs(element.birthday).format('YYYY-MM-DD'),
                            email: email,
                            status: 'active'
                        }
                    });

                    
                }
                res.status(201).json({ message: 'File processed successfully', errors: errorAdd });
            })
            .on('error', (err) => {
                console.log(err);
                res.status(500).json({ error: err.message });
            });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

