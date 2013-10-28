#!/usr/bin/env node
var fileDate = parseInt(Date.now()/10000, 10);
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', function(worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
    });
}
else{
    var argv = require('optimist').demand(['t', 'n']).argv;
    var WebSocketClient = require('websocket').client;
    var fs = require('fs');
    var gauss = require('gauss');
    require('http').globalAgent.maxSockets = Infinity;

    var sendingPeriod = argv.t * 1000;
    var n = parseInt(argv.n, 10);
    var nPerCore = parseInt(n / numCPUs, 10);
    var doubleNPerCore = 2 * nPerCore;
    var instanceNo = argv.x;
    var host = argv.h || "localhost";
    var port = argv.p || "8080";

    var startId = cluster.worker.id * nPerCore;

    var isPublishing = false;
    var stats = [];
    var filename;
    var countSubs = 0;
    var countPubs = 0;
    var countFailedSubs = 0;
    var countFailedPubs = 0;

    var tTestDuration = 60000 * 5;

    start();

    // var testController = new WebSocketClient();
    // var testControllerConn;
    // testController.on('connect', function(connection) {
    //     testControllerConn = connection; 
    // });

    function start(){
        var idLimit = startId + nPerCore;
        for (var j = startId; j < idLimit; j+=1) {
            createPublisher("subject" + j);
            // createPublisher("subject" + (j + 1));

            createSubscriber("subject" + j);
            // createSubscriber("subject" + (j + 1));
        }
        setTimeout(isAllConnected, 20000);
    }

    function isAllConnected() {
        if (countSubs + countPubs + countFailedPubs + countFailedSubs >= doubleNPerCore) {
            isPublishing = true;
            setTimeout(finishTests, tTestDuration);
            setTimeout(log, 10000);
            console.log("start");
        }
        else {
            setTimeout(isAllConnected, 5000);
        }
    }

    function finishTests() {
        isPublishing = false;
    }

    function log(){
        filename = filename || ('responseTime-' + n + '-'+ fileDate +'.txt');
        if (stats.length > 0){
            var data = stats.join("\n") + "\n";
            stats = [];

            fs.appendFile(filename, data, function (err) {
                if (err) throw err;
                setTimeout(log, 10000);
            });
        }
        else if (isPublishing) {
            setTimeout(log, 10000);
        }
        else {
            var out = "pubs:" + countPubs + ":subs:" + countSubs;
            fs.appendFile("connectedClients-" + fileDate +".txt", out, function (err) {
                if (err) throw err;
                process.exit();
            });
        }
    }

    function createPublisher(subject){
        var client = new WebSocketClient();

        client.on('connect', function(connection) {
            countPubs += 1;
            connection.on('error', function(error) {
                console.log("Connection Error: " + error.toString());
            });
            connection.on('close', function() {
                console.log('Connection Closed');
            });

            function updateSubject() {
                if (connection.connected && isPublishing) {
                    //console.log('Sent: ' + subject);
                    connection.sendUTF(JSON.stringify({
                        type: "publisher",
                        "object": subject,
                        published: +new Date()
                    }));
                }
            }

    		setInterval(updateSubject, sendingPeriod);
        });

        client.on('connectFailed', function(error) {
            countFailedPubs += 1;
            console.log('Connect Error: ' + error.toString());
        });
        client.connect('ws://' + host + ':' + port + '/', 'echo-protocol');
    }

    function createSubscriber(subject){
        var client = new WebSocketClient();

        client.on('connect', function(connection) {
            countSubs += 1;
            connection.on('error', function(error) {
                console.log("Connection error on client "+ subject + ". " + error.toString());
            });
            connection.on('close', function() {
                console.log('Connection Closed with description ' + connection.closeDescription);
            });
            connection.on('message', function(message) {
                if (message.type === 'utf8') {
                    var data = JSON.parse(message.utf8Data);
                    stats.push(data.message + " " + Date.now() + " " + cluster.worker.id);
                }
            });
            connection.sendUTF(JSON.stringify({
                type: "client",
                object: [subject]
            }));
        });

        client.on('connectFailed', function(error) {
            countFailedSubs += 1;
            console.log('Connect failed on client ' + subject + ". " + error.toString());
        });
        client.connect('ws://' + host + ':' + port + '/', 'echo-protocol');
    }
}