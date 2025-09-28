const fs = require('fs');
const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const { getListeningHistoryService, createListeningHistoryService, getListeningHistoryDataService, deleteListeningHistoryService } = require('../../../services/listeningHistoryService');

class ListeningHistoryController{

    // [GET] /listeningHistory?id=<listeningHistoryId>
    async index(req, res){
        try {
            const result = {};
            const listeningHistoryId = req.query.id;
            
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;

            // Service 
            const listeningHistory = await getListeningHistoryService(listeningHistoryId);
            // Kiểm tra
            if(listeningHistory === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = listeningHistory?.status ? listeningHistory?.status : 200;
            result.message = listeningHistory?.message ? listeningHistory?.message : 'No messages';
            result.data = listeningHistory?.data ? listeningHistory?.data : null;
            return res.status(result.status).json(result);             
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    }

    // [POST] /listeningHistory/create
    async createListeningHistory(req, res){
        try {
            const result = {};
            const { songId } = req.body;
            
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;

            // Service 
            const data = { userId, songId };
            const listeningHistory = await createListeningHistoryService(data);
            // Kiểm tra
            if(listeningHistory === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = listeningHistory?.status ? listeningHistory?.status : 200;
            result.message = listeningHistory?.message ? listeningHistory?.message : 'No messages';
            result.data = listeningHistory?.data ? listeningHistory?.data : null;
            return res.status(result.status).json(result);             
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    }

    // [GET] /listeningHistory/data?page=<number>&limit=<number>
    async getListeningHistoryData(req, res){
        try {
            const result = {};
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            
            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;

            // Service 
            const data = { userId, page, limit, offset };
            const listeningHistoryData = await getListeningHistoryDataService(data);
            // Kiểm tra
            if(listeningHistoryData === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = listeningHistoryData?.status ? listeningHistoryData?.status : 200;
            result.message = listeningHistoryData?.message ? listeningHistoryData?.message : 'No messages';
            result.data = listeningHistoryData?.data ? listeningHistoryData?.data : null;
            result.pagination = listeningHistoryData?.pagination ? listeningHistoryData?.pagination : null;
            return res.status(result.status).json(result);             
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };

    // [DELETE] /:listeningHistoryId (Xóa 1 record lịch sử nghe)
    async deleteListeningHistory(req, res){
        try {
            const result = {};
            const { listeningHistoryId } = req.params;

            // Token
            const token = req.headers.authorization.split(' ')[1];
            // Lấy dữ liệu của auth user
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            
            // Service xóa lịch sử nghe (1 item)
            const deletedListeningHistory = await deleteListeningHistoryService(listeningHistoryId, userId);
            // Kiểm tra
            if(deletedListeningHistory === null){
                result.status = 500;
                result.message = 'Internal error';
                result.data = null;
                return res.status(500).json(result); 
            }

            // Kết quả
            result.status = deletedListeningHistory?.status ? deletedListeningHistory?.status : 200;
            result.message = deletedListeningHistory?.message ? deletedListeningHistory?.message : 'No messages';
            result.data = deletedListeningHistory?.data ? deletedListeningHistory?.data : null;
            return res.status(deletedListeningHistory?.status ? deletedListeningHistory?.status : 200).json(result); 
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    };
}

module.exports = new ListeningHistoryController;