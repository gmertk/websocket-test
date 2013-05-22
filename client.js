//Required modules
var io = require('socket.io-client');
var _ = require("underscore");
var fs = require('fs');
var argv = require('optimist')
	.usage('Usage: $0 -t [num] -c [num]')
    .demand(['t','c'])
    .argv;
require("http").globalAgent.maxSockets = Infinity;

//Variables
var amazonServer = "http://ec2-46-51-132-238.eu-west-1.compute.amazonaws.com:8080";
var localServer = "http://localhost:8080";
var server = argv.l ? localServer : amazonServer;
var i = 0;
var clients = [];
var concurrency = argv.c;
var rampupTime = 1000;
var roundTripTimes = [];
var newMessageIntervalPerClient = argv.t;
var funcId;
var timeoutTest = 30000 + rampupTime;
var isTesting;
var numberOfDone = 0;
var numberOfConnected = 0;
var processRoundtrips = function(){
	var stats = [];
	var length = roundTripTimes.length;
	for (var i = 0; i < length; i++) {
		stats.push(	roundTripTimes[i].rt );
	}
	return stats;
};

var createClient = (function () {
	var countId = 0;
	var numberOfFailed = 0;
	return function(){
		var id = countId++;

		var socket = io.connect(server, {'force new connection':true});//, 'transports': ['websocket']});
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
		};

		socket.on('connect', function(){
			numberOfConnected++;
			var schedule = function(){
				if(isTesting){
					send();
					setTimeout(schedule, newMessageIntervalPerClient);
				}
				else{
					numberOfDone++;
				}
			};

			//console.log(id + " connected");
			schedule();

			socket.on('dataMessage', function(data){
				var rt = Date.now() - data.time;
				if(countId >= concurrency-1)
					roundTripTimes.push({'id': id, 'rt': rt});
			});
			socket.on('disconnect', function(){
				numberOfConnected--;
				console.log(id + " disconnected!!");
			});

			socket.on('reconnect_failed', function(){
				numberOfFailed++;
				console.log("reconnect_failed for: " + id + ", total failed connections: " + numberOfFailed);
			});
		});

		clients.push(socket);
	};
}());

var makeConnections = function(conc){
	var i = 0;
	var interval = rampupTime / conc;
	for(i = 0; i < conc; i++){
		setTimeout(createClient, i * interval);
	}
};
var summary = function(arr){
	var sum = _.reduce(arr, function(memo, num){ return memo + num; }, 0);
	var average = sum / arr.length;
	var min = _.min(arr);
	var max = _.max(arr);
	return average + "," + min + "," + max;
};
var updateMessageInterval = function(){
	// if(numberOfDone == concurrency - 1){

	// }
	var stats = processRoundtrips();
	var interval = newMessageIntervalPerClient;
	var outputSummary = summary(stats);
	var fileName = 'test'+ concurrency + '.txt';
	var data = [concurrency, interval, outputSummary].join(',') + '\n';
	fs.appendFile(fileName, data, function (err) {
		if(err){
			console.log(err);
		}
		else{
			console.log(fileName + ' written.');
			process.exit();
		}
	});
};
var finishTest = function(){
	isTesting = false;
	console.log("testing finished");
	setTimeout(updateMessageInterval, 60000);
};


(function(){
	isTesting = true;
	makeConnections(concurrency);
	setTimeout(finishTest, timeoutTest);
	// for(var j= 0; j < clients.length; j++){
	// 	clients[j].disconnect('unauthorized');
	// }

	//console.dir(stats);
	// for (var key in stats) {
	// 	if (stats.hasOwnProperty(key)) {
	// 		var s = stats[key];
	// 		
	// 	}
	// }

}());



