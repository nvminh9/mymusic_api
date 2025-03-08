class NewsController{

    // [GET] /news
    index(req, res){
        // return res.send('News Controller [Index]');
        return res.status(200).json("NewsController method (index)");
    }

    // [GET] /news/:newsID
    show(req, res){
        return res.send(`News Controller [Show]`);
    }

}

module.exports = new NewsController;