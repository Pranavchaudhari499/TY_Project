// backend/middleware/multer.js
const multer = require('multer');
const path = require('path');

// Set up storage engine for multer. We'll use memory storage.
const storage = multer.memoryStorage();

// Initialize multer with storage and file filter
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
}).single('bloodReport'); // 'bloodReport' is the name of the input field

// Check file type
function checkFileType(file, cb) {
  // Allowed ext
  const filetypes = /jpeg|jpg|png|pdf/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: PDFs and Images Only!');
  }
}

module.exports = upload;