import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
import { parse } from 'csv-parse';
import fs from 'fs';
import dayjs from 'dayjs';
import path from 'path';
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

// GET /api/files/:id
export const getFileById = async (req, res) => {
    try {
        const { id } = req.params;
        const fileActivity = await prisma.fileActivity.findUnique({ where: { id } });
            if (!fileActivity) {
                await logAction('get_file', req, `File with ID '${id}' not found.`);
                return res.status(404).json({ message: `File with ID '${id}' not found.` });
            }
        const filePath = path.join(__dirname, '../../uploads/fileActivities', fileActivity.filepath);
            if (!fs.existsSync(filePath)) {
                await logAction('get_file', req, `File '${fileActivity.filepath}' not found on server.`);
                return res.status(404).json({ message: 'File not found on server.' });
            }
        // Set content type by file extension
        const ext = path.extname(fileActivity.filepath).toLowerCase();
        if (ext === '.pdf') {
            res.setHeader('Content-Type', 'application/pdf');
        } else if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
            res.setHeader('Content-Type', `image/${ext.replace('.', '')}`);
        } else {
            res.setHeader('Content-Type', 'application/octet-stream');
        }
        await logAction('get_file', req, `File '${fileActivity.filepath}' sent to client.`);
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error fetching file:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};




