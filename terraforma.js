"use strict";

/*:
	@module-license:
		The MIT License (MIT)

		Copyright (c) 2015 Richeve Siodina Bebedor

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
	@end-module-license
	
	@module-configuration:
		{
			"packageName": "terraforma",
			"fileName": "terraforma.js",
			"moduleName": "terraforma",
			"authorName": "Richeve S. Bebedor",
			"authorEMail": "richeve.bebedor@gmail.com",
			"repository": "git@github.com:volkovasystems/terraforma.git",
			"testCase": "terraforma-test.js",
			"isGlobal": true
		}
	@end-module-configuration

	@module-documentation:

	@end-module-documentation	
*/


var gulp = require( "gulp" );
var del = require( "del" );
var vinylPaths = require( "vinyl-paths" );
var concat = require( "gulp-concat" );
var uglify = require( "gulp-uglify" );
var sourcemaps = require( "gulp-sourcemaps" );
var rename = require( "gulp-rename" );
var changed = require( "gulp-changed" );
var cached = require( "gulp-cached" );
var remember = require( "gulp-remember" );
var newer = require( "gulp-newer" );
var flatten = require( "gulp-flatten" );
var replace = require( "gulp-replace" );
var insert = require( "gulp-insert" );
var react = require( "gulp-react" );
var minifyCSS = require( "gulp-minify-css" );
var less = require( "gulp-less" );
var filter = require( "gulp-filter" );
var livereload = require( "gulp-livereload" );
var embedlr = require( "gulp-embedlr" );
var plumber = require( "gulp-plumber" );

var connect = require( "connect" );
var serveStatic = require( "serve-static" );
var map = require( "map-stream" );
var fs = require( "fs" );
var path = require( "path" );
var argv = require( "yargs" ).argv;

