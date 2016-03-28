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
var terraforma = require( "./terraforma.js" );

var argv = require( "yargs" )
	.epilogue( "For more information go to, https://github.com/volkovasystems/terraforma.git" )

	.usage( "Usage: terraform <command> --mode <mode> [options]" )
	
	.command( "build", "Build the project based on specific mode." )

	.command( "clean", "Clean the built project." )

	.command( "sync", "Sync changes to the project." )

	.demand( 1, [ "mode" ], "We require a command and a mode to operate." )

	.option( "mode", {
		"alias": "m",
		"demand": true,
		"default": "water",
		"describe": "Tells terraforma what configuration to apply.",
		"type": "string",
		"choices": [
			"cloud",
			"ground",
			"water",
			"moon"
		]
	} )

	.option( "moon", {
		"alias": "o",
		"demand": "mode",
		"default": "web",
		"describe": "Build the project for mobile with specific platform.",
		"type": "string",
		"choices": [
			"web",
			"ios",
			"android"
		]
	} )

	.option( "cloud", {
		"alias": "c3",
		"describe": "Set the mode of the project for production",
		"type": "boolean"
	} )

	.option( "ground", {
		"alias": "zz",
		"describe": "Set the mode of the project for staging",
		"type": "boolean"
	} )

	.option( "water", {
		"alias": "ww",
		"describe": "Set the mode of the project for local execution",
		"type": "boolean"
	} )

	.help( )

	.argv;


