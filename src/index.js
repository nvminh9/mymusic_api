const express = require('express');
const app = express();
const morgan = require('morgan');
const route = require('./routes');
const cors = require('cors');
const http = require('http');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

// -- Config database (PostgreSQL) --
const { sequelize, User } = require('./app/models/sequelize');
// Sync (Đồng bộ lại database)
(async () => {
    // await sequelize.sync({ force: true }); // Xóa và tạo lại bảng
    await sequelize.sync(); // Tạo bảng nếu nó chưa tồn tại
    console.log("✅ Database đã được đồng bộ!");
})();

// -- Config App Port --
const port = process.env.port || 3700;

// -- Config Request Log --
// Log all request
app.use(morgan('combined'));

// -- Config CORS --
// Bật CORS để client (khác domain) có thể truy cập
app.use(cors());

// -- Config req.body --
app.use(express.json()); // for json
app.use(express.urlencoded({ extended: true })); // for form data

// -- Config App Route --
// Route Init
route(app);

// // Test thử HLS Streaming Audio (đã chuyển qua MusicController)
// http.createServer(function (req, res){
//     console.log("request starting...");

//     // var filePath = './assets/audio' + req.url;
//     var filePath = 'D:/mymusic_api/src/assets/audio' + req.url;
//     console.log(filePath)

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
// })

// Test
app.listen(port, () => {
    console.log(`Example app listening on port http://localhost:${port}`)
})