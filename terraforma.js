"use strict";

/*:!
	@module-license:
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
		This is a straightforward mega function that configures
			your basic gulp tasks towards a concise and specified architecture.

		It has 4 basic options,
			1. cloud
			2. ground
			3. water
			4. moon
	@end-module-documentation	
*/

var _  = require( "lodash" );
var harden = require( "harden" );
var gulp = require( "gulp" );
var fs = require( "fs" );
var path = require( "path" );
var argv = require( "yargs" ).argv;
var changed = require( "gulp-changed" );
var plumber = require( "gulp-plumber" );
var del = require( "del" );
var vinylPath = require( "vinyl-paths" );
var map = require( "map-stream" );
var concat = require( "gulp-concat" );
var rename = require( "gulp-rename" );
var less = require( "gulp-less" );
var sass = require( "gulp-sass" );
var cached = require( "gulp-cached" );
var flatten = require( "gulp-flatten" );
var babel = require( "gulp-babel" );
var parameta = require( "parameta" );
var util = require( "util" );
var uglify = require( "gulp-uglify" );
var cssnano = require( "gulp-cssnano" );
var sourcemap = require( "gulp-sourcemaps" );
var order = require( "gulp-order" );

var terraforma = function terraforma( option ){
	//: This will let you add tasks.
	gulp = option.$gulp || gulp;

	gulp.task( "initialize",
		function initializeTask( ){
			harden( "ROOT_DIRECTORY", __dirname, global );
			
			var earthJSONPath = path.resolve( ROOT_DIRECTORY, "earth.json" );

			try{
				if( !fs.existsSync( earthJSONPath ) ){
					var template = {
						"appName": "app",
						"sourcePath": "client",
						"destinationPath": "build",
						"libraryPathList": [ ],
						"scriptPathList": [ ],
						"cloud": {
							"destinationPath": "deploy"
						},
						"ground": {
							"destinationPath": "stage"
						},
						"water": { },
						"mobile": { }
					};

					template = _.cloneDeep( _.extend( template, option ) );

					for( var property in template ){
						if( /^\$/.test( property ) ){
							delete template[ property ]; 
						}
					}

					template = JSON.stringify( template, null, "\t" );

					fs.writeFileSync( earthJSONPath, template, "utf8" );
				}

			}catch( error ){
				console.log( "possible error during earth.json template transfer",
					util.inspect( error ) );

				if( !fs.existsSync( earthJSONPath ) ){
					console.log( "earth.json is not created properly, terraforma will crumble" );

					process.exit( 0 );
				}
			}
			
			return gulp
				.src( earthJSONPath )
				
				.pipe( map( function attachTemplate( file, callback ){
					//: Prioritize given parameter options over configuration.
					var earthOption = JSON.parse( file.contents.toString( "utf8" ) || "{ }" );

					option = _.extend( earthOption, option || { } );
					
					harden( "OPTION", option, global );

					/*:
						The name of the application appended to the created folder name.
					*/
					harden( "APPLICATION_NAME", 
						argv.appName || option.appName || "app", 
						global );

					/*:
						Terraform mode are simple modes that transform the app.
						1. cloud - production
							-this will create a deploy folder
						
						2. ground - testing (development/staging)
							-this will create a stage folder

						3. water - local (default)
							-this will create a build folder

						4. moon - mobile
							a. moon:ios
								-build for ios devices
								-creates an ios folder

							b. moon:android
								-build for android devices
								-creates an android folder

							c. moon:web (default)
								-build as a web app for mobile devices
								-creates a mobile folder
					*/
					var mode = argv.mode || option.mode || option.$mode;

					if( argv.cloud ){
						mode = "cloud";
					
					}else if( argv.ground ){
						mode = "ground";
					
					}else if( argv.ios ){
						mode = "moon:ios";
					
					}else if( argv.android ){
						mode = "moon:android";
					
					}else if( argv.moon ){
						mode = "moon";
					
					}else if( !mode ){
						mode = "water";
					}

					harden( "TERRAFORM_MODE", mode.split( ":" )[ 0 ], global );

					if( (/^moon\:/).test( mode ) ){
						harden( "MOBILE_MODE", mode.split( ":" )[ 1 ], global );
					}

					if( !option.destinationPath ){
						if( TERRAFORM_MODE == "cloud" ){
							option.destinationPath = "deploy";
						
						}else if( TERRAFORM_MODE == "ground" ){
							option.destinationPath = "stage";
						
						}else if( TERRAFORM_MODE == "moon" &&
							!global.MOBILE_MODE )
						{
							option.destinationPath = "mobile"
						
						}else{
							option.destinationPath = "build";
						}	
					}

					harden( "SOURCE_PATH", 
						path.resolve( ROOT_DIRECTORY, 
							argv.sourcePath || 
							option[ TERRAFORM_MODE ].sourcePath ||
							option.sourcePath || 
							"client" ),
						global );

					harden( "DESTINATION_PATH",
						path.resolve( ROOT_DIRECTORY,
							[ 
								( argv.destinationPath || 
								( global.MOBILE_MODE? MOBILE_MODE : "" ) ||
								option[ TERRAFORM_MODE ].destinationPath ||
								option.destinationPath ),
								APPLICATION_NAME
							].join( "-" ) ),
						global );
					
					var defaultLibraryPathList = [
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

					//: The library path configuration for library transfer.
					var libraryPathList = _.union( defaultLibraryPathList, option.libraryPathList )
						.map( function onEachLibraryPath( libraryPath ){
							return path.resolve( ROOT_DIRECTORY, libraryPath );
						} );
					harden( "LIBRARY_PATH_LIST", libraryPathList, global );

					var initialLibraryPath = path.join( ROOT_DIRECTORY, "bower_components" );
					harden( "INITIAL_LIBRARY_PATH", initialLibraryPath, global );

					var sourceLibraryPath = path.join( SOURCE_PATH, "library" );
					harden( "SOURCE_LIBRARY_PATH", sourceLibraryPath, global );

					var destinationLibraryPath = path.join( DESTINATION_PATH, "library" );
					harden( "DESTINATION_LIBRARY_PATH", destinationLibraryPath, global );

					var negatedLibraryPath = "!" + path.resolve( SOURCE_PATH, "library/**/*.*" );
					harden( "NEGATED_LIBRARY_PATH", negatedLibraryPath, global );

					var sourceFontPath = path.resolve( SOURCE_PATH, "fonts" );
					harden( "SOURCE_FONT_PATH", sourceFontPath, global );

					var destinationFontPath = path.resolve( DESTINATION_PATH, "fonts" );
					harden( "DESTINATION_FONT_PATH", destinationFontPath, global );

					var negatedFontPath = "!" + path.resolve( SOURCE_PATH, "fonts/**/*.*" );
					harden( "NEGATED_FONT_PATH", negatedFontPath, global );

					var destinationCSSPath = path.resolve( DESTINATION_PATH, "css" );
					harden( "DESTINATION_CSS_PATH", destinationCSSPath, global );

					var destinationStylePath = path.resolve( DESTINATION_PATH, "style" );
					harden( "DESTINATION_STYLE_PATH", destinationStylePath, global );

					/*:
						We will have default support for the following file formats.
					*/
					var defaultImageFileFormatList = [
						"jpg",
						"jpeg",
						"png",
						"gif",
						"svg",
						"ico"
					];

					var imageFilePathList = _.union( defaultImageFileFormatList, 
							option.imageFileFormatList || [ ] )
						.map( function onEachImageFileFormat( imageFileFormat ){
							return path.resolve( SOURCE_PATH, "**/*." + imageFileFormat );
						} );
					harden( "IMAGE_FILE_PATH_LIST", imageFilePathList, global );

					var destinationImagePath = path.resolve( DESTINATION_PATH, "image" );
					harden( "DESTINATION_IMAGE_PATH", destinationImagePath, global );

					var scriptPathList = option.scriptPathList;
					if( _.isEmpty( scriptPathList ) ){
						scriptPathList = [ 
							path.resolve( SOURCE_PATH, "**/*.js" ),
							path.resolve( SOURCE_PATH, "**/*.jsx" )
						];

						harden( "ORDERED_SCRIPT", false, global );
					
					}else{
						harden( "ORDERED_SCRIPT", true, global );
					}

					harden( "SCRIPT_PATH_LIST", scriptPathList, global );

					var destinationJSPath = path.resolve( DESTINATION_PATH, "js" );
					harden( "DESTINATION_JS_PATH", destinationJSPath, global );

					var destinationScriptPath = path.resolve( DESTINATION_PATH, "script" );
					harden( "DESTINATION_SCRIPT_PATH", destinationScriptPath, global );

					if( option.indexPath ){
						var indexPath = path.resolve( ROOT_DIRECTORY, option.indexPath );
						harden( "INDEX_PATH", indexPath, global );
					
					}else{
						var indexPath = path.resolve( ROOT_DIRECTORY, "client/index.html" );
						harden( "INDEX_PATH", indexPath, global );	
					}

					callback( null, file );
				} ) );
		} );

	gulp.task( "copy-library",
		[ 
			"initialize" 
		],
		function copyTask( ){
			return gulp
				.src( LIBRARY_PATH_LIST )
				
				.pipe( plumber( ) )
				
				.pipe( flatten( ) )
				
				.pipe( changed( SOURCE_LIBRARY_PATH ) )
				
				.pipe( gulp.dest( SOURCE_LIBRARY_PATH ) );
		} );

	gulp.task( "build-library",
		[ 
			"initialize", 
			"copy-library" 
		],
		function buildLibrary( ){
			return gulp
				.src( path.resolve( SOURCE_LIBRARY_PATH, "*.*" ) )
				
				.pipe( plumber( ) )
				
				.pipe( changed( DESTINATION_LIBRARY_PATH ) )
				
				.pipe( gulp.dest( DESTINATION_LIBRARY_PATH ) )
		} );

	gulp.task( "build-font",
		[ 
			"initialize",
			"copy-library" 
		],
		function buildTask( ){
			var stream = gulp
				.src( [
					path.resolve( SOURCE_LIBRARY_PATH, "*.eot" ),
					path.resolve( SOURCE_LIBRARY_PATH, "*.svg" ),
					path.resolve( SOURCE_LIBRARY_PATH, "*.ttf" ),
					path.resolve( SOURCE_LIBRARY_PATH, "*.woff" )
				] )
				
				.pipe( plumber( ) )
				
				.pipe( changed( SOURCE_FONT_PATH ) )
				
				.pipe( gulp.dest( SOURCE_FONT_PATH ) )
				
				.pipe( gulp.dest( DESTINATION_FONT_PATH ) );
		} );

	gulp.task( "build-sass",
		[ 
			"initialize"
		],
		function buildSASS( ){
			return gulp
				.src( [
					path.resolve( SOURCE_PATH, "**/*.scss" ),
					NEGATED_LIBRARY_PATH
				] )
				
				.pipe( plumber( ) )
				
				.pipe( cached( "sass:build", { "optimizeMemory": true } ) )
				
				.pipe( sass( ) )
				
				.pipe( rename( [ APPLICATION_NAME, "sass.css" ].join( "." ) ) )
				
				.pipe( gulp.dest( DESTINATION_CSS_PATH ) );
		} );

	gulp.task( "build-less",
		[ 
			"initialize"
		],
		function buildLESS( ){
			return gulp
				.src( [
					path.resolve( SOURCE_PATH, "**/*.less" ),
					NEGATED_LIBRARY_PATH
				] )
				
				.pipe( plumber( ) )
				
				.pipe( cached( "less:build", { "optimizeMemory": true } ) )
				
				.pipe( less( ) )
				
				.pipe( rename( [ APPLICATION_NAME, "less.css" ].join( "." ) ) )
				
				.pipe( gulp.dest( DESTINATION_CSS_PATH ) );
		} );

	gulp.task( "build-css",
		[ 
			"initialize" 
		],
		function buildCSS( ){
			return gulp
				.src( [
					path.resolve( SOURCE_PATH, "**/*.css" ),
					NEGATED_LIBRARY_PATH
				] )
				
				.pipe( plumber( ) )
				
				.pipe( cached( "css:build", { "optimizeMemory": true } ) )
				
				.pipe( gulp.dest( DESTINATION_CSS_PATH ) );
		} );

	gulp.task( "build-style",
		[ 
			"initialize",
			"build-sass",
			"build-less",
			"build-css"
		], 
		function buildStyle( ){
			if( TERRAFORM_MODE == "cloud" ){
				return gulp
					.src( path.resolve( DESTINATION_CSS_PATH, "*.css" ) )
					
					.pipe( plumber( ) )

					.pipe( order( [
						"**/*.sass.css",
						"**/*.less.css",
						"**/*.css"
					] ) )
					
					.pipe( concat( [ APPLICATION_NAME, "css" ].join( "." ) ) )

					.pipe( gulp.dest( DESTINATION_STYLE_PATH ) )

					.pipe( sourcemap.init( ) )
					
					.pipe( cssnano( ) )

					.pipe( sourcemap.write( DESTINATION_STYLE_PATH ) )

					.pipe( rename( [ APPLICATION_NAME, "min.css" ].join( "." ) ) )
					
					.pipe( changed( DESTINATION_STYLE_PATH ) )

					.pipe( gulp.dest( DESTINATION_STYLE_PATH ) );
			
			}else{
				return gulp
					.src( path.resolve( DESTINATION_CSS_PATH, "*.css" ) )
					
					.pipe( plumber( ) )

					.pipe( order( [
						"**/*.sass.css",
						"**/*.less.css",
						"**/*.css"
					] ) )
					
					.pipe( concat( [ APPLICATION_NAME, "css" ].join( "." ) ) )
					
					.pipe( changed( DESTINATION_STYLE_PATH ) )
					
					.pipe( gulp.dest( DESTINATION_STYLE_PATH ) );
			}
		} );

	gulp.task( "build-image",
		[ 
			"initialize"
		],
		function buildImage( ){
			return gulp
				.src( _.union( [
						NEGATED_LIBRARY_PATH,
						NEGATED_FONT_PATH
					], IMAGE_FILE_PATH_LIST ) )
				
				.pipe( plumber( ) )
				
				.pipe( changed( DESTINATION_IMAGE_PATH ) ) 
				
				.pipe( gulp.dest( DESTINATION_IMAGE_PATH ) )
		} );

	
	gulp.task( "compile-script",
		[ 
			"initialize"
		],
		function compileScript( ){
			return gulp
				.src( _.union( [
						NEGATED_LIBRARY_PATH
					], SCRIPT_PATH_LIST ) )
				
				.pipe( plumber( ) )
				
				.pipe( cached( "script:compile", { "optimizeMemory": true } ) )
				
				/*.pipe( map( function attachTemplate( file, callback ){
					var fileContent = file.contents.toString( "utf8" );

					file.contents = new Buffer( fileContent );

					callback( null, file );
				} ) )
				.pipe( map( function attachSubTemplate( file, callback ){
					var fileContent = file.contents.toString( "utf8" );

					
					file.contents = new Buffer( fileContent );

					callback( null, file );
				} ) )*/
				
				.pipe( babel( {
					"presets": [ "es2015" ]
				} ) )
				
				.pipe( gulp.dest( DESTINATION_JS_PATH ) );
		} );

	//: All react files should be in jsx.
	gulp.task( "compile-react",
		[ 
			"initialize"
		],
		function compileReact( ){
			return gulp
				.src( [
					NEGATED_LIBRARY_PATH,
					path.resolve( SOURCE_PATH, "**/*.jsx" )
				] )
				
				.pipe( plumber( ) )
				
				.pipe( cached( "script:compile", { "optimizeMemory": true } ) )
				
				/*.pipe( map( function attachTemplate( file, callback ){
					var fileContent = file.contents.toString( "utf8" );

					var templateList = parameta( fileContent ).template || [ ];
					if( templateList.length > 1 ){
						templateList.forEach( function onEachTemplate( template ){
							var templatePath = path.resolve( SOURCE_PATH, template.execute( ) );

							if( fs.existsSync( templatePath ) ){
								var templateContent = fs.readFileSync( templatePath, "utf8" );

								template
									.change( templateContent )
									.persist( );
							
							}else{
								console.log( "template", templatePath, "does not exists" );
							}	
						} );
					}

					fileContent = templateList.raw;

					file.contents = new Buffer( fileContent );

					callback( null, file );
				} ) )*/
				
				.pipe( babel( {
					"presets": [ "react" ]
				} ) )
				
				.pipe( gulp.dest( DESTINATION_JS_PATH ) );
		} );

	gulp.task( "build-script",
		[ 
			"initialize", 
			"compile-react", 
			"compile-script" 
		],
		function buildScript( ){
			if( TERRAFORM_MODE == "cloud" ){
				return gulp
					.src( path.resolve( DESTINATION_JS_PATH, "*.js" ) )

					.pipe( plumber( ) )

					.pipe( concat( [ APPLICATION_NAME, "js" ].join( "." ) ) )

					.pipe( gulp.dest( DESTINATION_SCRIPT_PATH ) )

					.pipe( sourcemap.init( ) )

					.pipe( uglify( {
						"comments": ( /\/\/\:\!|\/\*\:\!/ )
					} ) )

					.pipe( sourcemap.write( DESTINATION_SCRIPT_PATH ) )

					.pipe( rename( [ APPLICATION_NAME, "min.js" ].join( "." ) ) )

					.pipe( changed( DESTINATION_SCRIPT_PATH ) )

					.pipe( gulp.dest( DESTINATION_SCRIPT_PATH ) )

			}else{
				return gulp
					.src( path.resolve( DESTINATION_JS_PATH, "*.js" ) )

					.pipe( plumber( ) )

					.pipe( concat( [ APPLICATION_NAME, "js" ].join( "." ) ) )

					.pipe( gulp.dest( DESTINATION_SCRIPT_PATH ) );
			}	
		} );

	gulp.task( "build-index",
		[ 
			"initialize",
			
			"build-library",
			"build-font",
			"build-image",

			"build-style",
			
			"build-script"
		],
		function buildIndex( ){
			return gulp
				.src( INDEX_PATH )

				/*.pipe( map( function attachTemplate( file, callback ){
					var fileContent = file.contents.toString( "utf8" );

					file.contents = new Buffer( fileContent );

					callback( null, file );
				} ) )*/				

				.pipe( gulp.dest( path.resolve( DESTINATION_PATH ) ) );						
		} );

	gulp.task( "build", [
		"initialize",
		
		"copy-library",
		"build-library",
		"build-font",
		
		"build-image",
		
		"build-sass",
		"build-less",
		"build-css",
		"build-style",
		
		"compile-react",
		"compile-script",
		"build-script",
		
		"build-index"
	] );

	//: This will clean the library at the source only.
	gulp.task( "clean-library",
		[ 
			"initialize"
		],
		function cleanLibrary( ){
			return gulp
				.src( SOURCE_LIBRARY_PATH, { "read": false } )
				
				.pipe( plumber( ) )
				
				.pipe( vinylPath( del ) );
		} );

	//: This will delete everything from the build directory
	gulp.task( "clean-build",
		[ 
			"initialize"
		],
		function cleanBuild( ){
			return gulp
				.src( DESTINATION_PATH, { "read": false } )
				
				.pipe( plumber( ) )
				
				.pipe( vinylPath( del ) );
		} );

	gulp.task( "clean", [
		"initialize",
		"clean-library",
		"clean-build"
	] );

	gulp.task( "default", [
		"initialize",
		"clean",
		"build"
	] );

	return gulp;
};

module.exports = terraforma;
