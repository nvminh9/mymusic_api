const fs = require('fs');

class MusicController{

    // [GET] /music
    index(req, res){
        res.send('Music Controller [Index]');
    }

    // route for serve HLS Streaming Audio
    // [GET] /music/:file
    hlsAudioStreaming(req, res){
        console.log("request starting...");
                
        var filePath = 'src/assets/audio' + req.url;
        console.log(filePath);

        fs.readFile(filePath, function(error, content){
            res.writeHead(200, 
                {
                    'Access-Controll-Allow-Origin': '*'
                }
            );
            if(error){
                if(error.code == "ENOENT"){
                    // fs.readFile('./404.hmtl')
                    console.log("Not found");
                }else{
                    res.writeHead(500);
                    res.end("Sorry, check with the site admin for error: "+error.code+'...\n');
                    res.end();
                }
            }else{
                res.end(content, 'utf-8');
            }
        });
    }
}

module.exports = new MusicController;