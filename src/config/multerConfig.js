const multer = require('multer');
const path = require('path');

// Cấu hình lưu file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'src/assets/image/'); // Thư mục lưu ảnh
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Định danh file duy nhất
    }
});

// Bộ lọc chỉ cho phép ảnh
const imageFileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only images are allowed!'));
    }
};

// Bộ lọc chỉ cho phép file âm thanh
const soundFileFilter = (req, file, cb) => {
    // ...
};

// Cấu hình upload
const upload = multer({
    storage: storage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // Giới hạn 2MB
});

module.exports = { upload };
