const express = require('express');
const app = express();
const morgan = require('morgan');
const route = require('./routes');
const cors = require('cors');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { initSocket } = require('./socket.js');
const dotenv = require('dotenv');
dotenv.config();

// Cron, background jobs
const trendingSongJobs = require('./jobs/trendingSongJobs');
const genreTrendingJobs = require('./jobs/genreTrendingJobs');

// -- Config database (PostgreSQL) --
const { sequelize, Genre } = require('./app/models/sequelize');
// Sync (Đồng bộ lại database)
(async () => {
    try {        
        // Bật extension pg_trgm
        await sequelize.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
        console.log('✅ pg_trgm extension enabled');
        
        // Bật extension pgvector
        await sequelize.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
        console.log('✅ pgvector extension enabled');

        // await sequelize.sync({ alter: true }); // Chỉ cập nhật những thứ thay đổi
        // await sequelize.sync({ force: true }); // Xóa và tạo lại bảng
        await sequelize.sync(); // Tạo bảng nếu nó chưa tồn tại

        // Tạo các thể loại nhạc
        const allGenre = await Genre.findAll();
        if(allGenre?.length === 0){
            await Genre.bulkCreate(
                [
                    { name: "Pop" },
                    { name: "Rock" },
                    { name: "Jazz" },
                    { name: "Blues" },
                    { name: "R&B/Soul" },
                    { name: "Hip Hop" },
                    { name: "EDM" },
                ]
            );
            console.log('✅ Đã tạo các thể loại nhạc');
        } else {
            console.log('✅ Đã có các thể loại nhạc');
        }

        console.log("✅ Database đã được đồng bộ!");
    } catch (error) {
        console.error('❌ Sync database err:', error);
    }
})();

// -- Config App Port --
const port = process.env.port || 3700;

// -- Config Request Log --
// Log all request
app.use(morgan('combined'));

// -- Config CORS --
// CORS
app.use(cors());

// -- Config req.body --
app.use(express.json()); // for json
app.use(express.urlencoded({ extended: true })); // for form data

// config static file
app.use(express.static(path.join(__dirname, 'assets'))); // Không cần Auth

// -- Config App Route --
// Route Init
route(app);

// Create HTTP server
const server = http.createServer(app);

// Initialize socket.io and attach to server
const io = initSocket(server);

// 
server.listen(port, () => {
    console.log(`Server running on port ${port}`);

    // Start All Jobs
    trendingSongJobs.startAllJobs(); // Trending Song Jobs
    genreTrendingJobs.startAllJobs(); // Genre Trending Jobs

    // On Server Shutdown
    process.on('SIGTERM', () => {
        console.log('SIGTERM received, shutting down...');
        trendingSongJobs.stopAllJobs(); // Clean shutdown
        genreTrendingJobs.stopAllJobs(); // Clean shutdown
        process.exit(0);
    });
    
    process.on('SIGINT', () => {
        console.log('SIGINT received, shutting down...');
        trendingSongJobs.stopAllJobs(); // Clean shutdown
        genreTrendingJobs.stopAllJobs(); // Clean shutdown
        process.exit(0);
    });
})