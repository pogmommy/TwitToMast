const fs = require('fs');
const Args = require('../classes/arguments.js');
const args = new Args();

const Formats = require('../classes/formats.js');
const format = new Formats();

function printHelp() { //PRINT USAGE TO CONSOLE
	const usageText = fs.readFileSync('./usage.txt', 'utf-8');
	const formattedUsage = usageText.replace(/{([^{}]+)}/g, format.bold('$1'))
									.replace(/~([^~]+)~/g, format.underline('$1'))
									.replace(/<([^<>]+)>/g, format.italic('$1'))
									.replace(/(\r\n|\r|\n)/g, '\n░ ');
	debuglog(formattedUsage,1);
}

function logArguments() {//PRINT ARGUMENTS TO CONSOLE
	debuglog("Settings: ", 2);
	debuglog(`-h help: ${args.help}`, 2);
	debuglog(`-q quotes: ${args.enableQuotes}`, 2);
	debuglog(`-t threads: ${args.enableThreads}`, 2);
	debuglog(`-b displayBrowser: ${args.displayBrowser}`, 2);
	debuglog(`-p enablePosts: ${args.enablePosts}`, 2);
	debuglog(`-c forceCSV: ${args.forceCSV}`, 2);
	debuglog(`-m printMeta: ${args.printMeta}`, 2);
	debuglog(`-u userName: ${args.userName}`, 2);
	debuglog(`-n tweetCount: ${args.tweetCount}`, 2);
	debuglog(`-d debug: ${args.debug}`, 2);
	debuglog(`-w timeout: ${args.timeOut}`, 2);

	debuglog(`Scraping ${format.bold(args.tweetCount)} tweet(s) from ${format.bold(`@${args.userName}`)}...`, 1);
	debuglog(`Browser is${args.displayBrowser ? "" : " not"} visible`, 1);
	debuglog(`Tweets${args.enableQuotes ? ", Quote" : ""}${args.enableThreads ? ", Thread" : ""} Tweets will${args.enablePosts ? "" : " not"} be posted to Mastodon`, 1);
	debuglog(`Tweet URLs will${args.forceCSV ? "" : " not"} be forcibly added to CSV file`, 1);
	debuglog(`Name, handle, and URL will${args.printMeta ? "" : " not"} be added to the body text`, 1);
}


function debuglog(debugString,logLevel = 2) {//CUSTOM CONSOLE LOG THAT ALLOWS USER-SET DEBUG OUTPUT LEVELS
	const prefixes = {
		0: " ",
		1: "░",
		2: "█",
	};
	const prefix = prefixes[logLevel];
	if (logLevel <= args.debug) {
		console.log(`${prefix} ${debugString}`);
	}
}

function validateArgs() {
	if (args.help) {
	  printHelp();
	  process.exit(0);
	}
  
	const userNameRegex = /^@?(\w){1,15}$/g;
	const usernameError = format.error("Uh-oh! It seems like the username doesn't work! Make sure you're entering the user's handle as it appears on-screen.");
	const helpText = format.notice("For help: $node ./TwitToMast.js -h");
	const tweetCountError = format.error(`Expected Integer greater than 0, got '${args.tweetCount}' instead`);
	const debugError = format.error(`Expected 0-2, got '${args.debug}' instead`);
  
	if (!userNameRegex.test(args.userName)) {
	  debuglog(usernameError, 0);
	  debuglog(helpText, 0);
	  process.exit(1);
	}
  
	if (args.tweetCount < 1) {
	  debuglog(tweetCountError, 0);
	  debuglog(helpText, 0);
	  process.exit(1);
	}
  
	if (args.debug < 0 || args.debug > 2) {
	  debuglog(debugError, 0);
	  debuglog(helpText, 0);
	  process.exit(1);
	}
  }

module.exports = { printHelp,logArguments,debuglog,validateArgs };





