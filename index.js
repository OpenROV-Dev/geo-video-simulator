#!/usr/bin/env node
//To eliminate hard coding paths for require, we are modifying the NODE_PATH to include
//out lib folder
var oldpath = '';
if (process.env['NODE_PATH']!==undefined){
  oldpath = process.env['NODE_PATH'];
}
//just in case already been set leave it alone
process.env['NODE_PATH']=__dirname+'/modules:'+oldpath;
require('module').Module._initPaths();
console.log("Set NODE_PATH to: "+process.env['NODE_PATH'] );

var videoServer;
var fs = require('fs');
var options={'writeToDisk' : false};

var getOptions = function getOptions(args){
    var defaults = {
        location: process.env.GEO_LOCATION || "forward",
        port: process.env.GEO_PORT || 8099,
        fps: process.env.GEO_FPS || 30,
        mimeType: process.env.GEO_MIMETYPE || 'video/mp4',
        resolution: process.env.GEO_RESOLUTION || '1920x1080',
        device: process.env.GEO_DEVICE || '/dev/video0',
        url: process.env.GEO_URL || ':'+8099+'/',
        wspath: process.env.GEO_WSPATH || '/socket.io',
    };
    var argv = require('minimist')(args);
    return Object.assign(defaults,argv);
}



options = getOptions(process.argv.slice(2));

var io = require('socket.io')(options.port,{path:options.wspath});

var camera
  camera = require("mock-camera.js");

var beacon_timer = null;
console.log('listening to ready');
camera.on('ready',function(){
    console.log('got ready');
    var deps = {};
    deps.video = camera.video;

    deps.socketIOclient = io;
    var stream;

    camera.video.videoStream.on('initData', function(data){
        console.log("got init data: " + data.length);
        deps.video.initFrame = data;

        //The stream is up and running now.
        videoServer = require('videoServer')(deps);
        //announce via json on stderr
        var announcement = {service:'geomux',port:options.port,addresses:['127.0.0.1'],txtRecord:{resolution: options.resolution, framerate: options.framerate, videoMimeType: 'video/mp4', cameraLocation: options.location, relativeServiceUrl:options.url}};
        var jannouncement =  JSON.stringify(announcement);
        console.error(jannouncement);
        if (beacon_timer !== null){
          clearInterval(beacon_timer);
        }
        setInterval(function(){
            console.error(jannouncement);
        },5000);

        if (options.writeToDisk){
            //Todo: Verify the async writes preserve order. First test appeared to be a corrupt stream.  Could also simply need to have encoding set.
            stream = fs.createWriteStream("/tmp/video.mp4");
            stream.write(data);
        }
    });

    camera.video.videoStream.on('data', function(data){
        if (stream!==undefined){
            stream.write(data);
        };
    });

});
