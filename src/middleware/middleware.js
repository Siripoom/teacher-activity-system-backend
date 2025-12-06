import jwt from "jsonwebtoken";

// Middleware สำหรับตรวจสอบ JWT token
export const authenticate = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access Denied, No Token Provided" });
  }

  try {
    const verified = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Invalid Token" });
  }
};

// Middleware เดิม (เพื่อ backward compatibility)
export const authMiddleware = authenticate;

// Middleware สำหรับตรวจสอบบทบาท admin
export const isAdmin = (req, res, next) => {
  if (req.user.userType !== "admin") {
    return res.status(403).json({ message: "Access Denied, Admin Only" });
  }
  next();
};

// Middleware สำหรับตรวจสอบบทบาท teacher หรือ admin
export const isTeacherOrAdmin = (req, res, next) => {
  if (req.user.userType !== "teacher" && req.user.userType !== "admin") {
    return res
      .status(403)
      .json({ message: "Access Denied, Teacher or Admin Only" });
  }
  next();
};
