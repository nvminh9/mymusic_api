class MusicController{

    // [GET] /music
    index(req, res){
        res.send('Music Controller [Index]');
    }

}

module.exports = new MusicController;