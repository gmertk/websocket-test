//require('strong-agent').profile();
var util = require('util');
var uvmon = require('nodefly-uvmon');

var argv = require('optimist').argv;
var toobusy = require('toobusy');
var redis   = require('redis');
var fs = require('fs');
var http = require('http');
http.globalAgent.maxSockets = Infinity;
var WebSocketServer = require('websocket').server;

var port = argv.p || 6379;
var host = argv.h || "127.0.0.1";

var timeoutLogStatus = 10000;

var connectedUsersCount = 0;
var countReceived = 0;
var countSent = 0;

var isStarted = false;
var statsEvent = [];
var statsProcTime = [];
var statsUvmon = [];
var prevLog;
var fileDate;
var idUvmon;

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
                    setTimeout(eps, 1000);
                    idUvmon = setInterval(function() {
                        statsUvmon.push(util.inspect(uvmon.getData()));
                    }, 5000);

                    fileDate = Date.now();
                    log();
                }
                var publishedMessage = {
                    "m": data.published,
                    "tMessagePublished": Date.now(),
                    "tMessageReceived": tMessageReceived
                };
                publisher.publish(data["object"], JSON.stringify(publishedMessage));
            }
        }
    });
    connection.on('close', function(reasonCode, description) {
        connectedUsersCount--;
        // console.log((new Date()) + ' Peer disconnected.');
        // console.log(connectedUsersCount + ' users.');
        subscriber && subscriber.end();
    });
});


function eps() {
    if (countSent !== 0) {
        var now = Date.now();
        var logElapsed = now - prevLog;
        var l = [
            connectedUsersCount,
            countReceived,
            countSent,
            logElapsed,
        ];

        var output = l.join(' ');
        if (argv.o) {
            console.log(output);
        }
        statsEvent.push(output);
    }

    countReceived = 0;
    countSent = 0;

    if (connectedUsersCount > 0) {
        prevLog = Date.now();
        setTimeout(eps, 1000);
    }
}

function log(){
    if (statsEvent.length > 0) {
        var fileOutput = statsEvent.join('\n') + '\n';
        statsEvent = [];
        fs.appendFile("events-" + fileDate + ".txt", fileOutput, function(err) {
            if(err) {
                console.log(err);
            }
        });
    }

    if (statsProcTime.length > 0) {
        var procTimeOutput = statsProcTime.join(' ') + ' \n';
        statsProcTime = [];

        fs.appendFile("processingTime-" + fileDate + ".txt", procTimeOutput, function(err) {
            if(err) {
                console.log(err);
            }
        });
    }

    if (statsUvmon.length > 0) {
        var uvmonOutput = statsUvmon.join('\n') + '\n';
        statsUvmon = [];
        fs.appendFile("uvmon-" + fileDate + ".txt", uvmonOutput, function(err) {
            if(err) {
                console.log(err);
            }
        });
    }
    if (connectedUsersCount <= 0) {
        isStarted = false;
        clearTimeout(idUvmon);
    }
    else {
        setTimeout(log, timeoutLogStatus);
    }
}