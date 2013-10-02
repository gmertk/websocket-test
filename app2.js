//Required Modules
var logger = require('winston');
var argv = require('optimist').argv;
//var exec = require('child_process').exec;
var http = require('http');
http.globalAgent.maxSockets = Infinity;
var WebSocketServer = require('websocket').server;
var redis   = require('redis');
var fs = require('fs');


var port = argv.p || 6379;
var host = argv.h || "127.0.0.1";

var connectedUsersCount = 0;
var countReceived = 0;
var countSent = 0;
var isStarted = false;
var statsArray = [];
var statsProcTime = [];

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
    //console.log((new Date()) + ' Connection accepted.');
    connectedUsersCount++;

    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            var data = JSON.parse(message.utf8Data);
            if(data.whois === "client"){
              subscriber = redis.createClient(port, host);
              subscriber.subscribe.apply(subscriber, data.subjectsToSubscribe);
              subscriber.on("message", function(channel, message){
                countSent++;
                message = JSON.parse(message);
                connection.sendUTF(JSON.stringify({channel:channel, message:message['m']}));
                statsProcTime.push(+new Date() - parseInt(message.startTime, 10));
              });
            }
            else if (data.whois === "publisher"){
              countReceived++;
              if (!isStarted) {
                isStarted = true;
              }
              var publishedMessage = {"m": data.message, "startTime": +new Date()};
              publisher.publish(data.subject, JSON.stringify(publishedMessage));
            }
        }
    });
    connection.on('close', function(reasonCode, description) {
        connectedUsersCount--;
        console.log((new Date()) + ' Peer disconnected.');
        console.log(connectedUsersCount + ' users.');
        subscriber && subscriber.end();
    });
});

//Variables
var timeoutLogStatus = 1000;
var getCpuCommand = "ps -p " + process.pid + " -o %cpu,%mem";

//Logger options
//logger.cli();
//logger.default.transports.console.timestamp = true;
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
  var prevLog = +Date.now();
  log();
  // setInterval(log, 1000);
}

function log(){
    // var auxReceived = Math.round(countReceived / connectedUsersCount);
    // var msuReceived = (connectedUsersCount > 0 ? auxReceived : 0);
      var now = +Date.now();
      var logElapsed = now - prevLog;
      var l = [
        connectedUsersCount,
        countReceived,
        countSent,
        logElapsed
      ];

      var output = l.join(' ');
      console.log(output);
      statsArray.push(output);

      countReceived = 0;
      countSent = 0;

      if (connectedUsersCount <= 0 && isStarted) {
        var fileOutput = statsArray.join('\n');
        fs.writeFile("test" + Date.now() + ".out", fileOutput, function(err) {
            isStarted = false;
            statsArray = [];
            if(err) {
                console.log(err);
            } else {
                console.log("The file was saved!");
            }
        });

        var procTimeOutput = statsProcTime.join(' ');
        fs.writeFile("processingTimes" + Date.now() + ".out", procTimeOutput, function(err) {
            statsProcTime = [];
            if(err) {
                console.log(err);
            } else {
                console.log("The file processing time was saved!");
            }
        });
      }

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
  prevLog = +Date.now();
  setTimeout(log, 1000);
}

