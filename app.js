//Required Modules
var logger = require('winston');
var argv = require('optimist').argv;
var exec = require('child_process').exec;
var http = require('http');
http.globalAgent.maxSockets = Infinity;
var WebSocketServer = require('websocket').server;
var redis   = require('redis');

var port = argv.p || 6379;
var host = argv.h || "127.0.0.1";

var server = http.createServer(function(request, response) {
    request.socket.setNoDelay();

    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

server.on("connection", function (socket) {
  socket.setNoDelay(true);
});

server.listen(8080, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});

var publisher = redis.createClient(port, host);

wsServer = new WebSocketServer({
    httpServer: server
});

wsServer.on('request', function(request) {
    var subscriber;

    var connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted.');
    connectedUsersCount++;

    connection.on('message', function(message) {
        countReceived++;
        if (message.type === 'utf8') {
            //console.log('Received Message: ' + message.utf8Data);
            var data = JSON.parse(message.utf8Data);
            if(data.whois === "client"){
              subscriber = redis.createClient(port, host);
              subscriber.subscribe.apply(subscriber, data.subjectsToSubscribe);
              subscriber.on("message", function(channel, message){
                connection.sendUTF(JSON.stringify({channel:channel, message:message}));
              });
            }
            else if (data.whois === "publisher"){
              publisher.publish(data.subject, data.message);
            }
        }
    });
    connection.on('close', function(reasonCode, description) {
        connectedUsersCount--;
        console.log((new Date()) + ' Peer disconnected.');
        console.log(connectedUsersCount+ ' users.');
        subscriber && subscriber.end();
    });
});

//Variables
var connectedUsersCount = 0;
var messagesPerSecond = 0;
var countReceived = 0;
var timeoutLogStatus = 1000;
var getCpuCommand = "ps -p " + process.pid + " -o %cpu,%mem";

//Logger options
logger.cli();
logger.default.transports.console.timestamp = true;
// if(argv.o){
//   logger.add(logger.transports.File, { filename:  Date.now() + '.txt'});
// }



// setTimeout(logStatus, timeoutLogStatus);
// function logStatus() {
//     setTimeout(logStatus, timeoutLogStatus);
//     logger.info("users: " + connectedUsersCount + "\tmessagesPerSec: " + messagesPerSecond);
//     messagesPerSecond = 0;
// }

if(argv.o){
  log();

}
function log(){
    // var auxReceived = Math.round(countReceived / connectedUsersCount);
    // var msuReceived = (connectedUsersCount > 0 ? auxReceived : 0);

      var l = [
        'U: ' + connectedUsersCount
      ];

      logger.info(l.join(',\t'));
      // countReceived = 0;

    // call a system command (ps) to get current process resources utilization
    /** /
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
    //});
/**/
  setTimeout(log, 10000);
}
