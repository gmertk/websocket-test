var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var logger = require('winston');
var argv = require('optimist')
	.default('hb', true)
	.argv;
var connectedUsersCount = 0;
var messagesPerSecond = 0;

logger.cli();
logger.default.transports.console.timestamp = true;

server.listen(80, function(){
	console.log("server started");
});

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});

io.set('heartbeats', argv.hb);
io.set('log level', 1); //0: error, 1:warn, 2:info, 3:debug
io.set('transports', ['websocket']);

io.sockets.on('connection', function(socket){
	connectedUsersCount++;
	socket.on('dataMessage', function(data){
        messagesPerSecond++;
		socket.emit('dataMessage', data);
		//socket.broadcast.emit() //send everyone except this socket
		//io.sockets.emit() //send all
	});
	socket.on('disconnect', function(){
		connectedUsersCount--;
	});
});


setTimeout(logStatus, 1000);
function logStatus() {
    setTimeout(logStatus, 1000);
    logger.info("users: " + connectedUsersCount + "\tmessagesPerSecond: " + messagesPerSecond);
    messagesPerSecond = 0;
}