var terraforma = function terraforma( options ){
	var INCLUDE_SCRIPT_PATTERN = new RegExp(
		"(?:\\<\\!\\-\\-\\:)?(\\s*).*?"
			+ "\\@include\\-script\\:"
				+ '(\\"[^\\"]+?\\")'
			+ ".*?(\\s*)(?:\\-\\-\\>)?",
		"g" );
	var INCLUDE_STYLE_PATTERN = new RegExp(
		"(?:\\<\\!\\-\\-\\:)?(\\s*).*?"
			+ "\\@include\\-style\\:"
				+ '(\\"[^\\"]+?\\")'
			+ ".*?(\\s*)(?:\\-\\-\\>)?",
		"g" );

	var MINIFIED_SCRIPT_PATTERN = /\.min\./g;
	var MINIFIED_STYLE_PATTERN = /\.min\./g;

	var INCLUDE_SCRIPT_REPLACER = "$1<script type=\"text/javascript\" src=$2></script>$3";
	var INCLUDE_STYLE_REPLACER = "$1<link rel=\"stylesheet\" type=\"text/css\" href=$2>$3";

	var REACTJS_DOM_FLAG = "/** @jsx React.DOM */\n";
	var REACTJS_DOM_FLAG_PATTERN = /\/\*\*\s*\@jsx\s+React\.DOM\s*\*\/\n/g;
	var REACTJS_DOM_FLAG_REPLACER = "";

	var PRODUCTION_MODE_PATTERN = new RegExp(
		"(?:\\{?\\s*)?(?:\\<\\!\\-\\-\\:|\\/\\*\\:|\\/\\/\\:)?(\\s*).*?"
			+ "\\@production\\-mode\\:"
				+ "(?:\\s*\\*\\/ \\}?)?\\s*"
					+ "([^]+?)\\s*"
				+ "(?:\\{?\\s*\\/\\*\\s*|\\/\\/\\:\\s*)?"
			+"\\@end\\-production\\-mode"
		+ ".*?(\\s*)(?:\\-\\-\\>|\\*\\/)?(?: \\}?)?",
		"gm" );
	var PRODUCTION_MODE_REPLACER = "\n$1$2$3\n";

	var DEVELOPMENT_MODE_PATTERN = new RegExp(
		"(?:\\{?\\s*)?(?:\\<\\!\\-\\-\\:|\\/\\*\\:|\\/\\/\\:)?(\\s*).*?"
			+ "\\@development\\-mode\\:"
				+ "(?:\\s*\\*\\/ \\}?)?\\s*"
					+ "([^]+?)\\s*"
				+ "(?:\\{?\\s*\\/\\*\\s*|\\/\\/\\:\\s*)?"
			+ "\\@end\\-development\\-mode"
		+ ".*?(\\s*)(?:\\-\\-\\>|\\*\\/)?(?: \\}?)?",
		"gm" );
	var DEVELOPMENT_MODE_REPLACER = "\n$1$2$3\n";

	var CLIENT_MODE_PATTERN = new RegExp(
		"(?:\\{?\\s*)?(?:\\<\\!\\-\\-\\:|\\/\\*\\:|\\/\\/\\:)?(\\s*).*?"
			+ "\\@client\\-mode\\:"
				+ "(?:\\s*\\*\\/ \\}?)?\\s*"
					+ "([^]+?)\\s*"
				+ "(?:\\{?\\s*\\/\\*\\s*|\\/\\/\\:\\s*)?"
			+ "\\@end\\-client\\-mode"
		+ ".*?(\\s*)(?:\\-\\-\\>|\\*\\/)?(?: \\}?)?",
		"gm" );
	var CLIENT_MODE_REPLACER = "\n$1$2$3\n";

	var ADMINISTRATOR_MODE_PATTERN = new RegExp(
		"(?:\\{?\\s*)?(?:\\<\\!\\-\\-\\:|\\/\\*\\:|\\/\\/\\:)?(\\s*).*?"
			+ "\\@administrator\\-mode\\:"
				+ "(?:\\s*\\*\\/ \\}?)?\\s*"
					+ "([^]+?)\\s*"
				+ "(?:\\{?\\s*\\/\\*\\s*|\\/\\/\\:\\s*)?"
			+ "\\@end\\-administrator\\-mode"
		+ ".*?(\\s*)(?:\\-\\-\\>|\\*\\/)?(?: \\}?)?",
		"gm" );
	var ADMINISTRATOR_MODE_REPLACER = "\n$1$2$3\n";

	var ADMINISTRATOR_DEVELOPMENT_MODE_PATTERN = new RegExp(
		"(?:\\{?\\s*)?(?:\\<\\!\\-\\-\\:|\\/\\*\\:|\\/\\/\\:)?(\\s*).*?"
			+ "\\@administrator-development\\-mode\\:"
				+ "(?:\\s*\\*\\/ \\}?)?\\s*"
					+ "([^]+?)\\s*"
				+ "(?:\\{?\\s*\\/\\*\\s*|\\/\\/\\:\\s*)?"
			+ "\\@end\\-administrator-development\\-mode"
		+ ".*?(\\s*)(?:\\-\\-\\>|\\*\\/)?(?: \\}?)?",
		"gm" );
	var ADMINISTRATOR_DEVELOPMENT_MODE_REPLACER = "\n$1$2$3\n";

	var ADMINISTRATOR_PRODUCTION_MODE_PATTERN = new RegExp(
		"(?:\\{?\\s*)?(?:\\<\\!\\-\\-\\:|\\/\\*\\:|\\/\\/\\:)?(\\s*).*?"
			+ "\\@administrator-production\\-mode\\:"
				+ "(?:\\s*\\*\\/ \\}?)?\\s*"
					+ "([^]+?)\\s*"
				+ "(?:\\{?\\s*\\/\\*\\s*|\\/\\/\\:\\s*)?"
			+ "\\@end\\-administrator-production\\-mode"
		+ ".*?(\\s*)(?:\\-\\-\\>|\\*\\/)?(?: \\}?)?",
		"gm" );
	var ADMINISTRATOR_PRODUCTION_MODE_REPLACER = "\n$1$2$3\n";

	var ADMINISTRATOR_ALL_MODE_PATTERN = new RegExp(
		"(?:\\{?\\s*)?(?:\\<\\!\\-\\-\\:|\\/\\*\\:|\\/\\/\\:)?(\\s*).*?"
			+ "\\@administrator\\-(?:development|production)\\-mode\\:"
				+ "(?:\\s*\\*\\/ \\}?)?\\s*"
					+ "([^]+?)\\s*"
				+ "(?:\\{?\\s*\\/\\*\\s*|\\/\\/\\:\\s*)?"
			+ "\\@end\\-administrator\\-(?:development|production)\\-mode"
		+ ".*?(\\s*)(?:\\-\\-\\>|\\*\\/)?(?: \\}?)?",
		"gm" );

	var CLEAN_UP_PATTERN = new RegExp(
		"(?:\\{?\\s*)?(?:\\<\\!\\-\\-\\:|\\/\\*\\:)?(\\s*).*?"
			+ "\\@[a-z\\-]*[a-z]\\-mode\\:"
				+ "(?:\\s*\\*\\/ \\}?)?\\s*"
				+ "([^]+?)\\s*"
				+ "(?:\\{?\\s*\\/\\*\\s*|\\/\\/\\:\\s*)?"
			+ "\\@end\\-[a-z][a-z\\-]*[a-z]\\-mode"
		+ ".*?(\\s*)(?:\\-\\-\\>|\\*\\/)?(?: \\}?)?",
		"gm" );

	var TEMPLATE_PATTERN = new RegExp(
		"(?:\\{?\\s*\\/\\*\\:|\\;\\s*\\/\\/\\:)?\\s*"
			+ "\\@template\\:"
				+ "\\s*([^\\s]+)"
		+ "\\s*(?:\\*\\/ \\}?)?" );

	var SUB_TEMPLATE_PATTERN = new RegExp(
		"(?:\\{?\\s*\\/\\*\\:|\\;\\s*\\/\\/\\:)?\\s*"
			+ "\\@sub-template\\:"
				+ "\\s*([^\\s]+)"
		+ "\\s*(?:\\*\\/ \\}?)?" );

	var APPLICATION_NAME = argv.appName || options.appName;

	var MODE_PATTERN = null;
	var MODE_REPLACER = null;
	if( argv.production ){
		MODE_PATTERN = PRODUCTION_MODE_PATTERN;
		MODE_REPLACER = PRODUCTION_MODE_REPLACER;

	}else if( argv.development ){
		MODE_PATTERN = DEVELOPMENT_MODE_PATTERN;
		MODE_REPLACER = DEVELOPMENT_MODE_REPLACER;

	}else{
		throw new Error( "no mode provided" );
	}

	var ADMINISTRATOR_GENERAL_MODE_PATTERN = null;
	var ADMINISTRATOR_GENERAL_MODE_REPLACER = null;
	if( argv.administrator ){
		ADMINISTRATOR_GENERAL_MODE_PATTERN = ADMINISTRATOR_MODE_PATTERN;
		ADMINISTRATOR_GENERAL_MODE_REPLACER = ADMINISTRATOR_MODE_REPLACER;
		CLIENT_MODE_REPLACER = "\n";

	}else{
		ADMINISTRATOR_GENERAL_MODE_PATTERN = ADMINISTRATOR_MODE_PATTERN;
		ADMINISTRATOR_GENERAL_MODE_REPLACER = "\n";
	}

	var ADMINISTRATOR_SPECIFIC_MODE_PATTERN = null;
	var ADMINISTRATOR_SPECIFIC_MODE_REPLACER = null;
	if( argv.administrator && argv.production ){
		ADMINISTRATOR_SPECIFIC_MODE_PATTERN = ADMINISTRATOR_PRODUCTION_MODE_PATTERN;
		ADMINISTRATOR_SPECIFIC_MODE_REPLACER = ADMINISTRATOR_PRODUCTION_MODE_REPLACER;

	}else if( argv.administrator && argv.development ){
		ADMINISTRATOR_SPECIFIC_MODE_PATTERN = ADMINISTRATOR_DEVELOPMENT_MODE_PATTERN;
		ADMINISTRATOR_SPECIFIC_MODE_REPLACER = ADMINISTRATOR_DEVELOPMENT_MODE_REPLACER;

	}else{
		ADMINISTRATOR_SPECIFIC_MODE_PATTERN = ADMINISTRATOR_ALL_MODE_PATTERN;
		ADMINISTRATOR_SPECIFIC_MODE_REPLACER = "\n";
	}

	var customBuild = argv.custom || options.custom || "";

	var CUSTOM_MODE_REPLACER = "\n$1$2$3\n";

	var CUSTOM_MODE_PATTERN = new RegExp(
		"(?:\\{?\\s*)?(?:\\<\\!\\-\\-\\:|\\/\\*\\:|\\/\\/\\:)?(\\s*).*?"
			+ "\\@custom\\-mode\\:(?:\\s*\\*\\/ \\}?)?\\s*([^]+?)\\s*"
				.replace( "custom", argv.custom )
			+ "(?:\\{?\\s*\\/\*\\s*|\\/\\/\\:\\s*)?\\@end\\-custom\\-mode"
				.replace( "custom", argv.custom )
			+ ".*?(\\s*)(?:\\-\\-\\>|\\*\\/)?(?: \\}?)?",
		"gm" );

	var pathSteps = "./";
	while( !fs.existsSync( path.resolve( pathSteps, "script-list.js" ) ) ){
		pathSteps = "../" + pathSteps;
	}

	var scriptListPath = path.resolve( pathSteps, "script-list.js" );
	var scriptList = options.scriptList || 
		require( scriptListPath );

	gulp.task( "default", [
		"clean-library",
		"clean-build",
		"clean-deploy",

		"copy-library",
		"build-library",
		"deploy-library",

		"build-font",
		"deploy-font",

		"build-script",
		"deploy-script",

		"build-less",
		"build-style",
		"deploy-style",

		"build-image",
		"deploy-image",

		"build-index",
		"deploy-index"
	] );

	gulp.task( "clean", [
		"clean-library",
		"clean-build",
		"clean-deploy",
		"clean-temp"
	] );

	gulp.task( "clean-temp",
		function cleanTask( ){
			return gulp
				.src( "temp", { "read": false } )
				.pipe( plumber( ) )
				.pipe( vinylPaths( del ) );
		} );

	gulp.task( "link-library", [
		"clean-library",
		"copy-library"
	] );

	//: This will remove only those that are older in the client/library
	gulp.task( "clean-library",
		function cleanTask( ){
			return gulp
				.src( "client/library", { "read": false } )
				.pipe( plumber( ) )
				.pipe( changed( "temp/library" ) )
				.pipe( vinylPaths( del ) );
		} );

	var libraryPaths = [
		"bower_components/*/*.css",
		"bower_components/*/*.map",
		"bower_components/*/*.js",
		"bower_components/*/*.eot",
		"bower_components/*/*.svg",
		"bower_components/*/*.ttf",
		"bower_components/*/*.woff",

		"bower_components/*/dist/**/*.eot",
		"bower_components/*/dist/**/*.svg",
		"bower_components/*/dist/**/*.ttf",
		"bower_components/*/dist/**/*.woff",
		"bower_components/*/dist/**/*.css",
		"bower_components/*/dist/**/*.map",
		"bower_components/*/dist/**/*.js",

		"bower_components/*/lib/**/*.js",

		"bower_components/*/build/**/*.js",
		"bower_components/*/build/**/*.css",

		"bower_components/*/css/*.css",

		"bower_components/*/fonts/*.eot",
		"bower_components/*/fonts/*.svg",
		"bower_components/*/fonts/*.ttf",
		"bower_components/*/fonts/*.woff"
	];

	gulp.task( "copy-library",
		[ "clean-library" ],
		function copyTask( ){
			return gulp
				.src( libraryPaths.concat( options.libraryExceptions ) )
				.pipe( plumber( ) )
				.pipe( cached( "library", { "optimizeMemory": true } ) )
				.pipe( flatten( ) )
				.pipe( gulp.dest( "temp/library" ) )
				.pipe( changed( "temp/library" ) )
				.pipe( gulp.dest( "client/library" ) );
		} );

	gulp.task( "build", [
		"clean-build",
		"build-script",
		"build-library",
		"build-font",
		"build-less",
		"build-style",
		"build-image",
		"build-index"
	] );

	gulp.task( "clean-build",
		[ "clean-library", "copy-library" ],
		function cleanTask( ){
			var sourcePaths = [ "build" ];

			if( argv.custom ){
				sourcePaths.push( [ "build", argv.custom ].join( "-" ) );
			}

			return gulp
				.src( sourcePaths, { "read": false } )
				.pipe( plumber( ) )
				.pipe( changed( "client" ) )
				.pipe( vinylPaths( del ) );
		} );

	gulp.task( "build-script",
		[ "clean-build" ],
		function buildTask( ){
			var stream = gulp
				.src( scriptList )
				.pipe( plumber( ) )
				.pipe( cached( "script:build", { "optimizeMemory": true } ) )
				.pipe( map( function attachTemplate( file, callback ){
					var fileContent = file.contents.toString( "utf8" );

					var templateFilePath = ( fileContent.match( TEMPLATE_PATTERN ) || [ ] )[ 1 ];

					while( templateFilePath ){
						templateFilePath = path.resolve( pathSteps, "client", templateFilePath );

						fileContent = fileContent.replace( TEMPLATE_PATTERN, [
							" (", fs.readFileSync( templateFilePath ), ");"
						].join( "\n" ) );

						templateFilePath = ( fileContent.match( TEMPLATE_PATTERN ) || [ ] )[ 1 ];
					}

					file.contents = new Buffer( fileContent );

					callback( null, file );
				} ) )
				.pipe( map( function attachSubTemplate( file, callback ){
					var fileContent = file.contents.toString( "utf8" );

					var templateFilePath = ( fileContent.match( SUB_TEMPLATE_PATTERN ) || [ ] )[ 1 ];

					while( templateFilePath ){
						templateFilePath = path.resolve( pathSteps, "client", templateFilePath );

						fileContent = fileContent.replace( SUB_TEMPLATE_PATTERN, [
							"", fs.readFileSync( templateFilePath ), ""
						].join( "\n" ) );

						templateFilePath = ( fileContent.match( SUB_TEMPLATE_PATTERN ) || [ ] )[ 1 ];
					}

					file.contents = new Buffer( fileContent );

					callback( null, file );
				} ) )
				.pipe( react( ) )
				.pipe( replace( MODE_PATTERN, MODE_REPLACER ) )
				.pipe( replace( ADMINISTRATOR_SPECIFIC_MODE_PATTERN, ADMINISTRATOR_SPECIFIC_MODE_REPLACER ) )
				.pipe( replace( ADMINISTRATOR_GENERAL_MODE_PATTERN, ADMINISTRATOR_GENERAL_MODE_REPLACER ) )
				.pipe( replace( CLIENT_MODE_PATTERN, CLIENT_MODE_REPLACER ) );

			if( argv.custom ){
				stream = stream
					.pipe( replace( CUSTOM_MODE_PATTERN, CUSTOM_MODE_REPLACER ) )
			}

			stream = stream
				.pipe( replace( CLEAN_UP_PATTERN, "" ) )
				.pipe( remember( "script:build" ) )
				.pipe( sourcemaps.init( ) )
				.pipe( concat( [ APPLICATION_NAME, "js" ].join( "." ) ) )
				.pipe( gulp.dest( "build/script" ) );

			var customBuildPath = "";

			if( argv.custom ){
				customBuildPath = "build/script"
					.replace( "build",
						[ "build", argv.custom ].join( "-" ) );

				stream = stream
					.pipe( gulp.dest( customBuildPath ) );
			}

			stream = stream
				.pipe( uglify( ) )
				.pipe( rename( [ APPLICATION_NAME, "min", "js" ].join( "." ) ) )
				.pipe( sourcemaps.write( "./" ) )
				.pipe( gulp.dest( "build/script" ) );

			if( argv.custom ){
				return stream
					.pipe( gulp.dest( customBuildPath ) );

			}else{
				return stream;
			}
		} );

	gulp.task( "build-library",
		[ "clean-library", "copy-library", "clean-build" ],
		function buildTask( ){
			var stream = gulp
				.src( "client/library/*.*" )
				.pipe( plumber( ) )
				.pipe( cached( "library:build", { "optimizeMemory": true } ) )
				.pipe( gulp.dest( "build/library" ) );

			if( argv.custom ){
				var customBuildPath = "build/library"
					.replace( "build",
						[ "build", argv.custom ].join( "-" ) );

				return stream
					.pipe( gulp.dest( customBuildPath ) );

			}else{
				return stream;
			}
		} );

	gulp.task( "build-font",
		[ "build-library" ],
		function buildTask( ){
			var stream = gulp
				.src( [
					"client/library/*.eot",
					"client/library/*.svg",
					"client/library/*.ttf",
					"client/library/*.woff"
				] )
				.pipe( plumber( ) )
				.pipe( cached( "font:build", { "optimizeMemory": true } ) )
				.pipe( gulp.dest( "client/fonts" ) )
				.pipe( gulp.dest( "build/fonts" ) );

			if( argv.custom ){
				var customBuildPath = "build/fonts"
					.replace( "build",
						[ "build", argv.custom ].join( "-" ) );

				return stream
					.pipe( gulp.dest( customBuildPath ) );

			}else{
				return stream;
			}
		} );

	gulp.task( "build-less",
		[ "clean-build" ],
		function buildTask( ){
			return gulp
				.src( "client/style/*.less" )
				.pipe( plumber( ) )
				.pipe( cached( "less:build", { "optimizeMemory": true } ) )
				.pipe( remember( "less:build" ) )
				.pipe( less( ) )
				.pipe( filter( [ "app.css" ] ) )
				.pipe( rename( [ APPLICATION_NAME, "css" ].join( "." ) ) )
				.pipe( gulp.dest( "temp/style" ) );
		} );

	gulp.task( "build-style",
		[ "clean-build", "build-less" ],
		function buildTask( ){
			var stream = gulp
				.src( "temp/style/*.css" )
				.pipe( plumber( ) )
				.pipe( gulp.dest( "build/style" ) );

			var customBuildPath = "";
			if( argv.custom ){
				customBuildPath = "build/style"
					.replace( "build",
						[ "build", argv.custom ].join( "-" ) );

				stream = stream
					.pipe( gulp.dest( customBuildPath ) );
			}

			stream = stream
				.pipe( sourcemaps.init( ) )
				.pipe( minifyCSS( { "keepBreaks": true } ) )
				.pipe( rename( [ APPLICATION_NAME, "min", "css" ].join( "." ) ) )
				.pipe( sourcemaps.write( "./" ) )
				.pipe( gulp.dest( "build/style" ) );

			if( argv.custom ){
				return stream
					.pipe( gulp.dest( customBuildPath ) );

			}else{
				return stream;
			}
		} );

	gulp.task( "build-image",
		[ "clean-build" ],
		function buildTask( ){
			var stream = gulp
				.src( "client/image/*.*" )
				.pipe( plumber( ) )
				.pipe( cached( "image:build", { "optimizeMemory": true } ) )
				.pipe( gulp.dest( "build/image" ) );

			if( argv.custom ){
				var customBuildPath = "build/image"
					.replace( "build",
						[ "build", argv.custom ].join( "-" ) );

				return stream
					.pipe( gulp.dest( customBuildPath ) );

			}else{
				return stream;
			}
		} );

	gulp.task( "build-index",
		[ "clean-build" ],
		function buildTask( ){
			var stream = gulp
				.src( "client/index.html" )
				.pipe( plumber( ) )
				.pipe( replace( INCLUDE_SCRIPT_PATTERN, INCLUDE_SCRIPT_REPLACER ) )
				.pipe( replace( INCLUDE_STYLE_PATTERN, INCLUDE_STYLE_REPLACER ) )
				.pipe( replace( MINIFIED_SCRIPT_PATTERN, "." ) )
				.pipe( replace( MINIFIED_STYLE_PATTERN, "." ) )
				.pipe( replace( DEVELOPMENT_MODE_PATTERN, DEVELOPMENT_MODE_REPLACER ) )
				.pipe( replace( ADMINISTRATOR_SPECIFIC_MODE_PATTERN, ADMINISTRATOR_SPECIFIC_MODE_REPLACER ) )
				.pipe( replace( ADMINISTRATOR_GENERAL_MODE_PATTERN, ADMINISTRATOR_GENERAL_MODE_REPLACER ) )
				.pipe( replace( CLIENT_MODE_PATTERN, CLIENT_MODE_REPLACER ) );

			if( argv.custom ){
				stream = stream
					.pipe( replace( CUSTOM_MODE_PATTERN, CUSTOM_MODE_REPLACER ) );
			}

			stream = stream
				.pipe( replace( CLEAN_UP_PATTERN, "" ) )
				.pipe( embedlr( ) )
				.pipe( gulp.dest( "build" ) );

			if( argv.custom ){
				var customBuildPath = [ "build", argv.custom ].join( "-" );

				return stream
					.pipe( gulp.dest( customBuildPath ) );

			}else{
				return stream;
			}
		} );


	gulp.task( "deploy", [
		"clean-deploy",
		"deploy-script",
		"deploy-library",
		"deploy-font",
		"deploy-style",
		"deploy-image",
		"deploy-index"
	] );

	gulp.task( "clean-deploy",
		[ "clean-library", "copy-library", "clean-build", "build-library" ],
		function cleanTask( ){
			var sourcePaths = [ "deploy" ];

			if( argv.custom ){
				sourcePaths.push( [ "deploy", argv.custom ].join( "-" ) );
			}

			return gulp
				.src( "deploy", { "read": false } )
				.pipe( plumber( ) )
				.pipe( vinylPaths( del ) );
		} );

	gulp.task( "deploy-script",
		[ "clean-build", "build-script", "clean-deploy" ],
		function deployTask( ){
			var stream = gulp
				.src( [
					"build/script/*.js",
					"build/script/*.map"
				] )
				.pipe( plumber( ) )
				.pipe( cached( "script:deploy", { "optimizeMemory": true } ) )
				.pipe( gulp.dest( "deploy/script" ) );

			if( argv.custom ){
				var customDeployPath = "deploy/script"
					.replace( "deploy",
						[ "deploy", argv.custom ].join( "-" ) );

				return stream
					.pipe( gulp.dest( customDeployPath ) );

			}else{
				return stream;
			}
		} );

	gulp.task( "deploy-library",
		[ "clean-library", "copy-library", "clean-build", "build-library", "clean-deploy" ],
		function deployTask( ){
			var stream = gulp
				.src( "build/library/*.*" )
				.pipe( plumber( ) )
				.pipe( cached( "library:deploy", { "optimizeMemory": true } ) )
				.pipe( gulp.dest( "deploy/library" ) );

			if( argv.custom ){
				var customDeployPath = "deploy/library"
					.replace( "deploy",
						[ "deploy", argv.custom ].join( "-" ) );

				return stream
					.pipe( gulp.dest( customDeployPath ) );

			}else{
				return stream;
			}
		} );

	gulp.task( "deploy-font",
		[ "deploy-library" ],
		function deployTask( ){
			var stream = gulp
				.src( [
					"build/library/*.eot",
					"build/library/*.svg",
					"build/library/*.ttf",
					"build/library/*.woff"
				] )
				.pipe( plumber( ) )
				.pipe( cached( "font:deploy", { "optimizeMemory": true } ) )
				.pipe( gulp.dest( "deploy/fonts" ) );

			if( argv.custom ){
				var customDeployPath = "deploy/fonts"
					.replace( "deploy",
						[ "deploy", argv.custom ].join( "-" ) );

				return stream
					.pipe( gulp.dest( customDeployPath ) );

			}else{
				return stream;
			}
		} );

	gulp.task( "deploy-style",
		[ "clean-build", "build-less", "build-style", "clean-deploy" ],
		function deployTask( ){
			var stream = gulp
				.src( [
					"build/style/*.css",
					"build/style/*.map"
				] )
				.pipe( plumber( ) )
				.pipe( cached( "style:deploy", { "optimizeMemory": true } ) )
				.pipe( gulp.dest( "deploy/style" ) );

			if( argv.custom ){
				var customDeployPath = "deploy/style"
					.replace( "deploy",
						[ "deploy", argv.custom ].join( "-" ) );

				return stream
					.pipe( gulp.dest( customDeployPath ) );

			}else{
				return stream;
			}
		} );

	gulp.task( "deploy-image",
		[ "clean-build", "clean-deploy" ],
		function deployTask( ){
			var stream = gulp
				.src( "build/image/*.*" )
				.pipe( plumber( ) )
				.pipe( cached( "image:deploy", { "optimizeMemory": true } ) )
				.pipe( gulp.dest( "deploy/image" ) );

			if( argv.custom ){
				var customDeployPath = "deploy/image"
					.replace( "deploy",
						[ "deploy", argv.custom ].join( "-" ) );

				return stream
					.pipe( gulp.dest( customDeployPath ) );

			}else{
				return stream;
			}
		} );

	gulp.task( "deploy-index",
		[ "clean-deploy" ],
		function buildTask( ){
			var stream = gulp
				.src( "client/index.html" )
				.pipe( plumber( ) )
				.pipe( replace( INCLUDE_SCRIPT_PATTERN, INCLUDE_SCRIPT_REPLACER ) )
				.pipe( replace( INCLUDE_STYLE_PATTERN, INCLUDE_STYLE_REPLACER ) )
				.pipe( replace( PRODUCTION_MODE_PATTERN, PRODUCTION_MODE_REPLACER ) )
				.pipe( replace( ADMINISTRATOR_SPECIFIC_MODE_PATTERN, ADMINISTRATOR_SPECIFIC_MODE_REPLACER ) )
				.pipe( replace( ADMINISTRATOR_GENERAL_MODE_PATTERN, ADMINISTRATOR_GENERAL_MODE_REPLACER ) )
				.pipe( replace( CLIENT_MODE_PATTERN, CLIENT_MODE_REPLACER ) );

			if( argv.custom ){
				stream = stream
					.pipe( replace( CUSTOM_MODE_PATTERN, CUSTOM_MODE_REPLACER ) );
			}

			stream = stream
				.pipe( replace( CLEAN_UP_PATTERN, "" ) )
				.pipe( gulp.dest( "deploy" ) );

			if( argv.custom ){
				var customBuildPath = [ "deploy", argv.custom ].join( "-" );

				return stream
					.pipe( gulp.dest( customBuildPath ) );

			}else{
				return stream;
			}
		} );

	gulp.task( "server-static",
		function serverTask( done ){
			var portNumber = process.config.port || process.env.PORT || 8000;
			var server = connect( );
			server
				.use( serveStatic( "build" ) )
				.listen( portNumber, "localhost", done );
		} );

	gulp.task( "reload", [ "build" ],
		function reloadTask( done ){
			livereload.reload( );
			done( );
		} );

	gulp.task( "watch",
		[
			"clean-build",
			"build-script",
			"build-library",
			"build-font",
			"build-less",
			"build-style",
			"build-image",
			"build-index",
			"server-static"
		],
		function watchTask( ){
			livereload.listen( );
			gulp.watch( [
				"client/script/**",
				"client/style/**",
				"client/template/**",
				"client/index.html",
				scriptListPath
			].concat( libraryPaths ),
			[ "reload" ] );
		} );

	gulp.task( "serverless-watch",
		[
			"clean-build",
			"build-script",
			"build-library",
			"build-font",
			"build-less",
			"build-style",
			"build-image",
			"build-index"
		],
		function watchTask( ){
			livereload.listen( );
			gulp.watch( [
				"client/script/**",
				"client/style/**",
				"client/template/**",
				"client/index.html",
				scriptListPath
			].concat( libraryPaths ),
			[ "reload" ] );
		} );
}

module.exports = terraforma;
