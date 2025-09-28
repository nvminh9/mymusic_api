const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const { getListOfGenreService } = require("../../../services/genreService");

class GenreController {
    /**
     * Get list of genre
     */
    // [GET] /genre/list  (Lấy danh sách các thể loại nhạc)
    async getListOfGenre(req, res) {
        try {
            // Service
            const listOfGenre = await getListOfGenreService();

            // Kiểm tra
            if(listOfGenre === null){
                // Kết quả
                return res.status(500).json({
                    status: 500,
                    message: 'Internal Error',
                    data: null
                });
            }

            // Kết quả
            return res.status(200).json({
                status: listOfGenre?.status ? listOfGenre?.status : 200,
                message: listOfGenre?.message ? listOfGenre?.message : 'No messages',
                data: listOfGenre?.data ? listOfGenre?.data : null
            });
        } catch (error) {
            console.log(">>> ❌ Error: ", error);
            return null;
        }
    }
}

module.exports = new GenreController();