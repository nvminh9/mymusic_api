const newsRouter = require('./news');
const musicRouter = require('./music');
const userRouter = require('./user');
const authRouter = require('./auth');
const articleRouter = require('./article');
const sharedArticleRouter = require('./sharedArticle');
const commentRouter = require('./comment');
const commentSharedArticleRouter = require('./commentSharedArticle');
const feedRouter = require('./feed');
const playlistRouter = require('./playlist');
const listeningHistoryRouter = require('./listeningHistory');
const searchRouter = require('./search');
const trendingSongRouter = require('./trendingSong');
const genreTrendingRouter = require('./genreTrending');
const genreRouter = require('./genre');
const conversationRouter = require('./conversation');
const messageRouter = require('./message');
const cors = require('cors');
const auth = require('../app/middleware/auth');

function route(app){

    // middleware
    app.all('*', auth);
    
    // config cors
    app.use(cors());

    app.use('/v1/api/auth', authRouter); // Authentication

    app.use('/v1/api/user', userRouter); // Người dùng
    
    app.use('/v1/api/article', articleRouter); // Bài viết
    
    app.use('/v1/api/music', musicRouter); // Nhạc
    
    app.use('/v1/api/news', newsRouter); // Tin tức

    app.use('/v1/api/comment', commentRouter); // Comment

    app.use('/v1/api/sharedArticle', sharedArticleRouter); // Shared Article

    app.use('/v1/api/commentSharedArticle', commentSharedArticleRouter); // Comment Shared Article

    app.use('/v1/api/playlist', playlistRouter); // Playlist

    app.use('/v1/api/feed', feedRouter); // Feed Page

    app.use('/v1/api/listeningHistory', listeningHistoryRouter); // Listening History

    app.use('/v1/api/search', searchRouter); // Search

    app.use('/v1/api/trending', trendingSongRouter); // Trending Song
    
    app.use('/v1/api/genreTrending', genreTrendingRouter); // Genre Trending Song

    app.use('/v1/api/genre', genreRouter); // Genre

    app.use('/v1/api/conversation', conversationRouter); // Conversation

    app.use('/v1/api/message', messageRouter); // Message

    app.get('/', (req, res) => {
        return res.status(200).json("mymusic API");
    });

    // app.get('/:file', (req, res) => {
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
    // })
}

module.exports = route;