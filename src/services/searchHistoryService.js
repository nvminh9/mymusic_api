const dotenv = require('dotenv');
dotenv.config();
const { User, SearchHistory } = require('../app/models/sequelize');
const e = require('express');
const fs = require('fs').promises;
const path = require('path');

// Thực hiện lưu lịch sử tìm kiếm
// data: { userId, keyword }
const createSearchHistory = async (data) => {
    try{
        // Tìm
        const searchHistory = await SearchHistory.findOne({
            where: {
                userId: data.userId,
                keyword: data.keyword
            }
        });

        // Kiểm tra
        if(searchHistory){
            // Cập nhật searchedAt
            const updateSearchHistory = await searchHistory.update({ 
                searchedAt: new Date().toISOString() 
            });
            // Kết quả
            return {
                status: 200,
                message: 'Lưu lịch sử tìm kiếm thành công',
                data: updateSearchHistory
            };
        } else {
            // Lưu lịch sử tìm kiếm
            const createSearchHistory = await SearchHistory.create(data);
            // Kiểm tra
            if(!createSearchHistory){
                return {
                    status: 200,
                    message: 'Lưu lịch sử tìm kiếm không thành công',
                    data: null
                };
            } else {
                // Kết quả
                return {
                    status: 200,
                    message: 'Lưu lịch sử tìm kiếm thành công',
                    data: createSearchHistory
                };
            }
        }
    }catch(error){
        console.log(">>> ❌ Error: ", error);
        return null;
    }
};

// Thực hiện lấy dữ liệu Search History Data
const getSearchHistoryDataService = async (data) => {
    try {
        // Thực hiện tìm
        const { count, rows } = await SearchHistory.findAndCountAll({
            where: { 
                userId: data.userId    
            },
            order: [['searchedAt', 'DESC']],
            limit: data.limit,
            offset: data.offset,
            include: [
                {
                    model: User,
                    attributes: ['name','userName','userAvatar']  
                },
            ],
        });

        // Kiểm tra
        // if(!searchHistory){
        //     return {
        //         status: 200,
        //         message: 'Không tìm thấy',
        //         data: null
        //     };
        // }

        // Kết quả
        return {
            status: 200,
            message: 'Lấy lịch sử tìm kiếm thành công',
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

// Thực hiện xóa một search history
const deleteSearchHistoryService = async (searchHistoryId) => {
    try {
        // Tìm searchHistory
        const searchHistory = await SearchHistory.findByPk(searchHistoryId);

        // Kiểm tra
        if(!searchHistory){
            return {
                status: 200,
                message: "Không tìm thấy lịch sử tìm kiếm",
                data: null
            };
        }

        // Thực hiện xóa
        const deletedSearchHistory = await searchHistory.destroy();

        // Kiểm tra
        if(deletedSearchHistory){
            return {
                status: 200,
                message: "Xóa lịch sử tìm kiếm thành công",
                data: searchHistory
            };
        } else {
            return {
                status: 200,
                message: "Xóa lịch sử tìm kiếm không thành công",
                data: null
            };
        }
    } catch (error) {
        console.log("Error delete one search history: ",error);
        return null;
    }
};

module.exports = {
    createSearchHistory,
    getSearchHistoryDataService,
    deleteSearchHistoryService
}