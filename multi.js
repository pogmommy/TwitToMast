//REQUIREMENTS
const childProcess = require('child_process')
const path = require('path');
const support = require('./ref/functions/support.js');

//FUNCTIONS

async function fork(scriptPath, args = []) {
    return new Promise((resolve, reject) => {
                let process = childProcess.fork(scriptPath, args, {
                    cwd: path.dirname(scriptPath)
                });
                process.on('exit', code => resolve(code));
                process.on('error', err => reject(err));
            });
}

//RUNTIME

(async function(){
	const args = [...process.argv];
	const defArgs = ["node","path","name","tweetCount","0","write","fromLoop"]
	for (var i = 0; i < 2; i++) {args.shift();} //REMOVES `node ./TwitToMaster` from args
	const config = require('fs').readFileSync("./usernameslist.txt").toString().split(/[\r\n]+/);//GET USERNAME LIST AS ARRAY

	const customIndex = args.indexOf("-u");
	console.log(args);
	console.log(customIndex);
	args.splice(customIndex,2);
	console.log(args)

	for (let name of config) {
		var fArgs = [...args];
		fArgs.push("-u");
		fArgs.push(name);
		console.log("args: " + fArgs);
		await fork('./TwitToMast.js', fArgs);
	}
}());
