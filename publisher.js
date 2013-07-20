var argv = require('optimist').demand(['t', 'n']).argv;
var WebSocketClient = require('websocket').client;
require('http').globalAgent.maxSockets = Infinity;

var t = argv.t * 1000;
var n = argv.n;
var publishers = [];
var host = argv.h || "localhost";
var port = argv.p || "8080";

start();
var waitingTimeBetweenConn = 5;
var id = 0;
function start(){
    // for (var i = 0; i < n; i++) {
    //    createPublisher(i);
    // }
    setTimeout(function(){
        if(id < n){
            createPublisher("subject" + id);
            id++;
            start();
        }
    }, waitingTimeBetweenConn);
}

function createPublisher(subject){
    var client = new WebSocketClient();

    client.on('connect', function(connection) {
        console.log(subject + " connected.");
        connection.on('error', function(error) {
            console.log("Connection Error: " + error.toString());
        });
        connection.on('close', function() {
            console.log('Connection Closed');
        });

        function updateSubject() {
            if (connection.connected) {
                if(id == n){
                    console.log('Sent: ' + subject);
                    connection.sendUTF(JSON.stringify({
                        subject: subject,
                        message: +new Date(),
                        whois: "publisher"
                    }));
                }
                setTimeout(updateSubject, t);
            }
        }
        updateSubject();
    });

    client.on('connectFailed', function(error) {
        console.log('Connect Error: ' + error.toString());
    });
    client.connect('ws://' + host + ':' + port + '/', 'echo-protocol');
}