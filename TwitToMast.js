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
	for (var t = 1; t < (parseInt(args.tweetCount) + 1); t++) {//LOOP THE NUMBER OF TIMES SPECIFIED IN ARGS
		
		debuglog(format.notice(`Processing tweet #${t} of ${args.tweetCount}...`),1);
		var homeTweet = new Tweets("home",t); //RESET HOME TWEET FOR PROCESSING
		var threadTweet = new Tweets("thread",1); //RESET HOME TWEET FOR PROCESSING
		var threadTweetArray = []; //ARRAY OF THREAD TWEET OBJECTS
		
		await elements.waitFor(driver,homeTweet.x.containsDivs,args.timeOut); //WAIT FOR TIMELINE TO POPULATE ITSELF WITH TWEETS

		//REMOVE NON-PRIMARY TWEETS
		debuglog("Filtering out disabled tweets...",2)
		while (!homeTweet.keep) {
			debuglog(`xpath: ${homeTweet.x.path}`,2) //PRINT XPATH OF CURRENT TWEET
			await elements.waitFor(driver, homeTweet.x.path,args.timeOut); //WAIT UNTIL CURRENT TWEET IS LOADED

			await homeTweet.identifyElements(driver); //IDENTIFY WHAT ELEMENTS EXIST WITHIN TWEET

			if ((((homeTweet.isRT || homeTweet.isAR) || homeTweet.isPin) || (!args.enableQuotes && homeTweet.isQT)) || (!args.enableThreads && homeTweet.isThread) ) {//IF TWEET IS DISABLED, MARK FOR REMOVAL
				debuglog("removing tweet",2);
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
				//await driver.executeScript("window.scrollTo(0, -document.body.scrollHeight)");
				await driver.sleep(1*5000) //WAIT 5 SECONDS TO GIVE BROWSER TIME TO SET ITSELF UP
				
				await elements.waitFor(driver,threadTweet.x.containsDivs,args.timeOut); //WAIT UNTIL THREAD IS POPULATED WITH DIVS
				
				for (var r = 1; !threadTweet.entryIsOpen; r++) {//LOOP UNTIL INDICATED THAT WE'VE REACHED THE ENTRY TWEET
					threadTweet = new Tweets("thread", r); //RESETS ALL THREAD TWEET VARIABLES TO START FRESH
					
					debuglog(threadTweet.x.path,2); //PRINTS XPATH TO CURRENT ITERATE DIV
					threadTweet.entryIsOpen = await elements.doesExist(driver,threadTweet.x.entryTweet) // CHECKS IF THE CURRENT ITERATE DIV IS THE ONE USED TO OPEN THE THREAD
					if (!threadTweet.entryIsOpen){ //CURRENT ITERATE DIV DOES NOT CONTAIN THE TWEET USED TO OPEN THE THREAD

						await threadTweet.identifyElements(driver); //IDENTIFIES WHAT THE TWEET CONTAINS

						debuglog(`current tweet #${threadTweet.no} is not entry to thread`,2);

						debuglog(csvOutput);

						if (processedTweets.some(e => e.url == processedTweets.url)) {
							debuglog("TWEET EXISTS IN PROCESSED ARRAY!!",2);
					  	}
						
						if (!csvOutput.includes(threadTweet.url)) {//CODE TO RUN IF TWEET IS NOT IN CSV
							debuglog(`Thread tweet #${threadTweet.no} has not been processed.`, 1);

							await threadTweet.getElementProperties(driver); //COMPILE HEADER, BODY, AND FOOTER

							threadTweet.compileText();//COMPILE TEXT FOR CROSS-POST

							threadTweet.printPreview()//PRINT TWEET PREVIEW

							await threadTweet.downloadImages(driver,imgSavePath);

							await threadTweet.uploadImages(imgSavePath);
						}
						threadTweetArray.push(threadTweet);
						processedTweets.push(threadTweet);
					}

				}
				
				 var csvArray = csvOutput.split(/[\r\n]+/);
				for (var a = 0;a < threadTweetArray.length; a++) {//SET TWEET OBJECT ID TO SAVED ID IF IT EXISTS IN CSV
					debuglog(`CSV ARRAY: ${csvArray}`,2);
					csvArray.forEach(function(row, csvIndex) {
						debuglog(`csv row: ${row}`);
						rowArr = row.split(",");
						debuglog(`searching for '${threadTweetArray[a].url}' in '${row}'`,2)
						if (row.includes(threadTweetArray[a].url)){
							debuglog(`URL Exists at index ${csvIndex} of csv`,2);
							threadTweetArray[a].id = rowArr[1];
							threadTweetArray[a].posted = true;
						}
					})
				}
				
				threadTweetArray.forEach(twt =>{//LIST IDs THAT WERE DERIVED FROM CSV
					debuglog(`${twt.no} id: ${twt.id}`,2)
				})
				
				for (var a = 0;a < threadTweetArray.length; a++) {//POST TO MASTODON REFERENCING ID OF PRIOR OBJECT AS PROMPT
					if (a != 0) {threadTweetArray[a].prompt = threadTweetArray[a - 1].id}
					if (!threadTweetArray[a].posted){
						debuglog(`posting tweet: ${threadTweetArray[a].no} to mastodon in reply to id: ${threadTweetArray[a].prompt}`, 2);
						threadTweetArray[a].id = await mastodon.postStatus(threadTweetArray[a],csvFileName,csvOutput)
						debuglog(`POSTED TO MASTODON AND GOT BACK AN ID OF: ${threadTweetArray[a].id}`,2)
					}
				}

				await driver.close();
				await driver.switchTo().window(parent);
			}

			await homeTweet.getElementProperties(driver);

			homeTweet.compileText();//COMPILE TEXT FOR CROSS-POST

			homeTweet.printPreview();//PRINT TWEET PREVIEW

			await homeTweet.downloadImages(driver,imgSavePath);//DOWNLOAD IMAGES FROM TWITTER

			await homeTweet.uploadImages(imgSavePath);//UPLOAD IMAGES TO MASTODON
	  		
			if (threadTweetArray.length>0) {homeTweet.prompt = threadTweetArray[threadTweetArray.length-1].id;}
			debuglog(`Publishing post ${homeTweet.no} to Mastodon...`,2);
			homeTweet.id = await mastodon.postStatus(homeTweet,csvFileName,csvOutput);

			processedTweets.push(homeTweet);
		} else { //HOME TWEET EXISTS IN CSV
			debuglog(`Tweet #${homeTweet.no} has already been processed.`,1); //HOME TWEET EXISTS IN CSV
		}
		
		if (homeTweet.no < args.tweetCount) {driver.executeScript(`var element = document.evaluate(\`${homeTweet.x.path}\`,document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null ).singleNodeValue.remove();`);}//REMOVE TWEET FROM DOM TO PROCESS NEXT TWEET
    	
	}

	debuglog("Cleaning up...",1); //REMOVE SAVED IMAGES
	fs.rm(imgSavePath, { recursive: true, force: true }, (error) => {
		debuglog(error,2);
	});
	debuglog(format.bold(`Finished scraping @${args.userName}'s tweets`),1) //CLOSE WEBDRIVER
	setTimeout(() => {
        driver.quit();
    }, 100);
}());