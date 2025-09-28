const dotenv = require('dotenv');
dotenv.config();
const fs = require('fs').promises;
const path = require('path');
const { Song, User, LikeSong, ListeningHistory, Playlist } = require('../app/models/sequelize');
const { getEmbedding } = require('../app/ML/embedder');
const sequelize = require("../config/database");
const { QueryTypes } = require('sequelize');
const { getPlaylistService } = require('./playlistService');

// Thực hiện tạo mới một bài nhạc (CREATE)
const createSongService = async (songData) => {
    try {
        // Thực hiện tạo Song record
        const song = await Song.create({
            songId: songData.songId,
            userId: songData.userId,
            name: songData.name,
            songLink: songData.songLink,
        });

        // Kiểm tra
        if(!song){
            return {
                status: 200,
                message: 'Lưu bài nhạc không thành công',
                data: null
            };
        }

        // Kết quả
        return {
            status: 200,
            message: 'Lưu bài nhạc thành công',
            data: song
        };
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
}

// Thực hiện tạo mẫu một bài nhạc, chưa có songLink, để lấy songId (CREAT)
const createSongWithoutSongLinkService = async (authUserId) => {
    try {
        // Thực hiện tạo Song record
        const song = await Song.create({
            userId: authUserId,
            name: "",
            songLink: "",
            duration: null,
        });

        // Kiểm tra
        if(!song){
            return {
                status: 200,
                message: 'Lưu bài nhạc không thành công',
                data: null
            };
        }

        // Kết quả
        return {
            status: 200,
            message: 'Lưu bài nhạc thành công',
            data: song
        };
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
}

// Thực hiện cập nhật Song (UPDATE)
const updateSongService = async (songId, authUserId, data, type) => {
     try {
        // Tìm bài nhạc theo songId
        const song = await Song.findByPk(songId);
        // Kiểm tra tồn tại bài nhạc không
        if(!song){
            return {
                status: 404,
                message: 'Không tìm thấy bài nhạc',
                data: null
            };
        }
        // Kiểm tra quyền cập nhật bài nhạc
        if(song.userId !== authUserId){
            return {
                status: 403,
                message: 'Bạn không có quyền chỉnh sửa bài nhạc này',
                data: null
            }
        }

        // Thực hiện update
        const updatedSong = await song.update(data);

        // Hàm này dùng trong MusicController.updateSong
        if(type === 'update'){
            // Tăng changedCount lên 1
            const changedCount = song.changedCount + 1;
            data.changedCount = changedCount;
            // Kiểm tra name
            if(data.name === song.name){
                data.name = song.name;
            }
            // Xóa các file cũ của bài nhạc sau khi chỉnh sửa (image, video)
            // Xóa file hình
            if(data.songImage || data.songImage === null){
                const songImage = {
                    fileRelativePath: song.dataValues.songImage ? song.dataValues.songImage : null,
                    type: "image"
                };
                // Thực hiện xóa file
                if(songImage.fileRelativePath){
                    deleteFile(`../assets${songImage.fileRelativePath}`);
                }
            }
            // Xóa file video
            if(data.songVideo || data.songVideo === null){
                const songVideo = {
                    fileRelativePath: song.dataValues.songVideo ? song.dataValues.songVideo : null,
                    type: "video"
                };
                // Thực hiện xóa file
                if(songVideo.fileRelativePath){
                    deleteFile(`../assets${songVideo.fileRelativePath}`);
                }
            }
        }
        // // Thực hiện update
        // const updatedSong = await song.update(data);

        // Kết quả cuối
        return {
            status: 200,
            message: 'Chỉnh sửa bài nhạc thành công',
            data: updatedSong
        };

    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Lấy dữ liệu bài nhạc (READ)
const getSongService = async (songId, authUserId) => {
    try{
        // Tìm bài nhạc
        const song = await Song.findByPk(
            songId,
            {
                include: [
                    {   
                        model: User, 
                        attributes: { exclude: ['password','embedding','email'] }, // Không lấy 
                    }
                ],
                attributes: {
                    exclude: ['embedding']
                }
            }
        );

        // Kiểm tra
        if(!song){
            return {
                status: 404,
                message: 'Không tìm thấy bài nhạc',
                data: null
            };
        }

        // THÊM CÁC LƯỢT THÍCH
        // Dùng service getSongLikesService (Lấy các lượt thích của bài nhạc đó, bao gồm data từ model LikeSong)
        const songLikes = await getSongLikesService(songId, authUserId);
        // likes, likeCount, likeStatus
        song.dataValues.likes = songLikes.likes;
        song.dataValues.likeCount = songLikes.likeCount;
        song.dataValues.likeStatus = songLikes.likeStatus;

        // THÊM LƯỢT PHÁT
        // Dùng service getUniqueDailySongPlaysService (lấy lượt phát của bài nhạc (1 người chỉ tính 1 lần 1 ngày))
        // const playCount = await getUniqueDailySongPlaysService(songId);
        // Dùng service getSongPlayCount (lấy lượt nghe của bài nhạc)
        const playCount = await getSongPlayCount(songId);
        song.dataValues.playCount = playCount;

        // Kết quả
        return {
            status: 200,
            message: 'Dữ liệu của bài nhạc',
            data: song
        };
    }catch(error){
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Cập nhật thông tin bài nhạc (UPDATE)
// ...

// Xóa bài nhạc (DELETE)
// ...

// Lấy ra danh sách bài nhạc của người dùng (theo userId)
function collectSongId(songIds, songIdsSet) {
    songIds.forEach(song => {
        if (song.songId) {
            songIdsSet.add(song.songId);
        }
    });
}
const getUserSongs = async (userName, userId, authUserId) => {
    try {
        // Danh sách songId (các bài của user với userId)
        if(userId){
            const songIds = await Song.findAll({
                where: {
                    userId: userId
                },
                attributes: ['songId'],
                order: [["createdAt","DESC"]], // Mới nhất trước
            });

            // Define Set songIds
            const songIdsSet = new Set(); // Set chứa các songId
            collectSongId(songIds, songIdsSet);
            const songIdsArray = [...songIdsSet];
            const songArray = await Promise.all(
                songIdsArray.map(async (songId) => {
                    const song = await getSongService(songId, authUserId);
                    return song.data ? song.data.dataValues : null;
                })
            );

            // Kiểm tra
            if(!songArray?.filter(Boolean)?.length === 0){
                return {
                    status: 404,
                    message: 'Không tìm thấy bài nhạc nào',
                    data: null
                };
            }
            // Kết quả
            return {
                status: 200,
                message: 'Dữ liệu của danh sách bài nhạc',
                data: songArray?.filter(Boolean)
            };
        }
        if(userName){
            const user = await User.findOne({
                where: {
                    userName: userName
                }, 
                attributes: ['userId','userName']
            });

            const songIds = await Song.findAll({
                where: {
                    userId: user.dataValues.userId
                },
                attributes: ['songId'],
                order: [["createdAt","DESC"]], // Mới nhất trước
            });

            // Define Set songIds
            const songIdsSet = new Set(); // Set chứa các songId
            collectSongId(songIds, songIdsSet);
            const songIdsArray = [...songIdsSet];
            const songArray = await Promise.all(
                songIdsArray.map(async (songId) => {
                    const song = await getSongService(songId, authUserId);
                    return song.data ? song.data.dataValues : null;
                })
            );

            // Kiểm tra
            if(!songArray?.filter(Boolean)?.length === 0){
                return {
                    status: 404,
                    message: 'Không tìm thấy bài nhạc nào',
                    data: null
                };
            }
            // Kết quả
            return {
                status: 200,
                message: 'Dữ liệu của danh sách bài nhạc',
                data: songArray?.filter(Boolean)
            };
        }
        
        // Kết quả
        return {
            status: 200,
            message: 'Không xác định được người dùng, thiếu userName hoặc userId',
            data: null
        };
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
}

// Thực hiện thích bài nhạc
const createLikeSongService = async (songId, userId) => {
    try {        
        // Dùng findOrCreate để kiểm tra xem có record nào tương ứng không (songId, userId)
        // likeSong: type LikeSong Object
        // created: type boolean
        const [likeSong, created] = await LikeSong.findOrCreate(
            {
                where: {
                    songId: songId,
                    userId: userId
                },
            }
        );

        // Kiểm tra trường hợp created true (vừa tạo record mới, status mặc định là 0)
        if(created){
            return {
                status: 200,
                message: 'Thích bài nhạc thành công',
                data: created
            };
        }

        // Kiểm tra nếu có likeSong (đã có record tương ứng)
        // Nếu status 0
        if(likeSong.get({ plain: true }).status === '0'){
            return {
                status: 200,
                message: 'Đã thích bài nhạc trước đó',
                data: likeSong.get({ plain: true })
            };
        }
        // Nếu status 1
        if(likeSong.get({ plain: true }).status === '1'){
            // Cập nhật status thành 0 
            const updateLikeSong = await LikeSong.update(
                { status: 0 },
                {
                    where: {
                        songId: songId,
                        userId: userId
                    }
                }
            );
            // Kiểm tra
            if(updateLikeSong){
                return {
                    status: 200,
                    message: 'Thích bài nhạc thành công',
                    data: updateLikeSong
                };
            } else {
                return {
                    status: 200,
                    message: 'Thích bài nhạc không thành công',
                    data: null
                };
            }
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Thực hiện hủy thích bài nhạc
const unLikeSongService = async (songId, userId) => {
    try {        
        // Tìm record tương ứng (songId, userId)
        const likeSong = await LikeSong.findOne(
            {
                where: {
                    songId: songId,
                    userId: userId
                },
            }
        );
        // Kiểm tra trường hợp likeSong null (Chưa có record tương ứng trong LikeSong)
        if(!likeSong){
            return {
                status: 200,
                message: 'Chưa thích bài nhạc này trước đó',
                data: likeSong
            };
        }

        // Kiểm tra nếu có likeSong (đã có record tương ứng)
        // Nếu status 0
        if(likeSong.get({ plain: true }).status === '0'){
            // Cập nhật status thành 1 
            const updateLikeSong = await LikeSong.update(
                { status: 1 },
                {
                    where: {
                        songId: songId,
                        userId: userId
                    }
                }
            );
            // Kiểm tra
            if(updateLikeSong){
                return {
                    status: 200,
                    message: 'Hủy thích bài nhạc thành công',
                    data: updateLikeSong
                };
            } else {
                return {
                    status: 200,
                    message: 'Hủy thích bài nhạc không thành công',
                    data: null
                };
            }
        }
        // Nếu status 1
        if(likeSong.get({ plain: true }).status === '1'){
            return {
                status: 200,
                message: 'Đã hủy thích bài nhạc trước đó',
                data: likeSong.get({ plain: true })
            };
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Lấy các lượt thích của bài nhạc
const getSongLikesService = async (songId, authUserId) => {
    try {
        const result = {};

        // Lấy thông tin của bài nhạc (để kiểm privacy có cho phép người dùng này xem các lượt thích không)
        const song = await Song.findOne({
            where: {
                songId: songId,
            }
        });

        // Kiểm tra các trường hợp sẽ trả về null
        // Nếu bài nhạc không tồn tại thì trả về null
        if(!song){
            return null;
        } else {
            // Nếu bài nhạc tồn tài nhưng người dùng không xem được do privacy là chỉ mình tôi thì cũng trả về null
            if(song.privacy + '' === '1' && authUserId !== song.userId){
                return null;
            }
        }

        // Lấy CÁC LƯỢT THÍCH của bài nhạc
        const songLikes = await LikeSong.findAll({
            where: {
                songId: songId,
                status: 0
            },
            // include: [{ model: User, attributes: { exclude: ['password'] } }], // Không lấy password
            order: [['createdAt', 'DESC']] // Sắp xếp theo ngày tạo mới nhất
            // order: [['createdAt', 'ASC']] // Sắp xếp theo ngày tạo cũ nhất
        });

        // Lấy lượt thích của authUser
        const authUserLike = await LikeSong.findOne({
            where: {
                songId: songId,
                userId: authUserId,
                status: 0
            }
        });

        // Kiểm tra
        if(songLikes){
            result.likes = songLikes;
            result.likeCount = songLikes.length;
            if(authUserLike){
                result.likeStatus = true;
            } else {
                result.likeStatus = false;
            }
            return result;
        } else {
            return null;
        }

        // return result;
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Lấy lượt phát của bài nhạc (unique daily listens)
const getUniqueDailySongPlaysService = async (songId) => {
    // Thực hiện lấy lượt nghe của bài nhạc (chỉ tính 1 người 1 lượt / 1 ngày)
    const result = await ListeningHistory.findAll({
        attributes: [
            [sequelize.fn("DATE", sequelize.col("playedAt")), "day"],
            "userId",
        ],
        where: { songId },
        group: ["userId", sequelize.fn("DATE", sequelize.col("playedAt"))],
        raw: true,
    });
    // Kết quả
    return result.length;
};

// Lấy lượt phát của bài nhạc (record count)
const getSongPlayCount = async (songId) => {
    const playCount = await ListeningHistory.count({
        where: {
            songId
        }
    });
    // Kết quả
    return playCount;
};

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
// Thực hiện xóa bài nhạc
const deleteSongService = async (songId, authUserId) => {
    try {
        // Tìm bài nhạc theo songId
        const song = await Song.findOne({
            where: {
                songId: songId,
            },
            include: [User]
        });

        // Kiểm tra tồn tại bài nhạc không
        if(!song){
            return {
                status: 404,
                message: 'Không tìm thấy bài nhạc',
                data: null
            };
        }
        // Kiểm tra quyền xóa bài nhạc
        if(song.userId !== authUserId){
            return {
                status: 403,
                message: 'Bạn không có quyền xóa bài nhạc này',
                data: null
            }
        }

        // Xóa bài nhạc
        const deletedSong = await song.destroy();
        if(deletedSong){
            // Xóa các file của bài nhạc (audio, image, video)
            const songImage = {
                fileRelativePath: song.dataValues.songImage ? song.dataValues.songImage : null,
                type: "image"
            };
            const songVideo = {
                fileRelativePath: song.dataValues.songVideo ? song.dataValues.songVideo : null,
                type: "video"
            };
            const songAudio = {
                folderRelativePath: song.songId ? `/audio/hls/${song.dataValues.songId}` : null,
                fileRelativePath: song.songLink ? `/audio/${song.songLink.split("/")[4].split(".mp3.hls.m3u8")[0]}.mp3` : null,
                type: "audio"
            };
            // Thực hiện xóa các file
            if(songImage.fileRelativePath){
                deleteFile(`../assets${songImage.fileRelativePath}`);
            }
            if(songVideo.fileRelativePath){
                deleteFile(`../assets${songVideo.fileRelativePath}`);
            }
            if(songAudio.folderRelativePath){
                deleteFolder(`../assets${songAudio.folderRelativePath}`);
            }
            if(songAudio.fileRelativePath){
                deleteFile(`../assets${songAudio.fileRelativePath}`);                
            }
        } else {
            return {
                status: 200,
                message: 'Xóa bài nhạc không thành công',
                data: null
            };
        }

        // Kết quả cuối
        return {
            status: 200,
            message: 'Xóa bài nhạc thành công',
            data: deletedSong
        };
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

const embeddingSong = async (songId, { name }) => {
//   const source = [name, description].filter(Boolean).join(' . ');
  const source = name;
  const vec = await getEmbedding(source);
  await sequelize.query(`UPDATE "song" SET "embedding" = $1 WHERE "songId" = $2`, [vec, songId]);
}

const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
}

// Lấy dữ liệu cho đề xuất bài nhạc tiếp theo (READ)
const getNextSongRecommendService = async (songId, authUserId) => {
    try{
        // Tìm bài nhạc
        const currentSong = await Song.findByPk(songId);
        // Kiểm tra
        if(!currentSong){
            return {
                status: 200,
                message: 'Không tìm thấy bài nhạc',
                data: null
            }
        }

        // 1. Gợi ý theo ngữ nghĩa (Embedding với pgvector)
        const semanticResults = await sequelize.query(
            `
            SELECT "songId" AS id, "embedding" <-> :embedding AS distance
            FROM "song"
            WHERE "songId" != :songId AND "embedding" IS NOT NULL
            ORDER BY "embedding" <-> :embedding
            LIMIT 5
            `,
            
            {
                replacements: {
                    embedding: currentSong.embedding,
                    songId: currentSong.songId,
                },
                type: QueryTypes.SELECT,
            }
        );

        // 2. Nếu ít kết quả → fallback theo cùng thể loại
        // let genreResults = [];
        // if (semanticResults.length < 5) {
        //     genreResults = await Song.findAll({
        //         where: {
        //             genreId: currentSong.genreId,
        //             id: { [sequelize.Op.ne]: currentSong.id },
        //         },
        //         limit: 5,
        //     });
        // }

        // 3. TODO: Có thể thêm Collaborative Filtering theo userId

        // Sort theo distance (khoảng cách của vector trong embedding)
        // semanticResults?.sort((a, b) => a.distance - b.distance); 
        const semanticResultsShuffled = shuffleArray(semanticResults);
        // const nextSong = await getSongService(semanticResults[0].id, authUserId);
        // Dùng service getSongService để lấy dữ liệu cho bài nhạc được đề xuất
        const nextSongArray = await Promise.all(
            semanticResultsShuffled.map(async (item) => {
                const song = await getSongService(item.id, authUserId);
                return song && song?.data ? song?.data?.dataValues : null;
            })
        );

        // Kết quả
        return {
            status: 200,
            message: 'Đề xuất bài nhạc tiếp theo',
            data: {
                currentSong: currentSong ? currentSong : null,
                nextSongRecommend: nextSongArray,
            }
        };
    }catch(error){
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

module.exports = {
    createSongService,
    createSongWithoutSongLinkService,
    getUserSongs,
    updateSongService,
    getSongService,
    createLikeSongService,
    unLikeSongService,
    getSongLikesService,
    deleteSongService,
    getNextSongRecommendService,
}