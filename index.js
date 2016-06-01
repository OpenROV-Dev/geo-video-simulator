#!/usr/bin/env node

// To eliminate hard coding paths for require, we are modifying the NODE_PATH to include our lib folder
var oldpath = '';

if( process.env[ 'NODE_PATH' ] !== undefined )
{
    oldpath = process.env[ 'NODE_PATH' ];
}

// Append modules directory to path
process.env['NODE_PATH'] = __dirname + '/modules:' + oldpath;
require('module').Module._initPaths();

var spawn 		= require('child_process').spawn;
var log       	= require('debug')( 'app:log' );
var error		= require('debug')( 'app:error' );

// Get command line arguments
var argv = require( "yargs" )
	.usage( "Usage: $0 -c [cam0] [cam1] [camX] -p [port number] -u [relative url] -w [socket.io path]" )
	.array( "c" )
	.number( "p" )
	.string( "u" )
	.string( "w" )
	.demand( [ "c", "p", "u", "w" ] )
	.fail( function (msg, err) 
	{
		error( "Error parsing arguments: " + msg );
		error( "Exiting..." );
		process.exit(1);
	})
	.argv;

var bootedCameras 	= [];
var cameras         = {};
var daemonsStarted	= false;
var writeToDisk     = false;
var mockRegServer   = new EventEmitter();
var mockDaemon      = new EventEmitter();
var EventEmitter    = require('events').EventEmitter;
var defaults		= {};

// Validate and set arguments
try
{	
	bootedCameras = argv.c;
	
	if( bootedCameras.length == 0 )
	{
		throw "No cameras specified";
	}
	
	// -p=<port number>
	defaults.port 	= argv.p;
	
	// -u=<relative url>
	defaults.url 	= argv.u;
	
	// -w=<ws path>
	defaults.wspath = argv.w;
}
catch( err )
{
	error( "Error parsing arguments: " + err );
	error( "Exiting..." );
	process.exit(1);
}

var server		= require('http').createServer();
server.listen( defaults.port, function () 
{
  console.log( 'Geo Video Server Listening on ' + defaults.port );
})

var plugin 		= require('socket.io')(server,{origins: '*:*',path:defaults.wspath });

var deps 		=
{
	server: server,
	plugin: plugin,
	defaults: defaults,
	daemon: mockDaemon
}

// Handle camera/channel registrations
mockRegServer.on( "registration", function( registration )
{
	try
	{
		if( registration.type === "camera_registration" )
		{
			// Create a camera object
			cameras[ registration.camera ] = require( "camera.js" )( registration.camera, deps );
		}
		else if( registration.type === "channel_registration" )
		{
			// Create a channel object
			cameras[ registration.camera ].emit( "channel_registration", registration.channel, function()
			{					
				log( "Channel " + registration.camera + "_" + registration.channel + " registered" );
                
                // Launch FFMPEG process to mock receipt of init frame and video frames
                setTimeout( function()
                {
                    var geomuxpp = require( "geomuxpp.js" )( deps, registration.camera, registration.channel );
                }, 1000 );
			} );
		}
	}
	catch( err )
	{
		error( "Error in registration: " + err );
	}
} );

// Handle multiple connects to the goe-video-server
plugin.on( "connection", function( client )
{
	console.log( "New geo-video-simulator connection!" );
	
	client.on( "geomux.ready", function()
	{		
		console.log( "Got ready from plugin" );
		
		// Listen for camera commands and route them to the correct camera
		client.on( "geomux.command", function( camera, command, params )
		{
			if( cameras[ camera ] !== undefined )
			{
				cameras[ camera ].emit( "command", command, params );
			}
		} );
		
		// Only start the daemons once
		if( daemonsStarted === false )
		{
			daemonsStarted = true;
            
            // Mock start the geomuxpp daemon
            // TODO: Allow the ability to mock multiple camera streams
            console.log( "Mocked geomuxpp started" );
		
            setTimeout( function()
            {
                // Mock receipt of camera registration
                mockRegServer.emit( "registration", { type: "camera_registration", camera: "0" } );
                setTimeout( function()
                {
                    // Mock receipt of channel registration
                    mockRegServer.emit( "registration", { type: "channel_registration", camera: "0", channel: "0" } );
                }, 1000 );
            }, 1000 );
		}
	} );
} );