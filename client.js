//Required modules
var io = require('socket.io-client');
var argv = require('optimist')
	.usage('Usage: $0 -u [num] -t [num]')
    .demand(['u','t'])
    .argv;

//Variables
var users = argv.u;
var rampUpTime = argv.t * 1000;
var newUserTimeout = rampUpTime / users;

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
	});

	socket.on('dataMessage', function(data){
		socket.emit('dataMessage', data);
	});

}

for(var i=0; i<users; i++) {
	setTimeout(createClient, i * newUserTimeout);
}
