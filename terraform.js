#!/usr/bin/env node

/*:!
	@cli-license:
		The MIT License (MIT)

		Copyright (@c) 2015 Richeve Siodina Bebedor
		@email: richeve.bebedor@gmail.com

		Permission is hereby granted, free of charge, to any person obtaining a copy
		of this software and associated documentation files (the "Software"), to deal
		in the Software without restriction, including without limitation the rights
		to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
		copies of the Software, and to permit persons to whom the Software is
		furnished to do so, subject to the following conditions:

		The above copyright notice and this permission notice shall be included in all
		copies or substantial portions of the Software.

		THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
		IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
		FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
		AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
		LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
		OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
		SOFTWARE.
	@end-cli-license
	
	@cli-configuration:
		{
			"cliName": "terraform",
			"fileName": "terraform.js",
			"moduleName": "terraforma",
			"authorName": "Richeve S. Bebedor",
			"authorEMail": "richeve.bebedor@gmail.com",
			"repository": "git@github.com:volkovasystems/terraforma.git"
		}
	@end-cli-configuration

	@cli-documentation:
	@end-cli-documentation	
*/
var _ = require( "lodash" );
var terraforma = require( "./terraforma.js" );
var util = require( "util" );
var yargs = require( "yargs" );
var chalk = require( "chalk" );
var raze = require( "raze" );
var fs = require( "fs" );
var path = require( "path" );
var child = require( "child_process" );
var apiLog = require( "gulp-api-log" );

var error = function error( message, data ){
	data = _.tail( raze( arguments ) )
		.map( function onEachData( data ){
			return util.inspect( data );
		} )
		.join( ", " )
		.replace( /\n/g, " " );

	message = [ [ "Error", message ].join( ", " ), data ].join( ": " );

	message = chalk.red( message );

	return new Error( message );
};

var argv = yargs
	.epilogue( "For more information go to, https://github.com/volkovasystems/terraforma.git" )

	.usage( "Usage: terraform <command> <mode> [sub-mode] [options]" )
	
	.command( "build <mode> [sub-mode]", "Build the project based on specific mode." )

	.command( "clean <mode> [sub-mode]", "Clean the built project." )

	.command( "sync <mode> [sub-mode]", "Sync changes to the project." )

	.option( "mode", {
		"alias": "m",
		"describe": "Tells terraforma what configuration to apply.",
		"type": "string",
		"choices": [
			"water",
			"cloud",
			"ground",
			"moon"
		]
	} )

	.option( "moon", {
		"alias": "o",
		"describe": "Build the project for mobile with specific platform.",
		"type": "string",
		"choices": [,
			"web",
			"ios",
			"android"
		]
	} )

	.option( "cloud", {
		"alias": "c",
		"describe": "Set the mode of the project for production",
		"type": "boolean"
	} )

	.option( "ground", {
		"alias": "g",
		"describe": "Set the mode of the project for staging",
		"type": "boolean"
	} )

	.option( "water", {
		"alias": "w",
		"describe": "Set the mode of the project for local execution",
		"type": "boolean"
	} )

	.option( "override", {
		"alias": "r",
		"describe": [
			"Use local gulp file instead of terraforma.",
			"Use this if you extend terraforma inside your own gulp file.",
			"Options are expected to be customized also so this will not",
			"\tload options before ( -- ) all custom options for your gulp file",
			"\tmust be loaded after ( -- ).",
			"Please refer to http://yargs.js.org/docs/#parsing-tricks-stop-parsing"
		].join( "\n" ),
		"type": "boolean"
	} )

	.example( "$0 build cloud", "Build the project for production." )
	
	.example( "$0 clean --mode water", "Clean the project built locally." )

	.example( "$0 sync --ground", "Sync changes on the project files in staging mode." )

	.example( "$0 build --moon ios", "Build the project for ios devices." )

	.example( "$0 build moon android", "Build the project for android devices." )

	.check( function check( argv ){
		var commandList = [ "build", "clean", "sync" ];
		var modeList = [ "cloud", "ground", "water", "moon" ];
		var subModeList = [ "web", "ios", "android" ];

		if( argv.override || argv.r ){
			return true;
		}

		if( argv._.length == 0 ){
			argv._command = "build";
			
			argv.mode = "water";

			return true;
		}

		var command = argv._[ 0 ];

		argv._command = command;

		if( argv.cloud || argv.c ){
			argv.mode = "cloud";

		}else if( argv.ground || argv.g ){
			argv.mode = "ground";
		
		}else if( argv.water || argv.w ){
			argv.mode = "water";
		
		}else if( argv.moon || argv.o ){
			argv.mode = "moon";
		
		}else{
			argv.mode = "water";
		}

		var mode = argv._[ 1 ] || argv.mode || argv.m;

		argv.mode = mode;

		var subMode = argv._[ 2 ] || argv.moon || argv.o;

		if( _.includes( subModeList, subMode ) ){
			argv.moon = subMode;	
		}

		var commandString = process.argv.join( " " );

		if(  _.includes( commandList, command ) &&
			_.includes( modeList, mode ) &&
			( subMode? 
				_.includes( subModeList, subMode ) :
				true  )
		){
			return true;

		}else if( !command ){
			throw error( "no command given", commandString );

		}else if( !mode ){
			throw error( "no mode given", commandString );

		}else if( !_.includes( commandList, command ) ){
			throw error( "invalid command", command, commandString );
		
		}else if( !_.includes( modeList, mode ) ){
			throw error( "invalid mode", mode, commandString );

		}else if( subMode && 
			!_.includes( subModeList, subMode ) )
		{
			throw error( "invalid sub mode", subMode, commandString );
		
		}else{
			throw error( "invalid arguments", commandString );
		}
	} )

	.help( "help" )

	.version( function version( ){
		return require( "./package.json" ).version;
	} )

	.wrap( null )

	.argv;

if( argv._exit ){
	process.exit( 0 );

	return;
}

var rootDirectory = process.cwd( );

//: If we override we are expecting he has it's own options.
if( fs.existsSync( path.resolve( rootDirectory, "gulpfile.js" ) ) &&
	( argv.override || argv.r ) )
{
	child.execSync( "gulp @parameter"
		.replace( "@parameter", argv._.join( " " ) ), 
		
		{ "stdio": [ 0, 1, 2 ] } );

}else{
	var gulp = terraforma( {
		"$mode": [ argv.mode, argv.moon ].join( ":" ).replace( /\:$/, "" )
	} );

	apiLog( gulp );

	gulp.start( argv._command );
}