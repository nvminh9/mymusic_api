ffmpeg -i swimmingpool.mp3 -codec:a aac -b:a 128k -hls_time 10 -hls_playlist_type vod swimmingpool_master.m3u8
