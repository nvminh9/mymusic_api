const dotenv = require('dotenv');
dotenv.config();
const { ListeningHistory, Song, User } = require('../app/models/sequelize');

// Hàm kiểm tra xem timestamp đã cách 5 phút so với hiện tại chưa
function isMoreThanFiveMinutesAgo(timestamp) {
  const now = Date.now(); // thời gian hiện tại (milliseconds)
  const time = new Date(timestamp).getTime(); // convert về milliseconds
  const diff = now - time;

  return diff > 5 * 60 * 1000; // 5 phút = 300,000 ms
}
// Thực hiện tạo listening history (CREATE)
const createListeningHistoryService = async (data) => {
    try {
        // Thực hiện tìm xem đã có bài nhạc trong Listening History chưa
        const existinglisteningHistory = await ListeningHistory.findOne({
            where: {
                userId: data.userId,
                songId: data.songId,
            },
        });

        // Kiểm tra
        if(existinglisteningHistory){
            // Kiểm tra xem lịch sử lưu trước đó đã quá 5 phút chưa
            const isListeningHistoryOld = isMoreThanFiveMinutesAgo(existinglisteningHistory.playedAt);
            if(isListeningHistoryOld){
                // Tạo mới
                const listeningHistory = await ListeningHistory.create({
                    userId: data.userId,
                    songId: data.songId,
                });
                // Kết quả
                return {
                    status: 200,
                    message: 'Tạo lịch sử nghe cho bài nhạc thành công',
                    data: listeningHistory
                };
            } else {
                // Cập nhật
                const updateListeningHistory = await existinglisteningHistory.update({
                    playedAt: new Date().toISOString()
                });
                // Kết quả
                return {
                    status: 200,
                    message: 'Cập nhật lịch sử nghe cho bài nhạc thành công',
                    data: updateListeningHistory
                };
            }
        } else {
            // Tạo mới
            const listeningHistory = await ListeningHistory.create({
                userId: data.userId,
                songId: data.songId,
            });
            // Kết quả
            return {
                status: 200,
                message: 'Tạo lịch sử nghe cho bài nhạc thành công',
                data: listeningHistory
            };
        }
        // Kết quả
        // return {
        //     status: 200,
        //     message: 'Tạo danh sách phát thành công',
        //     data: playlist
        // };
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
}

// Thực hiện lấy dữ liệu Listening History (Detail)
const getListeningHistoryService = async (listeningHistoryId) => {
    try {
        // Thực hiện tìm listening history theo id
        const listeningHistory = await ListeningHistory.findByPk(
            listeningHistoryId,
            {
                include: {
                    model: Song,
                }
            }
        );

        // Kiểm tra
        if(!listeningHistory){
            return {
                status: 200,
                message: 'Không tìm thấy',
                data: null
            };
        }

        // Kết quả
        return {
            status: 200,
            message: 'Tìm thấy',
            data: listeningHistory
        };
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
}

// Thực hiện lấy dữ liệu Listening History Data (các bài có trong listening history)
const getListeningHistoryDataService = async (data) => {
    try {
        // Thực hiện tìm
        const { count, rows } = await ListeningHistory.findAndCountAll({
            where: { 
                userId: data.userId    
            },
            order: [['playedAt', 'DESC']],
            limit: data.limit,
            offset: data.offset,
            include: [
                {
                    model: Song,
                    include: {
                        model: User,
                        attributes: ['name','userName','userAvatar']  
                    },
                    // attributes: ['songId', 'name', 'songLink', 'songImage', 'songVideo'],
                },
            ],
        });

        // Kiểm tra
        // if(!listeningHistory){
        //     return {
        //         status: 200,
        //         message: 'Không tìm thấy',
        //         data: null
        //     };
        // }

        // Kết quả
        return {
            status: 200,
            message: 'Lấy lịch sử nghe thành công',
            data: rows,
            pagination: {
                total: count,
                page: data.page,
                totalPages: Math.ceil(count / data.limit),
            },
        };
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
}

// Thực hiện xóa lịch sử nghe (1 item)
const deleteListeningHistoryService = async (listeningHistoryId, authUserId) => {
    try {
        // Tìm lịch sử nghe theo listeningHistoryId
        const listeningHistory = await ListeningHistory.findOne({
            where: {
                listeningHistoryId: listeningHistoryId,
            },
        });

        // Kiểm tra tồn tại không
        if(!listeningHistory){
            return {
                status: 404,
                message: 'Không tìm thấy lịch sử nghe',
                data: null
            };
        }
        // Kiểm tra quyền xóa
        if(listeningHistory.userId !== authUserId){
            return {
                status: 403,
                message: 'Bạn không có quyền xóa lịch sử nghe này',
                data: null
            }
        }

        // Xóa lịch sử nghe
        const deletedListeningHistory = await listeningHistory.destroy();
        if(deletedListeningHistory){
            return {
                status: 200,
                message: 'Xóa lịch sử nghe thành công',
                data: deletedListeningHistory
            };
        } else {
            return {
                status: 200,
                message: 'Xóa lịch sử nghe không thành công',
                data: null
            };
        }
    } catch (error) {
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

module.exports = {
    getListeningHistoryService,
    createListeningHistoryService,
    getListeningHistoryDataService,
    deleteListeningHistoryService
}