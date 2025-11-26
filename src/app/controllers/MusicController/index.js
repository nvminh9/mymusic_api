const fs = require('fs');
const { v4: uuidv4 } = require("uuid");
const { $ } = require("zx");
const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const { createSongService, createSongWithoutSongLinkService, updateSongService, getSongService, getUserSongs, createLikeSongService, unLikeSongService, deleteSongService, getNextSongRecommendService } = require('../../../services/musicService');
const { type } = require('os');
const { getEmbedding } = require('../../ML/embedder');

class MusicController{

    // [GET] /music?s=<songId>
    async index(req, res){
        try {
            const result = {};
            const songId = req.query.s;
            
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;

            // Service 
            const song = await getSongService(songId, userId);
            // Kiểm tra
            if(song === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = song?.status ? song?.status : 200;
            result.message = song?.message ? song?.message : 'No messages';
            result.data = song?.data ? song?.data : null;
            return res.status(song?.status ? song?.status : 200).json(result);             
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    }

    // [POST] /music/upload (Đăng bài nhạc)
    // file: audioFile
    async uploadMusic(req, res) {
        try {
            const result = {};
            let audioFile;
            let imageFile;
            let videoFile;
            for(let i = 0; i < req.files["audioAndMediaFiles"]?.length; i++){
                if(req.files["audioAndMediaFiles"][i].mimetype.startsWith("audio/")){
                    audioFile = req.files["audioAndMediaFiles"][i];
                } else if (req.files["audioAndMediaFiles"][i].mimetype.startsWith("image/")) {
                    imageFile = req.files["audioAndMediaFiles"][i];
                } else {
                    videoFile = req.files["audioAndMediaFiles"][i];
                }
            };
            const { name, duration, genreName, genreId } = req.body;
            
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            const authUserName = decoded.userName;

            const slash = (await import('slash')).default;

            // Service tạo mẫu Song trong db
            // Để lấy songId
            const songSample = await createSongWithoutSongLinkService(userId);
            // Kiểm tra
            if(songSample === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }
            const songId = songSample.data.songId;

            // Lưu file audio
            const inputPath = slash(audioFile.path); // path theo unix
            const outputDir = slash(`src/assets/audio/hls/${songId}`);
            const outputPath = `${outputDir}/${audioFile.filename}.hls.m3u8`;
            const outputTsFile = `${outputDir}/audio_%03d.ts`;
            // const outputPath = `${outputDir}/output.m3u8`;
            fs.mkdirSync(outputDir);

            // Lệnh ffmpeg để chuyển audio sang HLS
            // await $`ffmpeg -i ${inputPath} -vn -acodec aac -hls_time 10 -hls_playlist_type vod ${outputPath}`;
            // await $`ffmpeg -i ${inputPath} -codec:a aac -b:a 128k -hls_time 10 -hls_playlist_type vod ${outputPath}`
            await $`ffmpeg \
                    -fflags +genpts \
                    -avoid_negative_ts make_zero \
                    -i ${inputPath} \
                    -vn \
                    -c:a aac \
                    -b:a 192k \
                    -ar 44100 \
                    -ac 2 \
                    -profile:a aac_low \
                    -hls_time 10 \
                    -hls_playlist_type vod \
                    -hls_segment_filename ${outputTsFile} \
                    ${outputPath}`;

            // Service lưu music
            // Tạo Song Data
            const songEmbedding = await getEmbedding(`${name || ""}${genreName || ""}${authUserName || ""}`);
            const songData = {
                songLink: `/audio/hls/${songId}/${audioFile.filename}.hls.m3u8`,
                songImage: imageFile ? `/image/${imageFile.filename}` : null,
                songVideo: videoFile ? `/video/${videoFile.filename}` : null,
                name: name ? name : "",
                duration: duration ? duration : null,
                embedding: `[${songEmbedding.join(',')}]`,
                genreId: genreId,
            };
            const song = await updateSongService(songId, userId, songData, 'create');

            // Kiểm tra            
            // (Kiểm tra nếu trường hợp nào tạo không thành công thì sẻ rollback tại việc tạo file hls trước đó (xóa các file hls nếu lưu có lỗi))
            if(song === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = song?.status ? song?.status : 200;
            result.message = 'Lưu bài nhạc thành công';
            result.data = song?.data ? song?.data : null;
            return res.status(song?.status ? song?.status : 200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    }

    // [GET] /music/:userId (List nhạc với userId là người đăng)
    async getListMusicOfUser(req, res) {
        try {
            const result = {};
            const { userId } = req.params;
            
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const authUserId = decoded.id;

            // Service
            const songs = await getUserSongs(null, userId, authUserId);

            // Kiểm tra            
            if(songs === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = songs?.status ? songs?.status : 200;
            result.message = songs?.message ? songs?.message : 'No messages';
            result.data = songs?.data ? songs?.data : null;
            return res.status(songs?.status ? songs?.status : 200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    }

    // [POST] /:songId/like (Thích bài nhạc)
    async createLikeSong(req, res){
        const result = {};
        const { songId } = req.params;

        try {
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            
            // Dùng Service createLikeSongService để tạo lượt thích
            const likeSong = await createLikeSongService(songId, userId);
            // Kiểm tra (nếu likeSong là null, có lỗi ở Service)
            if(likeSong === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả (nếu likeSong khác null, có data)
            result.status = likeSong?.status ? likeSong?.status : 200;
            result.message = likeSong?.message ? likeSong?.message : '';
            result.data = likeSong?.data ? likeSong?.data : null;
            return res.status(200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [PATCH] /:songId/unlike (Hủy thích bài nhạc)
    async unLikeSong(req, res){
        const result = {};
        const { songId } = req.params;

        try {
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            
            // Dùng Service unLikeSongService để hủy lượt thích
            const unlikeSong = await unLikeSongService(songId, userId);
            // Kiểm tra (nếu likeSong là null, có lỗi ở Service)
            if(unlikeSong === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả (nếu unlikeSong khác null, có data)
            result.status = unlikeSong?.status ? unlikeSong?.status : 200;
            result.message = unlikeSong?.message ? unlikeSong?.message : '';
            result.data = unlikeSong?.data ? unlikeSong?.data : null;
            return res.status(200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };    

    // [DELETE] /:songId (Xóa bài nhạc)
    async deleteSong(req, res){
        try {
            const result = {};
            const { songId } = req.params;

            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            
            // Service xóa bài nhạc
            const deletedSong = await deleteSongService(songId, userId);
            // Kiểm tra
            if(deletedSong === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = deletedSong?.status ? deletedSong?.status : 200;
            result.message = deletedSong?.message ? deletedSong?.message : 'No messages';
            result.data = deletedSong?.data ? deletedSong?.data : null;
            return res.status(deletedSong?.status ? deletedSong?.status : 200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [PATCH] /music/:songId/update (Chỉnh sửa bài nhạc)
    async updateSong(req, res) {
        try {
            const result = {};
            let imageFile;
            let videoFile;
            for(let i = 0; i < req.files["audioAndMediaFiles"]?.length; i++){
                if (req.files["audioAndMediaFiles"][i].mimetype.startsWith("image/")) {
                    imageFile = req.files["audioAndMediaFiles"][i];
                } else {
                    videoFile = req.files["audioAndMediaFiles"][i];
                }
            };
            const { name, removeImage, removeVideo } = req.body; // Tên bài nhạc
            const { songId } = req.params
            
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;

            // Prepare Updated Data
            const songData = {};
            if(name){
               songData.name = name; 
            }
            // Nếu đổi hình khác
            if(imageFile) {
                songData.songImage = `/image/${imageFile.filename}`;
            }
            // Nếu gỡ ảnh (dùng ảnh mặc định)
            if (removeImage === 'true') {
                songData.songImage = null;
            }
            // Nếu đổi video khác
            if(videoFile){
                songData.songVideo = `/video/${videoFile.filename}`;
            }
            // Nếu gỡ video
            if (removeVideo === 'true'){
                songData.songVideo = null;
            }

            // Service updateSongService
            const song = await updateSongService(songId, userId, songData, 'update');

            // Kiểm tra            
            if(song === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = song?.status ? song?.status : 200;
            result.message = song?.message ? song?.message : 'No messages';
            result.data = song?.data ? song?.data : null;
            return res.status(song?.status ? song?.status : 200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    }
    
    // [GET] /music/recommend/next?songId=<songId>&userId=<userId> (Đề xuất bài nhạc tiếp theo)
    async getNextSongRecommend(req, res) {
        try {
            const result = {};
            const { songId, userId } = req.query;
            
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const authUserId = decoded.id;

            // Service
            const nextSongRecommend = await getNextSongRecommendService(songId, userId === authUserId ? userId : null);

            // Kiểm tra            
            if(nextSongRecommend === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = nextSongRecommend?.status ? nextSongRecommend?.status : 200;
            result.message = nextSongRecommend?.message ? nextSongRecommend?.message : 'No messages';
            result.data = nextSongRecommend?.data ? nextSongRecommend?.data : null;
            return res.status(nextSongRecommend?.status ? nextSongRecommend?.status : 200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    }

    // Serve HLS Streaming Audio (TEST)
    // [GET] /music/:file (TEST)
    // hlsAudioStreaming(req, res){
    //     console.log("request starting...");
        
    //     var filePath = 'src/assets/audio' + req.url;
    //     console.log(filePath);

    //     fs.readFile(filePath, function(error, content){
    //         res.writeHead(200, 
    //             {
    //                 'Access-Controll-Allow-Origin': '*'
    //             }
    //         );
    //         if(error){
    //             if(error.code == "ENOENT"){
    //                 // fs.readFile('./404.hmtl')
    //                 console.log("Not found");
    //             }else{
    //                 res.writeHead(500);
    //                 res.end("Sorry, check with the site admin for error: "+error.code+'...\n');
    //                 res.end();
    //             }
    //         }else{
    //             res.end(content, 'utf-8');
    //         }
    //     });
    // }
}

module.exports = new MusicController;