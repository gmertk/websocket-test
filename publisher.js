var argv = require('optimist').demand(['f', 'j']).argv;
var WebSocketClient = require('websocket').client;

var f = argv.f;
var subjects = [];
for (var x = 0; x < argv.j; x++){
    subjects.push('subject'+x);
}
var host = argv.l ? "localhost" : "ec2-54-228-39-121.eu-west-1.compute.amazonaws.com";



var client = new WebSocketClient();

client.on('connect', function(connection) {
    console.log('WebSocket client connected');
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        console.log('Connection Closed');
    });
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log("Received: '" + message.utf8Data + "'");
        }
    });

    function updateSubjects() {
        if (connection.connected) {
            for(var i = 0; i < f; i++){
                var subject = subjects[getRandomInt(0, subjects.length-1)];
                connection.sendUTF(JSON.stringify({
                    subject: subject,
                    message: +new Date(),
                    whois: "publisher"
                }));
            }
            setTimeout(updateSubjects, 1000);
        }
    }
    updateSubjects();
});

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

client.connect('ws://' + host + ':80/', 'echo-protocol');

function getRandomInt (min, max) { //both inclusive
    return Math.floor(Math.random() * (max - min + 1)) + min;
}