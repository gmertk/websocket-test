var http = require('http');
var express = require('express');
var app = express();
var server = http.createServer(app);
var socket = require('socket.io');
var io = socket.listen(server);
var redis = require('redis');
var redisClient = redis.createClient();

var storeMessage = function(name, data){
	var message = JSON.stringify({name: name, data: data});

	redisClient.lpush("messages", message, function(err,response){
		redisClient.ltrim("messages", 0, 10);
	});
};

io.sockets.on('connection', function(client){

	client.on('join', function(name){
		client.set('nickname', name);
		client.broadcast.emit("add chatter", name);

		redisClient.lrange("messages", 0, -1, function(err, messages){
			messages = messages.reverse();
			messages.forEach(function(message){
				message = JSON.parse(message);
				client.emit('messages', message.name + ": " + message.data);
			});
		});


		redisClient.sadd("chatters", name);

		redisClient.smembers('chatters', function(err, names){
			names.forEach(function(name){
				client.emit('add chatter', name);
			});
		});
	});

	client.on('messages', function(data){
		client.get('nickname', function(err,name){
			client.broadcast.emit("messages", name + ": " + data);
			storeMessage(name, data);
		});

	});

	client.on('disconnect', function(name){
		client.get('nickname', function(err, name){
			client.broadcast.emit("remove chatter", name);

			redisClient.srem("chatters", name);
		});
	});
});


app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});


server.listen(8080, function(){
	console.log("let's get party started!");
});
