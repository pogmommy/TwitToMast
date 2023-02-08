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
	require('child_process').fork('./TwitToMast.js',pArgs);
}