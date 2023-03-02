//REQUIREMENTS
const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');

//LOCAL REQUIREMENTS
const support = require('./ref/functions/support.js');
const debuglog = support.debuglog;
const elements = require('./ref/functions/elements.js');
const csv = require('./ref/functions/csv.js');
const mastodon = require('./ref/functions/mastodon.js');

const Args = require('./ref/classes/arguments.js');
const args = new Args();
const Formats = require('./ref/classes/formats.js');
const format = new Formats();
const Tweets = require('./ref/classes/tweets.js');

//LOG ARGUMENTS

support.validateArgs();
support.logArguments();

//SETUP SAVE DIRECTORY VARIABLES

const localDir = './';
const imgSavePath = (`${localDir}imgs/${args.userName}/`);
if (!fs.existsSync(imgSavePath)){
    fs.mkdirSync(imgSavePath);
}
const csvSaveDir = (`${localDir}csv/`);
const csvFileName = (`${csvSaveDir + args.userName}.csv`);
if (!fs.existsSync(csvSaveDir)){
    fs.mkdirSync(csvSaveDir);
}
var csvOutput = "_";
debuglog(`csv file name: ${csvFileName}`,2);
debuglog(`user image save path${imgSavePath}`,2);

//SETUP HEADLESS WEBDRIVER

const screen = {
  width: 1920,
  height: 1080
};
let chromeOptions = new chrome.Options().addArguments(['user-agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.50 Safari/537.36']);
if (!args.displayBrowser) {chromeOptions.headless().windowSize(screen);}
var driver = new webdriver.Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();

//START WEBDRIVER AND ZOOM OUT

debuglog("starting webdriver...",2);
driver.get(`https://mobile.twitter.com/${args.userName}/`);
debuglog("started webdriver!",2);
driver.executeScript("document.body.style.zoom='35%'");

