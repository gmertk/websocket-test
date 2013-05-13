var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var logger = require('winston');
var argv = require('optimist').argv;

var connectedUsersCount = 0;
var messagesPerSecond = 0;
var timeoutLogStatus = 1000;

logger.cli();
logger.default.transports.console.timestamp = true;

server.listen(8080, function(){
	console.log("server started");
});

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});

io.set('heartbeat interval', 40);
// io.set('close timeout', 120);
//io.set('heartbeat timeout', 60);

io.set('log level', 3); //0: error, 1:warn, 2:info, 3:debug
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

setTimeout(logStatus, timeoutLogStatus);
function logStatus() {
    setTimeout(logStatus, timeoutLogStatus);
    logger.info("users: " + connectedUsersCount + "\tmessagesPerSec: " + messagesPerSecond);
    messagesPerSecond = 0;
}