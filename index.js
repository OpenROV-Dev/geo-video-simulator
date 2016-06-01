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

var defaults = 
{
	port: 		process.env.GEO_PORT || 8099,
	url: 		process.env.GEO_URL || ':' + 8099 + '/',
	wspath: 	process.env.GEO_WSPATH || '/geovideo',
};

var spawn 		    = require('child_process').spawn;
var log       	    = require('debug')( 'app:log' );
var error		    = require('debug')( 'app:error' );
var argv 		    = require('minimist')( process.argv );
var fs              = require('fs');
var EventEmitter    = require('events').EventEmitter;

var server		    = require('http').createServer();
server.listen( defaults.port, function () 
{
  console.log( 'Geo Video Simulator Listening on ' + defaults.port );
})

var plugin 		    = require('socket.io')(server,{origins: '*:*',path:defaults.wspath });

var mockDaemon      = new EventEmitter();

var deps 		    =
{
	server: server,
	plugin: plugin,
	defaults: defaults,
    daemon: mockDaemon
}
var bootedCameras 	= [];
var daemonsStarted	= false;
var writeToDisk     = false;
var mockRegServer   = new EventEmitter();
var cameras         = {};

// Get options
try
{
	var camOption = argv.c;
	var withoutBraces = argv.c.replace(/\[|\]/gi,'' );
	
	if( withoutBraces === "" )
	{
		throw "No cameras specified";
	}

    bootedCameras = withoutBraces.split( ',' );
    
    if( bootedCameras === undefined || bootedCameras.length == 0 )
    {
        throw "No cameras specified";
    }
    
    writeToDisk = argv.writeToDisk;
}
catch( err )
{
	error( "No cameras specified! Ending program!" );
	throw "Error getting camera list: " + err;
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
                }, 3000 );
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
            }, 5000 );
		}
	} );
} );