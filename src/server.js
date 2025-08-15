import http from 'http';
import app from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 4556;

// สร้าง HTTP Server
const server = http.createServer(app);

// เริ่มรันเซิร์ฟเวอร์
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

// Export the server for testing purposes
export default server;

