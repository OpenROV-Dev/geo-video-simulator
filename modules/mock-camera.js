var events = require('events');


var Camera = function(){
  var spawn = require('child_process').spawn;
  var self = this;

  //test pattern
//  var ffmpeg_options = '-threads 1 -f lavfi -i testsrc=size=1920x1080:rate=30 -f mp4 -g 1 -threads 1 -movflags empty_moov+default_base_moof+frag_keyframe -tune zerolatency -';
  //Warning: A GOP of other than 1 will cache the frames in FFMPEG and send the entire package as a batch.
//  var ffmpeg_options = '-threads 1 -f lavfi -re -i testsrc=size=160x200:rate=15 -f mp4 -g 1 -threads 1 -movflags empty_moov+default_base_moof+frag_keyframe -profile:v main -level 30 -pix_fmt yuv420p -tune zerolatency -';
  var ffmpeg_options = '-threads 1 -f lavfi -re -i testsrc=size=640x360:rate=30:decimals=3 -f mp4 -g 1 -threads 2 -movflags empty_moov+default_base_moof+frag_keyframe -profile:v main -level 30 -pix_fmt yuv420p -tune zerolatency -';

  var ffmpeg_initFrame_options = '-threads 1 -f lavfi -i testsrc=size=1920x1080:rate=30 -f mp4 -vframes 0 -g 1 -threads 1 -movflags empty_moov+default_base_moof+frag_keyframe -profile:v main -level 30 -pix_fmt yuv420p -tune zerolatency -';
  //future option?
  //lavfi mandelbrot=s=1920x1080:start_scale=1.689­12323178293021:end_pts=212:maxiter=42192­342

  this.video = {videoStream : new events.EventEmitter()};
  this.video.initFrame = null;
  this.status = 'initializing';
  console.log('in method');
  events.EventEmitter.call(this);
  var self=this;
  var child = spawn('ffmpeg',ffmpeg_options.match(/\S+/g));

  var dataBuffer = null;
  var initBuffer = null;
  child.stdout.on('data', function(data){
    console.log("l: " + data.length);
    if (self.video.initFrame == null){
      initBuffer = initBuffer==null ? data : Buffer.concat([initBuffer,data]);
      if (initBuffer.length < 25) {
        return;
      }

      self.status = 'ready';
      self.emit('ready');
      self.video.initFrame=initBuffer;
      self.video.videoStream.emit('initData',data);
      console.log('initdata');
      return;
    }

    //Crude hack to gather the output from ffmpeg stdout in to full frames before emitting.
    if (data.length==8192){
      dataBuffer=dataBuffer==null ? data : Buffer.concat([dataBuffer,data]);;
      return;
    }
    dataBuffer = dataBuffer==null ? data : Buffer.concat([dataBuffer,data]);
    self.video.videoStream.emit('data',dataBuffer);
    dataBuffer = null;
//    console.log('data');
  });
  child.stderr.on('data', function(error){
  //  console.log(error.toString());
  });


}

Camera.prototype.__proto__ = events.EventEmitter.prototype;

module.exports=new Camera();
