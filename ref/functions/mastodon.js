const fs = require('fs');
const Masto = require('mastodon');

const support = require('../functions/support.js');
const csv = require('../functions/csv.js');
const debuglog = support.debuglog;
const funcs = require('../functions/functions.js');
const Args = require('../classes/arguments.js');
const args = new Args();
const Formats = require('../classes/formats.js');
const format = new Formats();

function setupMastodon(){
	const config = fs.readFileSync("./config.txt").toString().split(/[\r\n]+/);
	var M = new Masto({
		access_token: config[0],
		api_url: config[1]
	})
	return M;
}

async function postMedia(path,alt){
	id = 0;
	if (alt == null) {
		alt = "Image";
	}
	if (args.enablePosts){
		var M = setupMastodon();
		params = { file: fs.createReadStream(path) }
		Object.assign(params, { description: alt });
		await M.post('media', params).then(resp => {
			id = resp.data.id;
		}, function(err) {
			if (err) {
	    		debuglog(err,0);
	    		return "err";
			}
		})
	} else if (args.forceCSV) {
		return funcs.rand(1,100);
	}
	return id;
}

async function postStatus(tweet,file,csvc){
	var id = 0;
	if (args.enablePosts){
		var M = setupMastodon();
		params = { status: tweet.text }
		if (tweet.hasImages) {//POST HAS IMAGES
			debuglog("post has images!!",2)
			debuglog(`images array: ${tweet.imgArray}`,2)
			Object.assign(params, { media_ids: tweet.imgArray });
		}
		if (tweet.prompt != 0) {//POST IS A REPLY
			debuglog("reply to: " + tweet.prompt,2)
			Object.assign(params, { in_reply_to_id: tweet.prompt });
		}
		await M.post('statuses', params, (err, data) => {
			if (err) {
				debuglog(format.error(`Post to Mastodon failed with error: ${err}`), 1);
				return "err";
			} else {
				//ADD TWEET TO CSV TO PREVENT FUTURE PROCESSING
				csv.appendToCSV(tweet.url,data.id,tweet.orig,file,csvc);
				debuglog(`posted to mastodon and got back id: ${data.id}`);
				debuglog(format.bold(`Successfully posted ${tweet.url} to Mastodon!`),1);
				id = data.id;
			}
		})
	} else if (args.forceCSV) {
		var fakeID = funcs.rand(1,100);
		csv.appendToCSV(tweet.url,fakeID,(`forced ${tweet.orig}`),file,csvc);
		id = fakeID;
	}
	return id;
}

module.exports = { postMedia,postStatus };





