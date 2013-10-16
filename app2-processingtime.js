var argv = require('optimist').argv;
var toobusy = require('toobusy');
var redis   = require('redis');
var fs = require('fs');
var http = require('http');
http.globalAgent.maxSockets = Infinity;
var WebSocketServer = require('websocket').server;

var port = argv.p || 6379;
var host = argv.h || "127.0.0.1";

var connectedUsersCount = 0;
var countReceived = 0;
var countSent = 0;

var isStarted = false;
var statsArray = [];
var statsProcTime = [];
var prevLog;

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
    httpServer: server,
    keepalive: false
});

wsServer.on('request', function(request) {
    var subscriber;

    var connection = request.accept('echo-protocol', request.origin);
    connectedUsersCount++;

    connection.on('message', function(message) {
        var tMessageReceived = Date.now();
        if (message.type === 'utf8') {
            var data = JSON.parse(message.utf8Data);
            if(data.type === "client"){
                subscriber = redis.createClient(port, host);
                subscriber.subscribe.apply(subscriber, data["object"]);
                subscriber.on("message", function(channel, message){
                    var tMessageSubsCallback = Date.now();
                    countSent++;
                    message = JSON.parse(message);
                    var tBeforeSent = Date.now();
                    connection.sendUTF(JSON.stringify({channel:channel, message:message['m']}));
                    var tAfterSent = Date.now();
                    var lag = toobusy.lag();
                    statsProcTime.push([tMessageSubsCallback, tBeforeSent, tAfterSent, parseInt(message.tMessageReceived, 10), parseInt(message.tMessagePublished, 10), lag]);
                });
            }
            else if (data.type === "publisher") {
                countReceived++;
                if (!isStarted) {
                    isStarted = true;
                    prevLog = Date.now();
                    log();
                }
                var publishedMessage = {
                    "m": data.published,
                    "tMessagePublished": Date.now(),
                    "tMessageReceived": tMessageReceived
                };
                publisher.publish(data["object"], JSON.stringify(publishedMessage));
            }
            else if (data.type === "testcontroller") {
                if (data["object"] === "start") {

                }
                else if (data["object"] === "finish") {

                }
                else if (data["object"] === "next") {

                }
                else if (data["object"] === "shutdown") {

                }
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

function log(){
    var now = Date.now();
    var logElapsed = now - prevLog;
    var l = [
        connectedUsersCount,
        countReceived,
        countSent,
        logElapsed
    ];

    var output = l.join(' ');
    if (argv.o) {
        console.log(output);
    }
    statsArray.push(output);

    countReceived = 0;
    countSent = 0;

    if (connectedUsersCount <= 0 && isStarted) {
        var fileOutput = statsArray.join('\n');
        statsArray = [];
        var fileDate = Date.now();
        fs.writeFile("events-" + fileDate + ".txt", fileOutput, function(err) {
            isStarted = false;
            if(err) {
                console.log(err);
            } else {
                console.log("The file was saved!");
            }
        });

        var procTimeOutput = statsProcTime.join(' ');
        statsProcTime = [];

        fs.writeFile("processingTime-" + fileDate + ".txt", procTimeOutput, function(err) {
            if(err) {
                console.log(err);
            } else {
                console.log("The file processing time was saved!");
            }
        });
    }

    prevLog = Date.now();
    setTimeout(log, timeoutLogStatus);
}