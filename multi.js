const childProcess = require('child_process')
const path = require('path');
async function fork(scriptPath, args = []) {
    return new Promise((resolve, reject) => {
                let process = childProcess.fork(scriptPath, args, {
                    cwd: path.dirname(scriptPath)
                });
    
                process.on('exit', code => resolve(code));
                process.on('error', err => reject(err));
            });
}
(async function(){
	const args = process.argv;
	const defArgs = ["node","path","name","tweetCount","0","write","fromLoop"]
	for (var i = 0; i < 2; i++) {args.shift();}
	const config = require('fs').readFileSync("./usernameslist.txt").toString().split(/[\r\n]+/);
	for (let name of config) {
		var pArgs = [...args];
		pArgs.splice(0, 0, name);
		for (var i = 3; i < 7; i++) {
			if (typeof pArgs[i-2] == 'undefined') {
				pArgs.push(defArgs[i]);
			}
		}
		console.log("pArgs: " + pArgs);
		await fork('./TwitToMast.js', pArgs);
	}
}());
