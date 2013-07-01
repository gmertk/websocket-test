var argv = require('optimist').demand(['n', 's']).argv;
var WebSocketClient = require('websocket').client;
var fs = require('fs');

var n = argv.n;
var numberOfSubjectsPerClient = argv.s;
var subjects = ['fun', 'movie', 'holiday', 'sport', 'tech', 'news',
                'programming','computers', 'phones', 'relationships'];
var stats = [];

for (var i = 0; i < n; i++) {
    (function(index){
        var client = new WebSocketClient();
        var randomSubjects = getRandomSubjects();

        client.on('connect', function(connection) {
            console.log('WebSocket client connected' + index);
            connection.on('error', function(error) {
                console.log("Connection Error: " + error.toString());
            });
            connection.on('close', function() {
                console.log('Connection Closed');
            });
            connection.on('message', function(message) {
                if (message.type === 'utf8') {
                    console.log("Received: '" + message.utf8Data + "'");
                    var data = message.utf8Data.split("=");
                    var elapsed = (+new Date() - data[1]);
                    console.log(i + "=" + data[0] + "=" + elapsed);
                    stats.push(elapsed);
                }
            });

            connection.sendUTF("client="+randomSubjects.join(":"));
        });

        client.on('connectFailed', function(error) {
            console.log('Connect Error: ' + error.toString());
        });

        client.connect('ws://localhost:8080/', 'echo-protocol');
    })(i);
}

setInterval(function(){
    var max = Math.max.apply(null, stats);
    var min = Math.min.apply(null, stats);
    var total = stats.reduce(function(previousValue, currentValue, index, array){
      return previousValue + currentValue;
    }, 0);
    var mean = total / stats.length;
    var data = [min, max, mean].join(" ") + "\n";
    fs.appendFile('stats.txt', data , function (err) {
      if (err) throw err;
        console.log(data + "was appended to file!");
    });
}, 5000);

function getRandomSubjects(){
    var randomSubjects = [];
    var arr = [];
    var i;
    for (i = 0; i < subjects.length; i++) {
        arr[i] = i;
    }

    for (i = 0; i < numberOfSubjectsPerClient; i++) {
        var rand = getRandomInt(i+1, arr.length-1);
        var temp = arr[i];
        arr[i] = arr[rand];
        arr[rand] = temp;
        randomSubjects.push(subjects[arr[i]]);
    }
    return randomSubjects;
}

function getRandomInt (min, max) { //both inclusive
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
