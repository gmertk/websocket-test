var argv = require('optimist').demand(['n', 's']).argv;
var WebSocketClient = require('websocket').client;
var fs = require('fs');

var n = argv.n;
var numberOfSubjectsPerClient = argv.s;
var subjects = ['fun', 'movie', 'holiday', 'sport', 'tech', 'news',
                'programming','computers', 'phones', 'relationships'];
var stats = [];
var countStats = 0;
var connectionsFailed = 0;
var connectionsClosed = 0;
var waitingTimeBetweenConn = 10;
start();

var id = 0;
function start(){
    // for (var i = 0; i < n; i++) {
    //    createClient(i);
    // }
    setTimeout(function(){
        if(id < n){
            createClient(id);
            start();
            id++;
        }
    }, waitingTimeBetweenConn);
}

function createClient(index){
    var client = new WebSocketClient();
    var randomSubjects = getRandomSubjects();
    client.on('connect', function(connection) {
        console.log('WebSocket client connected ' + index);
        connection.on('error', function(error) {
            console.log("Connection error on client "+ index + ". " + error.toString());
        });
        connection.on('close', function() {
            connectionsClosed++;
            console.log('Connection Closed with description ' + connection.closeDescription);
        });
        connection.on('message', function(message) {
            if (message.type === 'utf8') {
                //console.log(index + "=" + message.utf8Data);
                var data = JSON.parse(message.utf8Data);
                var elapsed = +new Date() - data.message;
                stats.push(elapsed);
            }
        });
        connection.sendUTF(JSON.stringify({whois:"client", subjectsToSubscribe:randomSubjects}));
    });

    client.on('connectFailed', function(error) {
        connectionsFailed++;
        console.log('Connect failed on client ' + index + ". " + error.toString());
    });

    client.connect('ws://localhost:8080/', 'echo-protocol');
}

setTimeout(function log(){
    if(stats.length > 0){
        var max = stats.reduce(function (p, v) {
            return ( p > v ? p : v );
        });
        var min = stats.reduce(function (p, v) {
            return ( p < v ? p : v );
        });
        var total = stats.reduce(function(previousValue, currentValue, index, array){
          return previousValue + currentValue;
        }, 0);
        var mean = total / stats.length;
        var data = [n, mean, max, min, stats.length, connectionsClosed, connectionsFailed].join(" ") + "\n";
        fs.appendFile('stats.txt', data , function (err) {
            if (err) throw err;
                console.log(data + "was appended to file!");

            if((connectionsFailed === 0) && (connectionsClosed === 0) && (countStats < 6)){
                countStats++;
                setTimeout(log, 5000);
            }
            else{
                console.log("failed: " + connectionsFailed + "closed: " + connectionsClosed);
                process.exit();
            }
        });
    }
}, waitingTimeBetweenConn * n);

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
