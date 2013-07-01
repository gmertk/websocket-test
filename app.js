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
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(8080, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});

var publisher = redis.createClient(port, host);

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }

    var subscriber = redis.createClient(port, host);

    var connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted.');
    connectedUsersCount++;

    subscriber.on("message", function(channel, message){
        connection.sendUTF(channel + "=" + message);
    });

    connection.on('message', function(message) {
        countReceived++;
        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
            var data = message.utf8Data.split("=");
            if(data[0] === "client"){
              subscriber.subscribe.apply(subscriber, data[1].split(":"));
            }
            else if (data[0] === "publisher"){
              publisher.publish(data[1], data[2]);
            }
        }
    });
    connection.on('close', function(reasonCode, description) {
        connectedUsersCount--;
        console.log((new Date()) + ' Peer disconnected.');
        subscriber.end();
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
if(argv.o){
  logger.add(logger.transports.File, { filename:  Date.now() + '.txt'});
}



// setTimeout(logStatus, timeoutLogStatus);
// function logStatus() {
//     setTimeout(logStatus, timeoutLogStatus);
//     logger.info("users: " + connectedUsersCount + "\tmessagesPerSec: " + messagesPerSecond);
//     messagesPerSecond = 0;
// }

if(argv.p){
  setInterval(function() {
    var auxReceived = Math.round(countReceived / connectedUsersCount);
    var msuReceived = (connectedUsersCount > 0 ? auxReceived : 0);

      var l = [
        'U: ' + connectedUsersCount,
        'MR/S: ' + countReceived,
        'MR/S/U: ' + msuReceived
      ];

      logger.info(l.join(',\t'));
      countReceived = 0;

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
  }, 1000);
}