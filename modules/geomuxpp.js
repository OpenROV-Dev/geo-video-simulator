var Geomuxpp = function( deps, camera, channel )
{
  var spawn = require('child_process').spawn;
  var self  = this;
  
  var daemon      = deps.daemon;
  var dataBuffer  = null;
  var initBuffer  = null;
  var initFrame   = null;
  
  var ffmpeg_options            = '-threads 1 -f lavfi -re -i testsrc=size=1280x720:rate=30:decimals=3 -f mp4 -g 1 -threads 2 -movflags empty_moov+default_base_moof+frag_keyframe -profile:v main -level 30 -pix_fmt yuv420p -tune zerolatency -';
  var ffmpeg_initFrame_options  = '-threads 1 -f lavfi -i testsrc=size=1920x1080:rate=30 -f mp4 -vframes 0 -g 1 -threads 1 -movflags empty_moov+default_base_moof+frag_keyframe -profile:v main -level 30 -pix_fmt yuv420p -tune zerolatency -';
  var child                     = spawn( 'ffmpeg', ffmpeg_options.match( /\S+/g ) );

  child.stdout.on('data', function(data)
  {
    if( initFrame === null )
	  {
      initBuffer = initBuffer == null ? data : Buffer.concat( [initBuffer,data] );
	  
      if( initBuffer.length < 25 )
	    {
        return;
      }
	  
      initFrame = initBuffer;
      daemon.emit( "init." + camera + "_" + channel, initFrame );
      return;
    }

    //Crude hack to gather the output from ffmpeg stdout in to full frames before emitting.
    if( data.length == 8192 )
	  {
      dataBuffer = dataBuffer == null ? data : Buffer.concat([dataBuffer,data]);;
      return;
    }
	
    dataBuffer = dataBuffer == null ? data : Buffer.concat([dataBuffer,data]);
    daemon.emit( "data." + camera + "_" + channel, data );
	
    dataBuffer = null;
  });
  
  child.stderr.on('data', function(error)
  {
  	  // console.log("FFMPEG: " + error.toString());
  });
}

module.exports = function( deps, camera, channel ) 
{
  	return new Geomuxpp( deps, camera, channel );
};