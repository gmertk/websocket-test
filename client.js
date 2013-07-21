var argv = require('optimist').demand(['s', 'j']).argv;
var WebSocketClient = require('websocket').client;
var fs = require('fs');
var gauss = require('gauss');
require('http').globalAgent.maxSockets = Infinity;

var numberOfSubjectsPerClient = argv.s;
var n = numberOfSubjectsPerClient * argv.j;
var subjects = [];
var instanceNo = argv.x;
var startId = instanceNo * argv.j;

for (var x = startId; x < argv.j + startId; x++){
    subjects.push('subject'+x);
}

var stats = new gauss.Vector();
var countStats = 0;
var connectionsFailed = 0;
var connectionsClosed = 0;
var waitingTimeBetweenConn = argv.d || 10;
var host = argv.h || "localhost";
var port = argv.p || "8080";

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
        else{
            stats = gauss.Vector();
            log();
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

    client.connect('ws://' + host + ':' + port + '/', 'echo-protocol');
}

var filename;
function log(){
    filename = filename || ('stats' + '-' + numberOfSubjectsPerClient + '-' + subjects.length + '-'+ (+new Date())+'.txt');
    if(stats.length > 0){
        // var max = stats.reduce(function (p, v) {
        //     return ( p > v ? p : v );
        // });
        // var min = stats.reduce(function (p, v) {
        //     return ( p < v ? p : v );
        // });
        // var total = stats.reduce(function(previousValue, currentValue, index, array){
        //   return previousValue + currentValue;
        // }, 0);
        // var mean = total / stats.length;
        var max = stats.max();
        var min = stats.min();
        var mean = stats.mean();
        var stdev = stats.stdev();

        var data = [n, mean, max, min, stdev, stats.length, connectionsClosed, connectionsFailed].join(" ") + "\n";
        fs.appendFile(filename, data , function (err) {
            if (err) throw err;
                console.log(data + "was appended to file!");

            if((connectionsFailed === 0) && (connectionsClosed === 0) && (countStats < 5)){
                countStats++;
                stats = new gauss.Vector();
                setTimeout(log, 10000);
            }
            else{
                console.log("failed: " + connectionsFailed + "closed: " + connectionsClosed);
                process.exit();
            }
        });
    }
    else{
        setTimeout(log, 5000);
    }
}

function getRandomSubjects(){
    var randomSubjects = [];
    var arr = [];
    var i;
    for (i = 0; i < subjects.length; i++) {
        arr[i] = i;
    }

    for (i = 0; i < numberOfSubjectsPerClient; i++) {
        var rand = getRandomInt(i, arr.length-1);
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