(async function(){
	//OPEN CSV FILE, CREATE IF NEEDED
	debuglog("opening csv",2);
	fs.readFile(csvFileName, "utf-8", (err, data) => {
		if (err) {
			debuglog("Could not get CSV Data!", 2);
			debuglog(err, 2);
			csv.initCSV(csvFileName);
		} else {
			debuglog(`CSV OUTPUT IS:\n${data}`, 2);
			csvOutput = data;
		}
	});
	debuglog("opened csv",2);
	var processedTweets = [];//DEFINE ARRAY THAT WILL BE POPULATED WITH TWEETS PROCESSED DURING THIS SESSION
	var allTweetsArray = [];//INITIALIZE THE POST QUEUE
	for (var t = 1; t < (parseInt(args.tweetCount) + 1); t++) {//LOOP THE NUMBER OF TIMES SPECIFIED IN ARGS

		debuglog(format.notice(`Processing tweet #${t} of ${args.tweetCount}...`),1);
		var homeTweet = new Tweets("home",t); //RESET HOME TWEET FOR PROCESSING
		var threadTweet = new Tweets("thread",1); //RESET HOME TWEET FOR PROCESSING
		var threadTweetArray = []; //ARRAY OF THREAD TWEET OBJECTS
		
		await elements.waitFor(driver,homeTweet.x.containsDivs,args.timeOut); //WAIT FOR TIMELINE TO POPULATE ITSELF WITH TWEETS

		//REMOVE NON-PRIMARY TWEETS
		debuglog("Filtering out disabled tweets...",2)
		while (!homeTweet.keep) {
			await elements.waitFor(driver,homeTweet.x.tweetURL,args.timeOut); //WAIT FOR TIMELINE TO POPULATE ITSELF WITH TWEETS
			var stupidPromptExists = await elements.doesExist(driver,"/html//div[@data-testid='sheetDialog']//div[@data-testid='app-bar-close']"); //CHECK IF NOTIFICATION SCREEN APPEARS
			if (stupidPromptExists) {
				var stupidPrompt = await elements.getElement(driver,"/html//div[@data-testid='sheetDialog']//div[@data-testid='app-bar-close']");
				await driver.executeScript("arguments[0].click();", stupidPrompt); //DISMISS NOTIFICATION SCREEN
			}
			debuglog(`xpath: ${homeTweet.x.path}`,2) //PRINT XPATH OF CURRENT TWEET
			await elements.waitFor(driver, homeTweet.x.path,args.timeOut); //WAIT UNTIL CURRENT TWEET IS LOADED

			await homeTweet.identifyElements(driver); //IDENTIFY WHAT ELEMENTS EXIST WITHIN TWEET
			debuglog(`tweet properties: isRT: ${homeTweet.isAR}, isAR: ${homeTweet.isAR}, isPin: ${homeTweet.isPin}, isQT: ${homeTweet.isQT}, isThread: ${homeTweet.isThread}`)
			debuglog(homeTweet.isRT || homeTweet.isAR);
			debuglog(homeTweet.isPin);
			debuglog(!args.enableQuotes && homeTweet.isQT);
			debuglog((!args.enableThreads && homeTweet.isThread));
			if ((((homeTweet.isRT || homeTweet.isAR) || homeTweet.isPin) || (!args.enableQuotes && homeTweet.isQT)) || (!args.enableThreads && homeTweet.isThread)) {//IF TWEET IS DISABLED, MARK FOR REMOVAL
				debuglog(`removing tweet ${homeTweet.url}`,2);
				homeTweet.keep = false; //INDICATE THAT WE ARE NOT READY TO EXIT, CURRENT TWEET IS NOT ELIGIBLE FOR REPOST
				await driver.executeScript(`var element = document.evaluate(\`${homeTweet.x.path}\`,document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null ).singleNodeValue.remove();`); //REMOVE TWEET FROM DOM TO PROCESS NEXT
				homeTweet = new Tweets("home",1); //RESET HOME TWEET OBJECT TO MAKE NEW TWEET READY FOR CHECKING
			} else {
				debuglog("keeping tweet! It is eligible for processing"); 
				homeTweet.keep = true; //INDICATE THAT WE ARE READY TO EXIT, CURRENT TWEET IS ELIGIBLE FOR REPOST
			}
		}

		processedTweets.forEach(function(u, uindex) { //CHECK IF TWEET HAS BEEN PROCESSED IN THIS SESSION
			debuglog(`${u.url} exists at index ${uindex} ${(u.url == homeTweet.url)}`);
			if (u.url == homeTweet.url) {homeTweet.processed = true;}
		})
		debuglog(`tweet has been proccessed: ${homeTweet.processed}`);

  		if (!homeTweet.processed && !csvOutput.includes(homeTweet.url)) { //IF CSV DOES NOT CONTAIN THE TWEET URL
			debuglog(`Tweet #${homeTweet.no} has not been processed.`, 1);

			await homeTweet.getElementProperties(driver);

			homeTweet.compileText();//COMPILE TEXT FOR CROSS-POST

			homeTweet.printPreview();//PRINT TWEET PREVIEW

			await homeTweet.downloadImages(driver,imgSavePath);//DOWNLOAD IMAGES FROM TWITTER

			await homeTweet.uploadImages(imgSavePath);//UPLOAD IMAGES TO MASTODON

			if (homeTweet.isThread){ //IF TWEET IS A THREAD, RUN TWEET THREAD STUFF
				var threadTweet = new Tweets("thread",1); //CREATE NEW THREAD TWEET OBJECT
				var threadTweetArray = []; //ARRAY OF THREAD TWEET OBJECTS
				debuglog(`THREAD TIMELINE: ${threadTweet.x.timeLine}`,2); //XPATH OF THREAD TIMELINE 

				driver.executeScript(`window.open("${homeTweet.url}");`); //OPEN THREAD IN NEW TAB
				var parent = await driver.getWindowHandle();
				var windows = await driver.getAllWindowHandles();
				await driver.switchTo().window(windows[1]); //SWITCH TO NEW TAB WITH THREAD
				
				await elements.waitFor(driver,threadTweet.x.containsDivs,args.timeOut);
				await driver.executeScript("document.body.style.zoom='20%'");
				await driver.executeScript("window.scrollTo(0, 0)");
				
				await elements.waitFor(driver,threadTweet.x.containsDivs,args.timeOut); //WAIT UNTIL THREAD IS POPULATED WITH DIVS
				
				for (var r = 1; !threadTweet.entryNotOpen; r++) {//LOOP UNTIL INDICATED THAT WE'VE REACHED THE ENTRY TWEET
					threadTweet = new Tweets("thread", r); //RESETS ALL THREAD TWEET VARIABLES TO START FRESH
					
					debuglog(threadTweet.x.path,2); //PRINTS XPATH TO CURRENT ITERATE DIV
					threadTweet.entryNotOpen = await elements.doesExist(driver,threadTweet.x.notEntryTweet) // CHECKS IF THE CURRENT ITERATE DIV IS THE ONE USED TO OPEN THE THREAD
					if (threadTweet.entryNotOpen){ //CURRENT ITERATE DIV DOES NOT CONTAIN THE TWEET USED TO OPEN THE THREAD
						
						debuglog(`current tweet #${threadTweet.no} is not entry to thread`,2);

						await threadTweet.identifyElements(driver); //IDENTIFIES WHAT THE TWEET CONTAINS

						processedTweets.forEach(function(u, uindex) { //CHECK IF THREAD TWEET HAS BEEN PROCESSED IN THIS SESSION
							debuglog(`${u.url} exists at index ${uindex} ${(u.url == threadTweet.url)}`);
							if (u.url == threadTweet.url) { //IF TWEET HAS BEEN PROCESSED AS PART OF ANOTHER THREAD, PASS ON THE IMAGE ID ARRAY AND FLAG
								threadTweet.processed = true;
								threadTweet.imgArray = u.imgArray;
								debuglog(`thread tweet (${threadTweet.url}) adopted image array from matching tweet at url (${u.url})`,2)
							}
						})

						debuglog(csvOutput);
						
						if (!csvOutput.includes(threadTweet.url)) {//CODE TO RUN IF TWEET IS NOT IN CSV
							debuglog(`Thread tweet #${threadTweet.no} is not in CSV.`, 1);

							await threadTweet.getElementProperties(driver); //COMPILE HEADER, BODY, AND FOOTER

							threadTweet.compileText();//COMPILE TEXT FOR CROSS-POST

							threadTweet.printPreview()//PRINT TWEET PREVIEW

							if (!threadTweet.processed) {//IF IMAGES HAVE ALREADY BEEN TRANSFERRED FROM TWITTER TO MASTODON, SKIP TO PREVENT SLOWDOWN & AVOID RATE LIMIT
								await threadTweet.downloadImages(driver,imgSavePath);

								await threadTweet.uploadImages(imgSavePath);
							}
						}
						threadTweetArray.push(threadTweet);//SENDS THREAD TWEET TO LIST OF CURRENT THREAD'S TWEETS
						processedTweets.push(threadTweet);//SENDS THREAD TWEET TO LIST OF ALL PROCESSED TWEETS WITHOUT REGARD TO ORDER OR DUPLICATES
					}

				}

				for (var a = 0;a < threadTweetArray.length; a++) { //FOR EVERY THREAD TWEET, LINK TO PARENT IF NEEDED & MARK AS PARENT
					if (a != 0) {
						threadTweetArray[a].prompturl = threadTweetArray[a - 1].url
						threadTweetArray[a].isReply = true;
					}
				}
				homeTweet.prompturl = threadTweetArray[threadTweetArray.length-1].url; //SET HOME (ENTRY) TWEET'S PARENT URL TO THAT OF LAST TWEET IN THREAD
				homeTweet.isReply = true; //MARK HOME (ENTRY) TWEET AS PARENT
				allTweetsArray.push(homeTweet); //HOME TWEET NEEDS TO BE SENT TO POST QUEUE BEFORE THREAD TWEETS
				for (var aa = threadTweetArray.length;aa > 0; aa--) {
					allTweetsArray.push(threadTweetArray[aa-1]); //SEND THREAD TWEETS TO POST QUEUE
				}
				await driver.close(); //CLOSE THREAD TAB
				await driver.switchTo().window(parent); //MAKE SURE MAIN TIMELINE TAB IS OPEN
			} else {
				allTweetsArray.push(homeTweet); //SEND HOME TWEET TO POST QUEUE EVEN IF THERE ARE NO THREAD TWEETS
			}

			processedTweets.push(homeTweet); //SEND HOME TWEET TO LIST OF ALL PROCESSED TWEETS WITHOUT REGARD TO ORDER OR DUPLICATES
		} else { //HOME TWEET EXISTS IN CSV
			debuglog(`Tweet #${homeTweet.no} has already been processed.`,1); //HOME TWEET EXISTS IN CSV
		}
		
		if (homeTweet.no < args.tweetCount) {driver.executeScript(`var element = document.evaluate(\`${homeTweet.x.path}\`,document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null ).singleNodeValue.remove();`);}//REMOVE TWEET FROM DOM TO PROCESS NEXT TWEET
	}

	var csvArray = csvOutput.split(/[\r\n]+/);
	for (var b = 0;b < (allTweetsArray.length); b++) {//SCANS CSV FOR TWEET CORSSPOST DATA TO ADOPT

		allTweetsArray[b].posted = csvArray.some((row,rowindex) => { //LOOKS THROUGH CSV FOR POST'S ID IN CASE IT HAS BEEN PROCESSED
			rowArr = row.split(",");
			if (rowArr[0] == allTweetsArray[b].url){
				debuglog(`URL Exists at index ${rowindex} of csv`,2);
				allTweetsArray[b].id = rowArr[1];
				return true;
			}
		})
		csvArray.some((row,rowindex) => {//LOOKS THROUGH CSV FOR TWEET'S PARENT
			rowArr = row.split(",");
			if (rowArr[0] === allTweetsArray[b].prompturl){
				console.log(rowArr[0]);
				console.log(allTweetsArray[b].prompturl);
				debuglog(`URL Exists at index ${rowindex} of csv`,2);
				allTweetsArray[b].prompt = rowArr[1];
				return true;
			}
		})
	}

	allTweetsArray = allTweetsArray.filter((v,i,a)=>a.findLastIndex(v2=>(v2.url === v.url))===i) //FILTERS OUR DUPLICATE TWEETS WITH PREFERENCE FOR MOST RECENTLY ADDED
	allTweetsArray = [... allTweetsArray.reverse()] //REVERSE TWEET ARRAY ORDER SO THEY CAN BE NEATLY PROCESSED IN REVERSE ORDER
	for (t = 0;t < allTweetsArray.length;t++) { //ITERATES THROUGH LIST OF PROCESSED TWEETS, SENDS UNPOSTED TWEETS TO MASTODON, AND REMEMBERS ITS ID FOR FUTURE REPLIES
		twt = allTweetsArray[t]
		if (!twt.posted) {
			if (twt.isReply){
				if ((twt.prompt == 0) && (twt.prompturl != 0)){ //ONLY LOOKS FOR PARENT ID IF PROMPT IS UNFULFILLED BUT TWEET EXPECTS A PROMPT
					allTweetsArray.some((cue,cueindex) =>{
						if (twt.prompturl == cue.url){
							twt.prompt = cue.id;
							return true;
						}
					})
				}
			}
			twt.id = await mastodon.postStatus(twt,csvFileName,csvOutput);
		}
	}
	/*allTweetsArray.forEach((twt,index) => {//DEBUGGING, PRINTS INFO ON TWEETS
		debuglog(`${String(index).padStart(2,0)}: ${twt.body.substring(0,20)}..., ${twt.url}, ${twt.prompturl}, ${twt.id}, ${twt.prompt}, is reply: ${twt.isReply}, posted: ${twt.posted}`,2)
		debuglog(`${String(index).padStart(2,0)} ${twt.handle}: ${twt.body.substring(0,40).concat("...").padEnd(45," ").substring(0,43)}, ${twt.imgCount}, ${twt.imgArray}`,2);
	});*/


	debuglog("Cleaning up...",1); //REMOVE SAVED IMAGES
	fs.rm(imgSavePath, { recursive: true, force: true }, (error) => {
		debuglog(error,2);
	});
	debuglog(format.bold(`Finished scraping @${args.userName}'s tweets`),1) //CLOSE WEBDRIVER
	setTimeout(() => {
        driver.quit();
    }, 100);
}());