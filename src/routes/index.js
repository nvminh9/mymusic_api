const newsRouter = require('./news');
const musicRouter = require('./music')

function route(app){

    app.use('/news', newsRouter);

    app.use('/music', musicRouter);
    
    app.get('/', (req, res) => {
        res.send("Hello mymusic!");
    });
}

module.exports = route;