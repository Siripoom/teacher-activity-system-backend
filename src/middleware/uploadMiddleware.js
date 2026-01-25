import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.mimetype === "application/vnd.ms-excel") {
        cb(null, true);
    } else {
        cb(new Error("Incorrect file type. Please upload a CSV file."), false);
    }
};

export const uploadCSV = multer({
    storage: storage,
    fileFilter: fileFilter,
});
