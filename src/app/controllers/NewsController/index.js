class NewsController{

    // [GET] /news
    index(req, res){
        res.send('News Controller [Index]')
    }

    // [GET] /news/:newsID
    show(req, res){
        res.send(`News Controller [Show]`)
    }

}

module.exports = new NewsController;