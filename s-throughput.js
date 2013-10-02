var argv = require('optimist').demand(['f']).argv;
var fs = require('fs');
var gauss = require('gauss');

var folder = argv.f;

var files = fs.readdirSync(folder);
console.log(files);
for (var i = 0; i < files.length; i++) {

    if(files[i].indexOf(".D") !== 0){
        var f = folder + files[i];
        var totals = [];
        var output = "";
        fs.readFileSync(f).toString().split('\n').forEach(function (line) {
            var data = line.split(' ');
            var omittedFirstData = false;
            for (var j = 0; j < data.length; j++) {
                //if (data[2] > 0) {
                //     if (omittedFirstData) {
                        totals[j] = totals[j] || new gauss.Vector();
                        totals[j].push(parseInt(data[j], 10));
                    // }
                //     omittedFirstData = true;
                //}
            }
        });

        var numberOfUsers = totals[0].mean();
        var received = totals[1].mean();
        var sent = totals[2].mean();
        var elapsed = totals[3].mean();

        var sentPerSec = sent / elapsed * 1000;
        var receivedPerSec = received / elapsed * 1000;

        var output = numberOfUsers/2 + " " + Math.round(receivedPerSec) + " " + Math.round(sentPerSec) + "\n";

        fs.appendFileSync(folder + "filtered-througput.out", output);
    }
}

//fs.appendFileSync(folder +"latex-table-"+ +new Date() + ".txt", table);
