const multer = require('multer');
const path = require('path');

// Cấu hình lưu file và tên file 
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const isImage = file.mimetype.startsWith("image/");
        const uploadPath = isImage ? "src/assets/image/" : "src/assets/video/";
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // const ext = path.extname(file.originalname);
        const ext = file.originalname;
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + ext);
    }
});

// Bộ lọc chỉ cho phép ảnh và video (image và video)
const fileFilter = (req, file, cb) => {
    const allowedImageTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    const allowedVideoTypes = ["video/mp4", "video/mkv", "video/webm", "video/avi"];
    
    if (allowedImageTypes.includes(file.mimetype) || allowedVideoTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Không đúng định dạng file"), false);
    }
};

// Bộ lọc chỉ cho phép file âm thanh
const soundFileFilter = (req, file, cb) => {
    // ...
};

// Cấu hình upload (image và video)
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 30 * 1024 * 1024 // Giới hạn file 30MB (tính bằng bytes)
    }
});

module.exports = { upload };
