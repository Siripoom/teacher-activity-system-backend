import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();



export const createLog = async (user, action , description) => {
    try {
        // Logic to create a log for teacher activity
        const addlogData = await prisma.log.create({
            data: {
                fullname: user.fullname,
                action: action,
                role: user.role,
                description: description,
            }
        });
        return {
            status: 'success',
            message: 'Log created successfully',
            data: addlogData,
        };
        // This is a placeholder function; implement the actual logic as needed
        console.log("Log created for teacher activity");
    } catch (error) {
        return {
            status: 'error',
            message: 'Failed to create log',
            error: error.message,
        };
        console.error("Error creating log for teacher activity:", error);
    }
}


