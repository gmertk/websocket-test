
var redis = require('redis');
var redisClient = redis.createClient();


exports.getMembers = function(callback){
	redisClient.smembers('chatters', function(err, names){
		names.forEach(function(name){
			client.emit('add chatter', name);
			//callback(name);
		});
	});
		
};