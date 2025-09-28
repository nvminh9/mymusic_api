const express = require('express');
const router = express.Router();
const { upload } = require("../config/multerConfig")

const playlistController = require('../app/controllers/PlaylistController');

// Khai báo các route
router.post('/create', 
    upload.fields([
        { name: 'playlistCoverImage' }
    ])
    , playlistController.createPlaylist) // Tạo playlist
router.delete('/:playlistId', playlistController.deletePlaylist); // Xóa playlist
router.patch('/:playlistId/update', 
    upload.fields([{ name: 'playlistCoverImage' }]), 
    playlistController.updatePlaylist); // Chỉnh sửa danh sách nhạc
router.get('/:userId', playlistController.getListPlaylistOfUser); // Lấy danh sách các playlist của user
router.post('/add', playlistController.addMusicToPlaylist); // Thêm nhạc vào danh sách phát
router.delete('/:playlistId/remove/:songId', playlistController.removeMusicFromPlaylist); // Xóa nhạc khỏi danh sách phát
router.get('/', playlistController.index); // route '/' để ở dưới cùng

module.exports = router;