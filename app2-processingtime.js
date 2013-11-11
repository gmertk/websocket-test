var cluster = require('cluster');
var numCPUs = 2;//require('os').cpus().length;
var logCount = 0;

if (cluster.isMaster) {
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', function(worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
    });
} else {
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

    var log = function(){
        if (statsEvent.length > 0) {
            var fileOutput = statsEvent.join('\n') + ' \n';
            statsEvent = [];
            
            fs.appendFile("eventTimes-" + logCount + ".txt", fileOutput, function(err) {
                if(err) {
                    console.log(err);
                }
            });
        }

        if (statsProcTime.length > 0) {
            var procTimeOutput = statsProcTime.join('\n') + ' \n';
            statsProcTime = [];

            fs.appendFile("procTimes-" + logCount + ".txt", procTimeOutput, function(err) {
                if(err) {
                    console.log(err);
                }
            });
        }

        if (statsUvmon.length > 0) {
            var uvmonOutput = statsUvmon.join('\n') + '\n';
            statsUvmon = [];
            fs.appendFile("uvmon-" + logCount + ".txt", uvmonOutput, function(err) {
                if(err) {
                    console.log(err);
                }
            });
        }
        if (connectedUsersCount <= 0) {
            isStarted = false;
            clearTimeout(idUvmon);
            logCount += 1;
            
            console.log("finished");
        }
        else {
            setTimeout(log, timeoutLogStatus);
        }
    };

    wsServer = new WebSocketServer({
        httpServer: server,
        keepalive: false
    });

    wsServer.on('request', function(request) {
        var subscriber;

        var connection = request.accept('echo-protocol', request.origin);
        connectedUsersCount++;

        connection.on('message', function(message) {
            var tMessageReceived = process.hrtime();
            if (message.type === 'utf8') {
                var data = JSON.parse(message.utf8Data);
                if(data.type === "client"){
                    subscriber = redis.createClient(port, host);
                    subscriber.subscribe.apply(subscriber, data["object"]);
                    subscriber.on("message", function(channel, message){
                        var tMessageSubsCallback = process.hrtime();
                        countSent++;
                        message = JSON.parse(message);
                        var tBeforeSent = process.hrtime();
                        connection.sendUTF(JSON.stringify({channel:channel, message:message['m']}));
                        var tAfterSent = process.hrtime();
                        var lag = toobusy.lag();
                        statsProcTime.push([tMessageSubsCallback, tBeforeSent, tAfterSent,
                            message.tMessageReceived, message.tMessagePublished,
                            lag, cluster.worker.id].join(' '));
                    });
                }
                else if (data.type === "publisher") {
                    countReceived++;
                    statsEvent.push(Date.now());

                    if (!isStarted) {
                        isStarted = true;
                        
                        idUvmon = setInterval(function() {
                            statsUvmon.push(util.inspect(uvmon.getData()) + " " + cluster.worker.id);
                        }, 5000);
                        
                        setTimeout(log, timeoutLogStatus);

                    }
                    var publishedMessage = {
                        "m": data.published,
                        "tMessagePublished": process.hrtime(),
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



}