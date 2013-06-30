//Required Modules
var config = require('./config').config;
var logger = require('winston');
var argv = require('optimist').argv;
var exec = require('child_process').exec;
var http = require('http');
http.globalAgent.maxSockets = Infinity;
var sockjs = require('sockjs');

var broadcast = {};

var sjs_broadcast = sockjs.createServer();
sjs_broadcast.on('connection', function(conn) {
    console.log('    [+] broadcast open ' + conn);
    broadcast[conn.id] = conn;
    conn.on('close', function() {
      delete broadcast[conn.id];
      console.log('    [-] broadcast close' + conn);
    });
    conn.on('data', function(m) {
      console.log('    [-] broadcast message', m);
      for(var id in broadcast) {
        broadcast[id].write(m);
      }
    });
});

var server = http.createServer();
server.addListener('request', function(req, res) {
    res.setHeader('content-type', 'text/plain');
    res.writeHead(404);
    res.end('404 - Nothing here (via sockjs-node test_server)');
});
server.addListener('upgrade', function(req, res){
    res.end();
});

sjs_broadcast.installHandlers(server, {prefix:'/'});

console.log(" [*] Listening on", config.host + ':' + config.port);
server.listen(config.port, config.host);

//Variables
var connectedUsersCount = 0;
var messagesPerSecond = 0;
var countReceived = 0;
var timeoutLogStatus = 1000;
var getCpuCommand = "ps -p " + process.pid + " -o %cpu,%mem";

//Logger options
logger.cli();
logger.default.transports.console.timestamp = true;
if(argv.o){
  logger.add(logger.transports.File, { filename:  Date.now() + '.txt'});
}



// setTimeout(logStatus, timeoutLogStatus);
// function logStatus() {
//     setTimeout(logStatus, timeoutLogStatus);
//     logger.info("users: " + connectedUsersCount + "\tmessagesPerSec: " + messagesPerSecond);
//     messagesPerSecond = 0;
// }

if(argv.p){
  setInterval(function() {
    var auxReceived = Math.round(countReceived / connectedUsersCount);
    var msuReceived = (connectedUsersCount > 0 ? auxReceived : 0);

      var l = [
        'U: ' + connectedUsersCount,
        'MR/S: ' + countReceived,
        'MR/S/U: ' + msuReceived
      ];

      logger.info(l.join(',\t'));
      countReceived = 0;

    // call a system command (ps) to get current process resources utilization
    /** /
    var child = exec(getCpuCommand, function(error, stdout, stderr) {
      var s = stdout.split(/\s+/);
      var cpu = s[2];
      var memory = s[3];

      var l = [
        'U: ' + connectedUsersCount,
        'MR/S: ' + countReceived,
        'MR/S/U: ' + msuReceived,
        'CPU: ' + cpu,
        'Mem: ' + memory
      ];

      logger.info(l.join(',\t'));
      countReceived = 0;
    //});
/**/
  }, 1000);
}