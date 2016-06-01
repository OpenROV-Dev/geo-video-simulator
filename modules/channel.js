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
	
	// TODO: Set defaults
	this.settings		= 
	{
		width: 1920,
		height: 1080,
		framerate: 30
	};
	this.api			= {};
	
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