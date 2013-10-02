var argv = require('optimist').demand(['f']).argv;
var fs = require('fs');
var gauss = require('gauss');

var folder = argv.f;

var files = fs.readdirSync(folder);
var output = [];
var pairSort = function (a, b) {
    return parseInt(a.split(' ')[0], 10) - parseInt(b.split(' ')[0], 10);
};

console.log(files);

for (var i = 0; i < files.length; i++) {

    if(files[i].indexOf(".D") !== 0){
        var f = folder + files[i];
        var timestamp = files[i].split('processingTimes')[1];
        var total = 0;
        var dataArray = fs.readFileSync(f).toString().split(' ');
        dataArray.forEach(function (data) {
            total += parseInt(data, 10);
        });

        output.push(timestamp + " " + total/dataArray.length);

    }
}

output = output.sort(pairSort);


fs.appendFileSync(folder + "proc.out", output.join("\n"));
