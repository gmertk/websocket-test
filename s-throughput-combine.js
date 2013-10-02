var argv = require('optimist').demand(['f']).argv;
var fs = require('fs');

var folder = argv.f;

var files = fs.readdirSync(folder);
var combined = [];

console.log(files);
for (var i = 0; i < files.length; i++) {
    if(files[i].indexOf(".D") !== 0){
        var f = folder + files[i];
        var totals = [];
        var output = "";
        fs.readFileSync(f).toString().split('\n').forEach(function (line, index) {
            var data = line.split(' ');
            combined[index] = combined[index] || [250*(index+1),0];//[0,0];
            combined[index][1] += parseInt(data[1]);
            //combined[index][1] += parseInt(data[2]);
        });
    }
}

console.dir(combined);
//fs.appendFileSync(folder +"outputcombined" + ".txt", ouput);
