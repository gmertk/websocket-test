//Required modules
var io = require('socket.io-client');
var _  = require("underscore");
var argv = require('optimist')
	.usage('Usage: $0 -u [num] -t [num] -m [num], -l')
    .demand(['u','t', 'm'])
    .argv;
require("http").globalAgent.maxSockets = Infinity;

//Variables
var numberOfUsers = argv.u;
var rampUpTime = argv.t;
var newUserTimeout = rampUpTime / numberOfUsers;
var newMessageTimeout = argv.m;
var intervalId;
var userCount = 0;
var totalRoundTrip = 0;
var numberOfRoundTrip = 0;
var amazonServer = "http://ec2-46-51-132-238.eu-west-1.compute.amazonaws.com:8080";
var localServer = "http://localhost:8080";
var server = amazonServer;
var times = [];
var rt = 10;
if(argv.l){
	server = localServer;
}
function done(){
	console.log('Min: ' + roundNumber(_.min(times) / rt, 2)  + 'ms');
	console.log('Mean: ' + roundNumber(_.reduce(times, function(memo, num) {
		return memo + num;
	}, 0) / times.length / rt, 2) + 'ms');
	console.log('Max: ' + roundNumber(_.max(times) /rt, 2) + 'ms');
}

function roundNumber(num, prec) {
  var mul = Math.pow(10, prec);
  return Math.round(num * mul) / mul;
}
function test(){
	createClient(userCount);
	if(userCount === numberOfUsers-1){
		// setInterval(function(){
		// 	console.log("Average roundtrip " + roundNumber(totalRoundTrip / numberOfRoundTrip, 2)+ " for " + totalRoundTrip + " roundtrips" );
		// }, 1000);
	}
	else{
		userCount++;
	}
}

function createClient(userId){
	var data = {
		'time' : "",
		'id' : "someUniqueId",
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
	var roundtrip = 0;
	var elapsedRoundtrip = 0;
	var socket = io.connect(server, {'force new connection':true});

	socket.on('connect', function(){
		data.time = Date.now();
		socket.emit('dataMessage', data);
	});
	socket.on('dataMessage', function(data){
		var elapsed = Date.now() - data.time;

		if(userCount === numberOfUsers-1){
			elapsedRoundtrip += elapsed;
			roundtrip++;
			if(roundtrip === rt){

				times.push(elapsedRoundtrip);
				// console.log("Elapsed time " + elapsedRoundtrip +
				// 	" for number of " + rt +
				// 	" for id " + userId);
			}
		}
		if(times.length === numberOfUsers-1){
			done();
		}
		else if(times.length < numberOfUsers-1) {
			setTimeout(function(){
				data.time = Date.now();
				socket.emit('dataMessage', data);
			}, newMessageTimeout);

		}
	});
	socket.on('disconnect', function(){
		console.log(userId + " disconnected!!");
	});

}

for(var i=0; i<numberOfUsers; i++) {
	setTimeout(test, i * newUserTimeout);
}
