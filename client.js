//Required modules
var io = require('socket.io-client');
var _ = require("underscore");
var fs = require('fs');
var argv = require('optimist').argv;
require("http").globalAgent.maxSockets = Infinity;

//Variables
var concurrencyLevels = [500];//, 1000, 1500, 2000];
var amazonServer = "http://ec2-46-51-132-238.eu-west-1.compute.amazonaws.com:8080";
var localServer = "http://localhost:8080";
var server = argv.l ? localServer : amazonServer;
var i = 0;
var clients = [];
var concurrency;
var rampupTime = 1000;
var roundTripTimes = [];
var newMessageIntervalPerClient = 1000;
var funcId;

var processRoundtrips = function(){
	var stats = [];
	for (var i = 0; i < roundTripTimes.length; i++) {
		stats.push(	roundTripTimes[i] );
	}
	return stats;
};

var createClient = (function () {
	var countId = 0;

	return function(){
		var id = countId++;

		var socket = io.connect(server, {'force new connection':true});//, 'transports': ['websocket']});
		var send = function(){
			var data = {
				'time' : "",
				'id' : id,
				'name': "deviceName",
				'data' : [
					{	"current_value" : "20",
						"id" : "0",
						"max_value" : "30",
						"min_value" : "0",
						"unit": "celcius",
						"tags": ["heat", "sensor"]
					},
					{	"current_value" : "1",
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
			var schedule = function(){
				send();
				setTimeout(schedule, newMessageIntervalPerClient);
			};

			//console.log(id + " connected");
			schedule();

			socket.on('dataMessage', function(data){
				var rt = Date.now() - data.time;
				roundTripTimes.push(id + ": " + rt);
			});
			socket.on('disconnect', function(){
				console.log(id + " disconnected!!");
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
var updateMessageInterval = function(){
	var stats = processRoundtrips();
	var interval = newMessageIntervalPerClient;
	var data = stats.join('\n');
	fs.writeFile("./test"+ concurrency + "-" + interval, data, function(err) {
		if(err) {
			console.log(err);
		} else {
			console.log("The file was saved!");
			roundTripTimes = [];
			newMessageIntervalPerClient -= 100;
			if(newMessageIntervalPerClient > 0)
				setTimeout(updateMessageInterval,10000);
			}

	});
};

(function(){
	for(i = 0; i < concurrencyLevels.length; i++){
		concurrency = concurrencyLevels[i];
		postTestTimeout = false;
		makeConnections(concurrency);

		funcId = setTimeout(updateMessageInterval,10000);
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
	}
}());



