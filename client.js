//Required modules
var io = require('socket.io-client');
var _ = require("underscore");
var fs = require('fs');
var argv = require('optimist')
	.usage('Usage: $0 -t [num newMessageIntervalPerClient] -c [num concurrency]')
    .demand(['t','c'])
    .argv;
require("http").globalAgent.maxSockets = Infinity;

//Variables
var amazonServer = "http://ec2-54-216-170-213.eu-west-1.compute.amazonaws.com:80";
var localServer = "http://localhost:8080";
var server = argv.l ? localServer : amazonServer;
var newMessageIntervalPerClient = argv.t;
var concurrency = argv.c;
var rampupTime = concurrency * 10;
var testStartTime = rampupTime + 30000;
var timeoutTest = 30000;
var waitAfterTest = 10000;
var isTesting;
var numberOfConnected;
var numberOfFailed;
var numberOfReconnected;
var countSentMessages;
var countReceivedMessaged;
var roundTripTimes;
var clients;
var countId;


var createClient = function () {
	var id = countId++;

	var socket = io.connect(server, {'force new connection':true, 'max reconnection attempts': 0, 'reconnect': false});
	var send = function(){
		var data = {
			'time' : "",
			'id' : id,
			'name': "deviceName",
			'data' : [
				{	"current_value" : Math.floor(Math.random() * 31),
					"id" : "0",
					"max_value" : "30",
					"min_value" : "0",
					"unit": "celcius",
					"tags": ["heat", "sensor"]
				},
				{	"current_value" : Math.floor(Math.random() * 2),
					"id" : "1",
					"max_value" : "1",
					"min_value" : "0",
					"unit": "",
					"tags": ["button"]
				}
			]
		};
		data.time = Date.now();
		socket.emit('dataMessage', data);
		countSentMessages++;
	};

	var schedule = function(){
		if(isTesting){
			send();
			setTimeout(schedule, newMessageIntervalPerClient);
		}
	};
	socket.on('connect', function(){
		numberOfConnected++;
		socket.customSchedule = schedule;
		//console.log(id + " connected");
		socket.on('dataMessage', function(data){
			countReceivedMessaged++;
			var rt = Date.now() - data.time;
			roundTripTimes.push({'id': id, 'rt': rt});
		});
		socket.on('disconnect', function(){
			//console.log(id + " disconnected!!");
			numberOfFailed++;
		});

		socket.on('error', function(){
		});
		socket.on('reconnect_failed', function(){
			numberOfReconnected++;
			console.log("reconnect_failed for: " + id + ", total failed connections: ");
		});
		clients.push(socket);
	});
};


var makeConnections = function(conc){
	var i = 0;
	var interval = rampupTime / conc;
	for(i = 0; i < conc; i++){
		setTimeout(createClient, i * interval);
		//createClient();
	}
};


var processRoundtrips = function(){
	var stats = [];
	var length = roundTripTimes.length;
	var i;
	for (i = 0; i < length; i++) {
		stats.push(	roundTripTimes[i].rt );
	}
	return stats;
};


var summary = function(){
	var allMessagesReceived = (countReceivedMessaged === countSentMessages);
	var isDropped = numberOfFailed > 0 ? true : false;
	var success =  (!isDropped && allMessagesReceived) ? true : false;
	var stats = processRoundtrips();
	var sum = _.reduce(stats, function(memo, num){ return memo + num; }, 0);
	var average = sum / stats.length;
	var min = _.min(stats);
	var max = _.max(stats);
	var data = {
		"concurrency": concurrency,
		"connected": numberOfConnected,
		"failed": numberOfFailed,
		"period": newMessageIntervalPerClient,
		"average": average,
		"min": min,
		"max": max,
		"countSentMessages": countSentMessages,
		"countReceivedMessaged": countReceivedMessaged,
		"success": success
	};
	return data;
};


var updateMessageInterval = function(){
	var output = summary();
	var fileName = 'test'+ concurrency + '.txt';
	var outputString = JSON.stringify(output) + '\n';
	fs.appendFile(fileName, outputString, function (err) {
		if(err){
			console.log(err);
		}
		else{
			console.log(outputString);
			console.log(fileName + ' written.');
			for(var j= 0; j < clients.length; j++){
				clients[j].disconnect('unauthorized');
			}
			newMessageIntervalPerClient = newMessageIntervalPerClient - 10;
			if(output.success && newMessageIntervalPerClient > 0){
				setTimeout(startTest, 30000);
			}
			else{
				process.exit();
			}
		}
	});
};


var finishTest = function(){
	isTesting = false;
	console.log("testing finished");
	setTimeout(updateMessageInterval, waitAfterTest);
};


var startTest = function(){
	countSentMessages = 0;
	countReceivedMessaged = 0;
	numberOfFailed = 0;
	numberOfConnected = 0;
	numberOfReconnected = 0;
	numberOfFailed = 0;
	countId = 0;
	roundTripTimes = [];
	clients = [];

	console.log("making connections...");
	makeConnections(concurrency);
	setTimeout(function(){
		console.log("test started.");
		isTesting = true;
		for(var j= 0; j < clients.length; j++){
			clients[j].customSchedule();
		}
		setTimeout(finishTest, timeoutTest);
	}, testStartTime);
};

(function(){
	startTest();
}());



