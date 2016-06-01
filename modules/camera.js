var EventEmitter    = require('events').EventEmitter;
var util            = require('util');

var Camera = function( cameraOffset, deps )
{
    EventEmitter.call(this);
    
    var self        = this;
    var log       	= require('debug')( 'camera' + cameraOffset + ':log' );
    var error		= require('debug')( 'camera' + cameraOffset + ':error' );

    this.offset     = cameraOffset;
    this.deps       = deps;
    
    var channels    = {};
    var plugin      = deps.plugin;
    
    // TODO: We need some way to map and remember which camera is which!
    this.location   = "forward";
    
    // Handle command requests for this camera from the cockpit plugin
    this.on( "command", function( command, params )
    {
        if( command == "chCmd" )
        {
            // Channel level commands
            var channel = params.channel;
            
            if( channels[ channel ] !== undefined )
            {
                channels[ channel ].emit( "command", params.command, params.params );
            }
        }
        else
        {
            // Camera level commands
            SendCommand( command, params )
        } 
    } );
    
    // Handle channel registrations
    this.on( "channel_registration", function( channelNum, callback )
	{
        try
        {
            // Create a channel object
            channels[ channelNum ] = require( "channel.js" )( self, channelNum );
            
            // Call success callback
            callback();
        }
        catch( err )
        {
            throw "Channel registration failed: " + err;
        }
    } );
    
    // ----------------
	// Helper functions
    	
	function SendCommand( command, params )
	{
		console.log( "Mock sending camera command: " + command );
	};
};
util.inherits(Camera, EventEmitter);

module.exports = function( cameraOffset, deps ) 
{
    return new Camera( cameraOffset, deps );
};