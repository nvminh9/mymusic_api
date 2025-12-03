const dotenv = require('dotenv');
dotenv.config();
const fs = require('fs').promises;
const path = require('path');
const { Playlist, User, PlaylistDetail, Song } = require('../app/models/sequelize');
// const { getSongService } = require('./musicService');

// Hàm thực hiện xóa file
const deleteFile = async (fileRelativePath) => {
  try {
    const filePath = path.join(__dirname, fileRelativePath);
    await fs.unlink(filePath);
    // if (fs.existsSync(filePath)) {
    //     fs.unlinkSync(filePath);
    // }
  } catch (err) {
    console.error('Xoá file thất bại:', err);
  }
};

// Hàm thực hiện xóa thư mục
const deleteFolder = async (folderRelativePath) => {
    try {
        const folderPath = path.join(__dirname, folderRelativePath);
        await fs.rm(folderPath, { recursive: true, force: true });
        // console.log(`Đã xóa thư mục: ${folderPath}`);
    } catch (err) {
        console.error("Lỗi khi xóa thư mục:", err);
    }
}

// Thực hiện tạo một playlist (CREATE)
const createPlaylistService = async (playlistData) => {
    try {
        // Thực hiện tạo Playlist
        const playlist = await Playlist.create({
            userId: playlistData.userId,
            name: playlistData.name,
            description: playlistData.description,
            coverImage: playlistData.coverImage,
            type: playlistData.type,
            privacy: playlistData.privacy,
            userTags: playlistData.userTags,
            embedding: playlistData.embedding ? playlistData.embedding : null,
        });

        // Kiểm tra
        if(!playlist){
            return {
                status: 200,
                message: 'Tạo danh sách phát không thành công',
                data: null
            };
        }

        // Kết quả
        return {
            status: 200,
            message: 'Tạo danh sách phát thành công',
            data: playlist
        };
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
}

// Thực hiện lấy dữ liệu Playlist (READ)
function collectSongId(songIds, songIdsSet) {
    songIds.forEach(song => {
        if (song.songId) {
            songIdsSet.add(song.songId);
        }
    });
}
const getPlaylistService = async (playlistId, authUserId) => {
    try{
        // Require Service
        const { getSongService } = require('./musicService');

        // Tìm playlist
        const playlist = await Playlist.findByPk(
            playlistId,
            {
                include: [
                    {   
                        model: User, 
                        attributes: { exclude: ['password'] }, // Không lấy password 
                    }
                ]
            }
        );

        // Kiểm tra nếu privacy của playlist là 1 (riêng tư)
        if(playlist?.privacy + '' === '1' && authUserId !== playlist.userId){
            return {
                status: 404,
                message: 'Không tìm thấy danh sách phát',
                data: null
            };
        }

        // Các bài trong playlist
        const songIdsInPlaylist = await PlaylistDetail.findAll({
            where: {
                playlistId: playlistId,
            },
            attributes: ["songId"]
        });
        const songIdsSet = new Set(); // Set chứa songId
        collectSongId(songIdsInPlaylist, songIdsSet);
        const songIdsArray = [...songIdsSet];
        // Lấy dữ liệu của mỗi bài nhạc (đầy đủ cả likeStatus, likeCount, likes)
        // const playlistSongs = await Song.findAll({
        //     where: {
        //         songId: [...songIdsSet]
        //     },
        //     order: [['createdAt', 'DESC']],
        //     include: [
        //         {   
        //             model: User, 
        //             attributes: { exclude: ['password'] }, // Không lấy password 
        //         }
        //     ]
        // });
        const songArray = await Promise.all(
            songIdsArray.map(async (songId) => {
                const song = await getSongService(songId, authUserId);
                return song.data ? song.data.dataValues : null;
            })
        );

        // Thêm các bài vào playlist trả về
        // playlist.dataValues.songs = playlistSongs;
        playlist.dataValues.songs = songArray.filter(Boolean);

        // Các user trong userTags
        const userTags = playlist.userTags;
        const userNameSet = new Set(); // Set chứa các userName
        // Nạp userName có trong userTags vào Set
        userTags?.split("@").forEach((item) => {
            if(!!item){
                userNameSet.add(item);
            }
        });
        // Lấy dữ liệu người dùng
        const userTagsData = await User.findAll({
            where: {
                userName: [...userNameSet]
            },
            attributes: ["userId","name", "userName", "userAvatar"],
        });

        // Thêm vào playlist trả về
        playlist.dataValues.userTagsData = userTagsData;

        // Kiểm tra
        if(!playlist){
            return {
                status: 404,
                message: 'Không tìm thấy danh sách phát',
                data: null
            };
        }

        // Kết quả
        return {
            status: 200,
            message: 'Dữ liệu của danh sách phát',
            data: playlist
        };
    }catch(error){
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Thực hiện xóa Playlist (DELETE)
// ...

// Thực hiện lấy ra danh sách playlist của người dùng (theo userId)
const getListPlaylistOfUserService = async (userId, authUserId) => {
    try {
        let privacy = []; // quyền riêng tư của danh sách phát
        if(authUserId === userId){
            privacy = [0,1]; // nếu auth user là owner thì xem được cả công khai và riêng tư
        } else {
            privacy = [0]; // nếu không thì chỉ xem được công khai
        }

        // List playlistId
        const playlistIds = await Playlist.findAll({
            where: {
                userId: userId,
                privacy: privacy,
            },
            attributes: ['playlistId', 'userId', 'createdAt', 'updatedAt', 'privacy'],
            order: [["createdAt","DESC"]], // Mới nhất trước
        });

        // Khởi tạo Set chứa các playlistId
        const playlistIdsSet = new Set(); // Set chứa playlistId
        playlistIds.forEach(playlist => {
            if (playlist.playlistId) {
                playlistIdsSet.add(playlist.playlistId);
            }
        });
        const playlistIdsArray = [...playlistIdsSet];

        // Lấy dữ liệu cho các playlist của user
        const playlistArray = await Promise.all(
            playlistIdsArray.map(async (playlistId) => {
                const playlist = await getPlaylistService(playlistId, authUserId);
                return playlist?.data ? playlist?.data?.dataValues : null;
            })
        );

        // Kiểm tra
        if(playlistArray?.filter(Boolean)?.length === 0){
            return {
                status: 200,
                message: 'Không tìm thấy danh sách phát nào',
                data: []
            };
        }

        // Kết quả
        return {
            status: 200,
            message: 'Các danh sách phát của người dùng',
            data: playlistArray.filter(Boolean)
        };
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
}

// Thực hiện thêm nhạc vào playlist (CREATE)
const addMusicToPlaylistService = async (data) => {
    try {
        // Tìm bài nhạc trong playlist
        const [song, created] = await PlaylistDetail.findOrCreate({
            where: {
                playlistId: data.playlistId,
                songId: data.songId,
            },
        });

        // Kiểm tra
        // Thêm thành công
        if(created){
            return {
                status: 200,
                message: 'Thêm thành công',
                data: created
            };
        }
        // Bài nhạc đã được thêm từ trước
        if(song.get({ plain: true })){
            return {
                status: 200,
                message: 'Đã thêm từ trước đó',
                data: song,
            };
        }
        // Kết quả
        // return {
        //     status: 200,
        //     message: 'Thêm thành công',
        //     data: created
        // };
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
}

// Thực hiện khỏi nhạc khỏi playlist (CREATE)
const removeMusicFromPlaylistService = async (data) => {
    try {
        // Tìm bài nhạc trong playlist
        const song = await PlaylistDetail.findOne({
            where: {
                playlistId: data.playlistId,
                songId: data.songId,
            },
        });

        // Kiểm tra
        // Không tìm thấy bài trong danh sách phát
        if(!song){
            return {
                status: 200,
                message: 'Không tìm thấy bài hát trong danh sách phát',
                data: null
            };
        }
        // Nếu tìm thấy thì thực hiện xóa
        if(song){
            // Xóa record
            const deletedSong = await song.destroy(); 
            // Kết quả
            return {
                status: 200,
                message: 'Xóa thành công',
                data: deletedSong,
            };
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
}

// Thực hiện xóa playlist
const deletePlaylistService = async (playlistId, authUserId) => {
    try {
        // Tìm playlist theo playlistId
        const playlist = await Playlist.findOne({
            where: {
                playlistId: playlistId,
            },
        });

        // Kiểm tra tồn tại không
        if(!playlist){
            return {
                status: 404,
                message: 'Không tìm thấy danh sách phát',
                data: null
            };
        }
        // Kiểm tra quyền xóa
        if(playlist.userId !== authUserId){
            return {
                status: 403,
                message: 'Bạn không có quyền xóa danh sách phát này',
                data: null
            }
        }

        // Xóa playlist
        const deletedPlaylist = await playlist.destroy();
        if(deletedPlaylist){
            // Xóa file ảnh bìa cũ
            const coverImage = {
                fileRelativePath: playlist.dataValues.coverImage ? playlist.dataValues.coverImage : null,
                type: "image"
            };
            // Thực hiện xóa file
            if(coverImage.fileRelativePath){
                deleteFile(`../assets${coverImage.fileRelativePath}`);
            }
            return {
                status: 200,
                message: 'Xóa danh sách phát thành công',
                data: deletedPlaylist
            };
        } else {
            return {
                status: 200,
                message: 'Xóa danh sách phát không thành công',
                data: null
            };
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Thực hiện cập nhật Playlist (UPDATE)
const updatePlaylistService = async (playlistId, authUserId, data) => {
     try {
        // Tìm danh sách phát theo playlistId
        const playlist = await Playlist.findByPk(playlistId);
        // Kiểm tra
        if(!playlist){
            return {
                status: 404,
                message: 'Không tìm thấy danh sách phát',
                data: null
            };
        }
        // Kiểm tra quyền cập nhật danh sách phát
        if(playlist.userId !== authUserId){
            return {
                status: 403,
                message: 'Bạn không có quyền chỉnh sửa danh sách phát này',
                data: null
            }
        }

        // Tăng changedCount lên 1
        const changedCount = playlist.changedCount + 1;
        data.changedCount = changedCount;
        // Kiểm tra name
        if(data.name === playlist.name){
            data.name = playlist.name;
        }
        // Xóa file hình cũ sau khi chỉnh sửa (image)
        if(data.coverImage || data.coverImage === null){
            const coverImage = {
                fileRelativePath: playlist.dataValues.coverImage ? playlist.dataValues.coverImage : null,
                type: "image"
            };
            // Thực hiện xóa file
            if(coverImage.fileRelativePath){
                deleteFile(`../assets${coverImage.fileRelativePath}`);
            }
        }

        // Thực hiện update
        const updatedPlaylist = await playlist.update(data);        
        
        // Kết quả cuối
        return {
            status: 200,
            message: 'Chỉnh sửa danh sách phát thành công',
            data: updatedPlaylist
        };

    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Thực hiện lấy các danh sách phát của người dùng (theo userName)
const getUserPlaylistsService = async (userName, authUserId) => {
    try {
        const user = await User.findOne({
            where: {
                userName: userName
            }, 
            attributes: ['userId','userName']
        });

        let privacy = []; // quyền riêng tư của danh sách phát
        if(authUserId === user.dataValues.userId){
            privacy = [0,1]; // nếu auth user là owner thì xem được cả công khai và riêng tư
        } else {
            privacy = [0]; // nếu không thì chỉ xem được công khai
        }

        // List playlistId
        const playlistIds = await Playlist.findAll({
            where: {
                userId: user.dataValues.userId,
                privacy: privacy,
            },
            attributes: ['playlistId', 'userId', 'createdAt', 'updatedAt', 'privacy'],
            order: [["createdAt","DESC"]], // Mới nhất trước
        });

        // Khởi tạo Set chứa các playlistId
        const playlistIdsSet = new Set(); // Set chứa playlistId
        playlistIds.forEach(playlist => {
            if (playlist.playlistId) {
                playlistIdsSet.add(playlist.playlistId);
            }
        });
        const playlistIdsArray = [...playlistIdsSet];

        // Lấy dữ liệu cho các playlist của user
        const playlistArray = await Promise.all(
            playlistIdsArray.map(async (playlistId) => {
                const playlist = await getPlaylistService(playlistId, authUserId);
                return playlist.data ? playlist.data.dataValues : null;
            })
        );

        // Kiểm tra
        if(playlistArray?.filter(Boolean)?.length === 0){
            return {
                status: 404,
                message: 'Không tìm thấy danh sách phát nào',
                data: null
            };
        }

        // Kết quả
        return {
            status: 200,
            message: 'Các danh sách phát của người dùng',
            data: playlistArray.filter(Boolean)
        };
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

module.exports = {
    createPlaylistService,
    updatePlaylistService,
    getPlaylistService,
    getListPlaylistOfUserService,
    addMusicToPlaylistService,
    removeMusicFromPlaylistService,
    deletePlaylistService,
    getUserPlaylistsService
}