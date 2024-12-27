var express = require( "express" );
var app = express();
var http = require( "http" ).createServer( app );

app.use( express.static( __dirname + "/public/" ) );

var port = 8080;
http.listen( port, function() {
	console.log( "Listening on port " + port );
} );