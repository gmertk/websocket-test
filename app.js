//Required Modules
var io = require('socket.io').listen(8080);
var logger = require('winston');
var argv = require('optimist').argv;
var exec = require('child_process').exec;
//require("http").globalAgent.maxSockets = Infinity;

//Variables
var connectedUsersCount = 0;
var messagesPerSecond = 0;
var countReceived = 0;
var timeoutLogStatus = 1000;
var getCpuCommand = "ps -p " + process.pid + " -o %cpu,%mem";
console.log(process.pid);

//Logger options
logger.cli();
logger.default.transports.console.timestamp = true;
if(argv.o){
  logger.add(logger.transports.File, { filename:  Date.now() + '.txt'});
}
//Socket.io options
io.set('heartbeat interval', 40);
// io.set('close timeout', 120);
//io.set('heartbeat timeout', 60);
io.set('log level', 0); //0: error, 1:warn, 2:info, 3:debug
io.set('transports', ['websocket']);

io.sockets.on('connection', function(socket){
	connectedUsersCount++;
	socket.on('dataMessage', function(data){
        messagesPerSecond++;
		socket.emit('dataMessage', data);
		//socket.broadcast.emit() //send everyone except this socket
		//io.sockets.emit() //send all
		countReceived++;
	});
	socket.on('disconnect', function(){
		connectedUsersCount--;
	});
});

// setTimeout(logStatus, timeoutLogStatus);
// function logStatus() {
//     setTimeout(logStatus, timeoutLogStatus);
//     logger.info("users: " + connectedUsersCount + "\tmessagesPerSec: " + messagesPerSecond);
//     messagesPerSecond = 0;
// }

setInterval(function() {
  var auxReceived = Math.round(countReceived / connectedUsersCount);
  var msuReceived = (connectedUsersCount > 0 ? auxReceived : 0);

  // call a system command (ps) to get current process resources utilization
  var child = exec(getCpuCommand, function(error, stdout, stderr) {
    var s = stdout.split(/\s+/);
    var cpu = s[2];
    var memory = s[3];

    var l = [
      'U: ' + connectedUsersCount,
      'MR/S: ' + countReceived,
      'MR/S/U: ' + msuReceived,
      'CPU: ' + cpu,
      'Mem: ' + memory
    ];

    logger.info(l.join(',\t'));
    countReceived = 0;
  });

}, 5000);