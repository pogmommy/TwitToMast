Array.prototype.findReg = function(match) {
	var reg = match;
    return this.filter(function(item){
        return typeof item == 'string' && item.match(reg);
    });
}

class Args {
	constructor() {
		this.help = this.getFlag("h",); //show help screen
		this.displayBrowser = this.getFlag("b"); //show browser running (disable headless)
		this.enablePosts = this.getFlag("p"); //enable posting images or statuses to Mastodon
		this.forceCSV = this.getFlag("c"); //force logging tweets to CSV, even if not posted to Mastodon (by request or failure)
		this.printMeta = this.getFlag("m"); //include Display Name, handle, and URL in Mastodon post
		this.enableQuotes = this.getFlag("q"); //enable cross-posting quote tweets
		this.enableThreads = this.getFlag("t"); //enable cross-posting thread tweets
		this.reQuotes = this.getFlag("r"); //put links to quote tweets at top of mastodon posts

		var userNamePreFormat = this.getArgument("-u","Twitter",false);
		this.userName = userNamePreFormat.replace('@','')
		this.tweetCount = this.getArgument("-n",5);
		this.debug = this.getArgument("-d",1);
		this.timeOut = this.getArgument("-w",30000);
	}

	getFlag(char){
		let args = [...process.argv];
		var regex = new RegExp(`-\\S*[${char}]\\S*`, "g");
		return args.indexOf(args.findReg(regex)[0]) > -1 ? true : false;
	}

	getArgument(flag, def, isInt = true) {
		const args = [...process.argv];
		const customIndex = args.indexOf(flag);
		const customValue = (customIndex > -1) ? args[customIndex + 1] : undefined;
		let flagValue = customValue || def;
		flagValue = isInt ? parseInt(flagValue) || def : flagValue;
		return flagValue;
	  }
}







module.exports = Args