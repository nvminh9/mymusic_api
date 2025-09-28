const express = require('express');
const router = express.Router();
const { uploadMusic } = require("../config/multerConfig")

const musicController = require('../app/controllers/MusicController');

// Khai báo các route
router.post('/upload', 
    // uploadMusic.single("audioFile")
    uploadMusic.fields([
        { name: 'audioAndMediaFiles' }
    ])
    , musicController.uploadMusic) // Đăng bài nhạc
router.delete('/:songId', musicController.deleteSong); // Xóa bài nhạc 
router.patch('/:songId/update', 
    uploadMusic.fields([{ name: 'audioAndMediaFiles' }]), 
    musicController.updateSong); // Chỉnh sửa bài nhạc   
router.post('/:songId/like', musicController.createLikeSong); // Thích bài nhạc
router.patch('/:songId/unlike', musicController.unLikeSong); // Hủy thích bài nhạc
router.get('/:userId', musicController.getListMusicOfUser); // Lấy danh sách các bài nhạc của user
router.get('/recommend/next', musicController.getNextSongRecommend); // Đề xuất bài nhạc tiếp theo
router.get('/', musicController.index); // route '/' để ở dưới cùng

module.exports = router;