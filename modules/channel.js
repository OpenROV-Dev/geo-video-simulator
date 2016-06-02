var EventEmitter    = require('events').EventEmitter;
var util            = require('util');

var Channel = function( camera, channelNum )
{
	EventEmitter.call(this);
	var self 			= this;
	
	var channelPostfix	= camera.offset + "_" + channelNum;
	var server			= camera.deps.server;
	var plugin			= camera.deps.plugin;
	var defaults 		= camera.deps.defaults;
	var daemon			= camera.deps.daemon;
	
	var log       	= require('debug')( 'channel' + channelPostfix + ':log' );
    var error		= require('debug')( 'channel' + channelPostfix + ':error' );

	var videoStarted	= false;
	var beaconTimer 	= null;

	var videoEndpoint	= "ipc:///tmp/geomux_video" + camera.offset + "_" + channelNum + ".ipc";
	var eventEndpoint	= "ipc:///tmp/geomux_event" + camera.offset + "_" + channelNum + ".ipc";

	this.initFrame 		= {};
	
	// Set some mock defaults
	this.settings = {"avc_level":41,"bitrate":2000000,"brightness":0,"compression_quality":11940768,"contrast":100,"exp":{"sel":"auto","value":0},"flip_horizontal":true,"flip_vertical":true,"format":"h264","framerate":30,"gain":50,"gain_multiplier":128,"gamma":220,"gop_hierarchy_level":0,"goplen":10,"height":1080,"histogram_eq":false,"hue":0,"max_analog_gain":0,"max_framesize":64000,"maxnal":2,"nf":{"sel":"auto","value":206},"pan":0,"pict_timing":true,"profile":"high","pwr_line_freq":"60HZ","saturation":100,"sharpen_filter":1,"sharpness":50,"tf_strength":5,"tilt":0,"vui":true,"wb":{"sel":"auto","value":55502},"wdr":{"sel":"auto","value":0},"width":1920,"zone_wb":{"sel":"disabled","value":55502},"zoom":0};
	
	this.api = {"publicAPI":{"apply_settings":{"alias":"Apply Settings","description":"Allows the user to set multiple settings at once.","formats":["all"],"params":{"settings":{"alias":"Settings","description":"Collection of objects describing specific settings. See individual settings API for more info.","type":"object"}}},"force_iframe":{"alias":"Force I-Frame","description":"Forces the channel to output an I-frame.","formats":["h264"],"params":{}},"report_api":{"alias":"Publish API","description":"Publishes the API of the channel.","formats":["all"],"params":{}},"report_health":{"alias":"Publish Health","description":"Publishes current health stats of the channel.","formats":["all"],"params":{}},"report_settings":{"alias":"Publish Settings","description":"Publishes current settings of the channel.","formats":["all"],"params":{}},"video_start":{"alias":"Start Video","description":"Starts the video stream.","formats":["all"],"params":{}},"video_stop":{"alias":"Stop Video","description":"Stops the video stream.","formats":["all"],"params":{}}},"settingsAPI":{"avc_level":{"alias":"AVC Encoding Level","formats":["h264"],"params":{"value":{"description":"AVC Encoding Level.","max":52,"min":10,"type":"uint32","unit":"level"}}},"avc_profile":{"alias":"AVC Encoding Profile","formats":["h264"],"params":{"value":{"description":"AVC Encoding Profile.","options":["baseline","main","high"],"type":"string","unit":""}}},"bitrate":{"alias":"Bitrate","formats":["all"],"params":{"value":{"description":"Sets max bitrate of the channel. Does not guarantee the true bitrate.","max":10000000,"min":1000,"type":"uint32","unit":"bps"}}},"brightness":{"alias":"Brightness","formats":["all"],"params":{"value":{"description":"Image brightness.","max":255,"min":-255,"type":"int16","unit":"none"}}},"contrast":{"alias":"Contrast","formats":["all"],"params":{"value":{"description":"Image contrast.","max":200,"min":0,"type":"uint16","unit":"none"}}},"exp":{"alias":"Autoexposure Mode","formats":["all"],"params":{"mode":{"alias":"Mode","description":"Autoexposure mode.","options":["auto","manual"],"type":"string","unit":""},"value":{"alias":"Exposure Time","description":"Exposure time.","max":255,"min":0,"type":"uint16","unit":"none"}}},"flip_horizontal":{"alias":"Flip Horizontal","formats":["all"],"params":{"enabled":{"description":"Flips image horizontally.","type":"bool"}}},"flip_vertical":{"alias":"Flip Vertical","formats":["all"],"params":{"enabled":{"description":"Flips image vertically.","type":"bool"}}},"framerate":{"alias":"Framerate","formats":["all"],"params":{"value":{"description":"Sets max framerate of the channel. Does not guarantee the true framerate.","max":60,"min":1,"type":"uint32","unit":"fps"}}},"gain":{"alias":"Gain","formats":["all"],"params":{"value":{"description":"Image gain.","max":100,"min":1,"type":"uint16","unit":"none"}}},"gain_multiplier":{"alias":"Autoexposure Gain Multiplier","formats":["all"],"params":{"value":{"description":"Controls the autoexposure algorithm to adjust the sensor analog gain and exposure based on different lighting conditions.","max":256,"min":0,"type":"uint32","unit":"none"}}},"gamma":{"alias":"Gamma","formats":["all"],"params":{"value":{"description":"Image gamma.","max":300,"min":100,"type":"uint16","unit":"none"}}},"gop_hierarchy_level":{"alias":"GOP Hierarchy Level","formats":["h264"],"params":{"value":{"description":"GOP Hierarchy Level.","max":4,"min":0,"type":"uint32","unit":""}}},"goplen":{"alias":"GOP Length","formats":["h264"],"params":{"value":{"description":"Number of P-frames between each I-frame.","max":300,"min":1,"type":"uint32","unit":"frames"}}},"histogram_eq":{"alias":"Histogram Equalization","formats":["all"],"params":{"enabled":{"description":"Enable/disable histogram equalization, which gives more contrast to the image.","type":"bool"}}},"hue":{"alias":"Hue","formats":["all"],"params":{"value":{"description":"Image hue.","max":18000,"min":-18000,"type":"int16","unit":"none"}}},"max_analog_gain":{"alias":"Max Analog Gain","formats":["all"],"params":{"value":{"description":"Maximum sensor analog gain in auto exposure algorithm.","max":15,"min":0,"type":"uint32","unit":"none"}}},"max_framesize":{"alias":"Max Frame Size","formats":["h264"],"params":{"value":{"description":"Max frame size in bytes.","max":500000,"min":1,"type":"uint32","unit":"bytes"}}},"maxnal":{"alias":"Max NAL Unit Size","formats":["h264"],"params":{"enabled":{"description":"When enabled, caps the max size of a given NAL unit to the specified value. If a frame is larger than this value, it will be broken up into multiple NAL units. If false, value will be implicitly set to 0.","type":"bool"},"value":{"alias":"Size","description":"Max NAL size in bytes.","max":500000,"min":1,"type":"uint32","unit":"bytes"}}},"min_exp_framerate":{"alias":"Minimum Autoexposure Framerate","formats":["all"],"params":{"value":{"description":"Minimum framerate that the autoexposure algorithm can drop to.","max":30,"min":0,"type":"uint32","unit":"none"}}},"nf":{"alias":"Noise Filter Mode","formats":["all"],"params":{"mode":{"alias":"Mode","description":"Noise filter mode.","options":["auto","manual"],"type":"string","unit":""},"value":{"alias":"Strength","description":"Noise filter strength.","max":100,"min":0,"type":"uint16","unit":"none"}}},"pan":{"alias":"Pan","formats":["all"],"params":{"value":{"description":"Image pan.","max":648000,"min":-648000,"type":"int32","unit":"none"}}},"pantilt":{"alias":"Pan-Tilt","formats":["all"],"params":{"pan":{"alias":"Pan","description":"Image pan.","max":648000,"min":-648000,"type":"int32","unit":"none"},"tilt":{"alias":"Tilt","description":"Image tilt.","max":648000,"min":-648000,"type":"int32","unit":"none"}}},"pict_timing":{"alias":"Picture Timing Information","formats":["h264"],"params":{"enabled":{"description":"When enabled, includes picture timing information in the h264 SPS.","type":"bool"}}},"pwr_line_freq":{"alias":"Power Line Frequency Compensation","formats":["all"],"params":{"enabled":{"description":"Enable/disable power line frequency compensation.","type":"bool"},"mode":{"alias":"Frequency","description":"Power line frequency of the operating region. Sensor exposure value under the auto-exposure algorithm will be adjusted to avoid flickering caused by power level oscillation.","options":["50HZ","60HZ"],"type":"string","unit":""}}},"saturation":{"alias":"Saturation","formats":["all"],"params":{"value":{"description":"Image saturation.","max":200,"min":0,"type":"uint16","unit":"none"}}},"sharpen_filter":{"alias":"Sharpen Filter","formats":["all"],"params":{"value":{"description":"Strength of the sharpening filter, higher being stronger.","max":2,"min":0,"type":"uint32","unit":"none"}}},"sharpness":{"alias":"Sharpness","formats":["all"],"params":{"value":{"description":"Image sharpness.","max":100,"min":1,"type":"uint16","unit":"none"}}},"tf_strength":{"alias":"Temporal Filter","formats":["all"],"params":{"enabled":{"description":"Enable/disable the temporal filter.","type":"bool"},"value":{"alias":"Strength","description":"Strength of the temporal filter.","max":7,"min":1,"type":"uint32","unit":"none"}}},"tilt":{"alias":"Tilt","formats":["all"],"params":{"value":{"description":"Image tilt.","max":648000,"min":-648000,"type":"int32","unit":"none"}}},"vui":{"alias":"VUI Information","formats":["h264"],"params":{"enabled":{"description":"When enabled, includes VUI information in the h264 SPS.","type":"bool"}}},"wb":{"alias":"White Balance Mode","formats":["all"],"params":{"mode":{"alias":"Mode","description":"White balance mode.","options":["auto","manual"],"type":"string","unit":""},"value":{"alias":"Temperature","description":"White balance temperature.","max":6500,"min":2800,"type":"uint16","unit":"none"}}},"wdr":{"alias":"Wide Dynamic Range Mode","formats":["all"],"params":{"enabled":{"description":"Enable/disable Wide Dynamic Range mode.","type":"bool"},"mode":{"alias":"Mode","description":"WDR mode.","options":["auto","manual"],"type":"string","unit":""},"value":{"alias":"Intensity","description":"WDR intensity.","max":255,"min":0,"type":"uint8","unit":"none"}}},"zone_exp":{"alias":"Zonal Exposure","formats":["all"],"params":{"enabled":{"description":"Enable/disable zonal exposure.","type":"bool"},"value":{"alias":"Zone","description":"Zone value.","max":62,"min":0,"type":"uint16","unit":"none"}}},"zone_wb":{"alias":"Zonal White Balance","formats":["all"],"params":{"enabled":{"description":"Enable/disable zonal white balance.","type":"bool"},"value":{"alias":"Zone","description":"Zone value.","max":63,"min":0,"type":"uint16","unit":"none"}}},"zoom":{"alias":"Zoom","formats":["all"],"params":{"value":{"description":"Image zoom.","max":100,"min":0,"type":"uint16","unit":"none"}}}},"version":"7.7.13"};
	
	// Create video socket
	var videoSocket		= require('socket.io')(server,{origins: '*:*',path:defaults.wspath + channelPostfix });
	
	// -------------------
	// Event listeners
    this.on( "command", function( command, params )
    {
		SendChannelCommand( command, params );
    } );
	
	// Register to video data
	daemon.on( "data." + channelPostfix, function( data )
	{
		//log( "Packet received: " + data.length );
		
		// Forward packets over socket.io
		videoSocket.compress(false).volatile.emit( 'x-h264-video.data', data );
	} );
	
	// Listen for the init frame
	daemon.on( "init." + channelPostfix, function( data )
    {
		self.initFrame = data;
		
		log( "Channel status: Got init frame" );
		
		// Emit settings and API
		plugin.emit( "geomux.channel.settings", camera.offset, channelNum, self.settings );
		plugin.emit( "geomux.channel.api", camera.offset, channelNum, self.api );
		
		// Handle connections
		videoSocket.on('connect',function(client)
		{
			log( "Channel status: New video connection" );
			
			client.on('request_Init_Segment', function(fn) 
			{
				fn( new Buffer( self.initFrame, 'binary' ) );
			});
		});

		// Announce video source as json object on stderr
        var announcement = 
		{ 
			service:	'geomux',
			port:		defaults.port,
			addresses:	['127.0.0.1'],
			txtRecord:
			{
				resolution: 		self.settings.width.toString() + "x" + self.settings.height.toString(),
				framerate: 			self.settings.framerate,
				videoMimeType: 		'video/mp4',
				cameraLocation: 	camera.location,
				relativeServiceUrl: defaults.url,  
				wspath: 			defaults.wspath + channelPostfix
			}
		};
		
		plugin.emit( "geomux.video.announcement", camera.offset, channelNum, announcement );
		log( "Channel Announcement: " + JSON.stringify( announcement ) );
		
		// Create interval timer
        if( beaconTimer !== null )
		{
			clearInterval( beaconTimer );
        }
		
		// Announce camera endpoint every 5 secs
        setInterval( function()
		{
			log( "Channel Announcement: " + JSON.stringify( announcement ) );
			plugin.emit( "geomux.video.announcement", camera.offset, channelNum, announcement );
		}, 5000 );
		
		// Emit init frame as part of the h264 data stream to allow for re-init of existing clients in the browser
		videoSocket.compress(false).volatile.emit( 'x-h264-video.data', data );

	} );
	
	// ----------------
	// Intervals
	
	// Ask geomuxpp for health reports every 5 secs
	setInterval( function()
	{
		SendChannelCommand( "report_health" );
		// TODO
	}, 5000 );
	
	// ----------------
	// Helper functions
	
	function SendChannelCommand( command, params )
	{
		log( "Mock sending channel command: " + command );
		// TODO
	};
	
	function ApplySettings( settings )
	{
		log( "Mock applying channel settings: " + JSON.stringify( settings ) );
		// TODO
	};
};
util.inherits(Channel, EventEmitter);

module.exports = function( camera, channelNum ) 
{
  	return new Channel( camera, channelNum );
};