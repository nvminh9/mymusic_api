const fs = require('fs');
const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const { createPlaylistService, getPlaylistService, getListPlaylistOfUserService, addMusicToPlaylistService, removeMusicFromPlaylistService, deletePlaylistService, updatePlaylistService } = require('../../../services/playlistService');
const { getEmbedding } = require('../../ML/embedder');

class PlaylistController{

    // [GET] /playlist?p=<playlistId>
    async index(req, res){
        try {
            const result = {};
            const playlistId = req.query.p;

            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const authUserId = decoded.id;

            // Service 
            const playlist = await getPlaylistService(playlistId, authUserId);
            // Kiểm tra
            if(playlist === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = playlist?.status ? playlist?.status : 200;
            result.message = playlist?.message ? playlist?.message : 'No messages';
            result.data = playlist?.data ? playlist?.data : null;
            return res.status(playlist?.status ? playlist?.status : 200).json(result);             
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    }

    // [POST] /playlist/create (Tạo playlist)
    async createPlaylist(req, res) {
        try {
            const result = {};
            const coverImageFile = req.files["playlistCoverImage"] ? req.files["playlistCoverImage"][0] : null;
            // name: tiêu đề
            // description: mô tả
            // type: loại (default là danh sách phát bình thường, album)
            // privacy: chế độ đăng (0: công khai, 1: riêng tư)
            // userTags (String): chuỗi các tag (@userName)
            const { name, description, type, privacy, userTags } = req.body;
            
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            const authUserName = decoded.userName;

            // Tạo Embedding
            const playlistEmbedding = await getEmbedding(`${name || ""}${description || ""}${authUserName || ""}${userTags || ""}`);
            // Data
            const playlistData = {
                userId,
                name,
                description,
                coverImage: coverImageFile ? `/image/${coverImageFile.filename}` : null,
                type,
                privacy,
                userTags,
                embedding: `[${playlistEmbedding.join(',')}]`,
            };

            // Service
            const playlist = await createPlaylistService(playlistData);

            // Kiểm tra            
            if(playlist === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = playlist?.status ? playlist?.status : 200;
            result.message = playlist?.message ? playlist?.message : 'No messages';
            result.data = playlist?.data ? playlist?.data : null;
            return res.status(playlist?.status ? playlist?.status : 200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    }

    // [GET] /playlist/:userId (List playlist với userId là người tạo)
    async getListPlaylistOfUser(req, res) {
        try {
            const result = {};
            const { userId } = req.params;
            
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const authUserId = decoded.id;

            // Service
            const playlists = await getListPlaylistOfUserService(userId, authUserId);

            // Kiểm tra            
            if(playlists === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = playlists?.status ? playlists?.status : 200;
            result.message = playlists?.message ? playlists?.message : 'No messages';
            result.data = playlists?.data ? playlists?.data : null;
            return res.status(playlists?.status ? playlists?.status : 200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    }

    // [POST] /playlist/add (Thêm nhạc vào playlist)
    async addMusicToPlaylist(req, res) {
        try {
            const result = {};
            const { playlistId, songId } = req.body;
            
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
                
            // Service
            const data = { playlistId, songId };
            const addMusicToPlaylistResult = await addMusicToPlaylistService(data);
            // Kiểm tra            
            if(addMusicToPlaylistResult === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = addMusicToPlaylistResult?.status ? addMusicToPlaylistResult?.status : 200;
            result.message = addMusicToPlaylistResult?.message ? addMusicToPlaylistResult?.message : 'No messages';
            result.data = addMusicToPlaylistResult?.data ? addMusicToPlaylistResult?.data : null;
            return res.status(result.status).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    }

    // [POST] /playlist/:playlistId/remove/:songId (Xóa nhạc khỏi playlist)
    async removeMusicFromPlaylist(req, res) {
        try {
            const result = {};
            const { playlistId, songId } = req.params;
            
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
                
            // Service
            const data = { playlistId, songId };
            const removeMusicFromPlaylistResult = await removeMusicFromPlaylistService(data);
            // Kiểm tra            
            if(removeMusicFromPlaylistResult === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = removeMusicFromPlaylistResult?.status ? removeMusicFromPlaylistResult?.status : 200;
            result.message = removeMusicFromPlaylistResult?.message ? removeMusicFromPlaylistResult?.message : 'No messages';
            result.data = removeMusicFromPlaylistResult?.data ? removeMusicFromPlaylistResult?.data : null;
            return res.status(result.status).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    }

    // [DELETE] /:playlistId (Xóa playlist)
    async deletePlaylist(req, res){
        try {
            const result = {};
            const { playlistId } = req.params;

            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            
            // Service xóa playlist
            const deletedPlaylist = await deletePlaylistService(playlistId, userId);
            // Kiểm tra
            if(deletedPlaylist === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = deletedPlaylist?.status ? deletedPlaylist?.status : 200;
            result.message = deletedPlaylist?.message ? deletedPlaylist?.message : 'No messages';
            result.data = deletedPlaylist?.data ? deletedPlaylist?.data : null;
            return res.status(deletedPlaylist?.status ? deletedPlaylist?.status : 200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [PATCH] /playlist/:playlistId/update (Chỉnh sửa danh sách nhạc)
    async updatePlaylist(req, res) {
        try {
            const result = {};
            let imageFile;
            for(let i = 0; i < req.files["playlistCoverImage"]?.length; i++){
                if (req.files["playlistCoverImage"][i].mimetype.startsWith("image/")) {
                    imageFile = req.files["playlistCoverImage"][i];
                }
            };
            const { name, removeImage } = req.body; // Tên danh sách phát
            const { playlistId } = req.params
            
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;

            // Prepare Updated Data
            const playlistData = {};
            if(name){
               playlistData.name = name; 
            }
            // Nếu đổi hình khác
            if(imageFile) {
                playlistData.coverImage = `/image/${imageFile.filename}`;
            }
            // Nếu gỡ ảnh (dùng ảnh mặc định)
            if (removeImage === 'true') {
                playlistData.coverImage = null;
            }

            // Service updatePlaylistService
            const playlist = await updatePlaylistService(playlistId, userId, playlistData);

            // Kiểm tra            
            if(playlist === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = playlist?.status ? playlist?.status : 200;
            result.message = playlist?.message ? playlist?.message : 'No messages';
            result.data = playlist?.data ? playlist?.data : null;
            return res.status(playlist?.status ? playlist?.status : 200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    }
}

module.exports = new PlaylistController;