//Required modules
var io = require('socket.io-client');
var argv = require('optimist')
	.usage('Usage: $0 -u [num] -t [num] -m [num]')
    .demand(['u','t', 'm'])
    .argv;

//Variables
var users = argv.u;
var rampUpTime = argv.t * 1000; //make it msec
var newUserTimeout = rampUpTime / users;
var newMessageTimeout = argv.m; //it is already msec

function createClient(){
	var data = {
		'time' : Date.now(),
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
	var socket = io.connect('http://localhost:8080', {'force new connection':true});
	socket.on('connect', function(){
		socket.emit('dataMessage', data);
		setInterval(function(){
			socket.emit('dataMessage', data);
		}, newMessageTimeout);
	});

	socket.on('dataMessage', function(data){
		// socket.emit('dataMessage', data);
		// console.log(data);
	});


}

for(var i=0; i<users; i++) {
	setTimeout(createClient, i * newUserTimeout);
}
