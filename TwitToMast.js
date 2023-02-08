//REQUIREMENTS

const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const By = webdriver.By;
const until = webdriver.until;
const fs = require('fs');
const csvWriter = require('csv-write-stream');
const Masto = require('mastodon');
const client = require('https');
const request = require("request");
const Q = require("q");

//VALIDATE INPUT

const args = process.argv;
if (args[2] == "-h"){
	console.log("usage: $node ./TwitToMast.js [username] [tweet count] [debug level] [disable posts]");
	console.log("        username:       (string)              username of account to scrape - required");
	console.log("        tweet count:    (integer)             number of tweets to scrape - required");
	console.log("        debug level:    (0-2)                 amount of information to print to console - defaults to 0");
	console.log("        disable posts:  ('write','noWrite')   enable/disable posting to Mastodon - defaults to enable");
	console.log("        ");
	console.log("        config.txt:");
	console.log("        API_KEY");
	console.log("        API_URL");
	console.log("        ENABLE_QUOTE_TWEETS");
	console.log("        ENABLE_THREAD_TWEETS");
	console.log("        ");
	process.exit(0);
}
if (typeof args[2] == 'undefined') {
	console.log("Expected String with length greater than 1, got '" + args[2] + "' instead");
	console.log("for help: $TwitToMast.js -h");
	process.exit(1);
} else if (args[2].length < 1) {
	console.log("Expected String with length greater than 1, got '" + args[2] + "' instead");
	console.log("for help: $TwitToMast.js -h");
	process.exit(1);
}
if (isNaN(parseInt(args[3]))){
	console.log("Expected Integer, got '" + args[3] + "' instead");
	console.log("for help: $TwitToMast.js -h");
	process.exit(1);
}
if (!((parseInt(args[4]) >= 0) && (parseInt(args[4]) <= 2)) && (typeof args[4] != 'undefined')){
	console.log("Expected [0-2], got '" + args[4] + "' instead");
	console.log("for help: $TwitToMast.js -h");
	process.exit(1);
}
if ((args[5] != 'noWrite' && args[5] != 'write') && typeof args[5] != 'undefined') {
	console.log("Expected 'noWrite', 'write', or undefined, got '" + args[5] + "' instead");
	console.log("for help: $TwitToMast.js -h");
	process.exit(1);
}

//PROCESS CONFIG

const config = fs.readFileSync("./config.txt").toString().split(/[\r\n]+/);
var M = new Masto({
	access_token: config[0],
	api_url: config[1]
})
var modulesToEnable = [false, false];
for(var c = 2; c < 4; c++){
	if (config[c] = "true"){
		modulesToEnable[c-2] = true;
	} else if (config[c] = "false"){
		modulesToEnable[c-2] = false;
	} else {
		console.log("config.txt line " + (c+1) + ": Expected [true/false], got '" + config[c] + "' instead");
		console.log("for help: $TwitToMast.js -h");
		process.exit(1);
	}
}


//PROCESS ARGUMENTS

const userName = args[2];
const maxTweetScan = parseInt(args[3]);
const debug = args[4];
if (typeof args[4] == 'undefined') {debug = 0;}
var disablePosts = false;
if (typeof args[5] == 'undefined') {
	disablePosts = false;
} else if (args[5] == 'noWrite') {
	disablePosts = true;
}
var fromLoop = false;
if (args[6] == 'fromLoop'){
	fromLoop = true;
} else {
	fromLoop = false;
}
debuglog(args,2);
debuglog("userName: " + userName,2);
debuglog("maxTweetScan: " + maxTweetScan,2);
debuglog("debug: " + debug,2);
debuglog("disable posts: " + disablePosts,2);

//FUNCTIONS

function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        client.get(url, (res) => {
            if (res.statusCode === 200) {
                res.pipe(fs.createWriteStream(filepath))
                    .on('error', reject)
                    .once('close', () => resolve(filepath));
            } else {
                res.resume();
                reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));

            }
        });
    });
}

function debuglog(debugString,logLevel) {
	prefix = "";
	switch (logLevel) {
		case 0:
    		prefix = "";
    		break;
  		case 1:
    		prefix = "-";
    		break;
  		case 2:
     		prefix = "!";
    		break;
	}
	if (logLevel <= debug) {console.log(prefix + " " + debugString);}
}

function expandUrl(shortUrl) {
    var deferred = Q.defer();
    request( { method: "HEAD", url: shortUrl, followAllRedirects: true },
        function (error, response) {
            if (error) {
                deferred.reject(new Error(error));
            } else {
                deferred.resolve(response.request.href);
            }
        });
    return deferred.promise;
}

debuglog("Setting up...",1);
debuglog("userName: " + userName,1);
debuglog("maxTweetScan: " + maxTweetScan,1);
debuglog("debug: " + debug,1);
debuglog("API_URL: " + config[1],1);
debuglog("Enable Quote Tweets: " + modulesToEnable[0],1);
debuglog("Enable Thread Tweets: " + modulesToEnable[1],1);
debuglog("Disable posting to Mastodon: " + disablePosts,1);
debuglog("running from loop: " + fromLoop,1);

//SETUP REMAINDER OF VARIABLES

const csvFilename = "./URLList.csv";

//XPATH CONSTANTS

const timeLineXPath = `//*[@id="react-root"]/div/div/div[2]/main/div/div/div/div/div/div[3]/div/div/section/div/div`; //the immediate parent div of all tweets

const tweetXPath = (timeLineXPath + `/div`); //the div containing individual tweet content: (tweetXpath + '[1]')

//the following xpaths follow an individual tweet xpath: (tweetXpath + '[1]' + variableXPath)

const urlCardXPath = `/div/div/div/article/div/div/div/div[*]/div[*]/div[*]/div[*]/div/div[2]/a`

const tweeterHandle = `/div/div/div/article/div/div/div/div[2]/div[2]/div[1]/div/div/div[1]/div/div/div[2]/div/div[1]/a/div/span[contains(text(),"@")]` //text label containing tweeter's handle

const tweeterName = `/div/div/div/article/div/div/div/div[2]/div[2]/div[1]/div/div/div[1]/div/div/div[1]/div/a/div/div[1]/span/span` //text label containing tweeter's name

const quoteTweetHandleXPath = `/div/div/div/article/div/div/div/div[2]/div[2]/div[2]/div[2]/div[*]/div[2]/div/div[1]/div/div/div/div/div/div[2]/div[1]/div/div/div/span`; //xpath to text label that reveals if a tweet is a quote tweet (leads to the quote tweeted user's handle)

const quoteTweetContentXPath= `/div/div/div/article/div/div/div/div[2]/div[2]/div[2]/div[2]/div[*]/div[2][div/div[1]/div/div/div/div/div/div[2]/div[1]/div/div/div/span]` //xpath to locate entirety of Quote Tweeted Content

const retweetIndicatorXPath = `/div/div/div/article/div/div/div/div[1]/div/div/div/div/div[2]/div/div/div/a/span`; //xpath to text label that reveals if a tweet is a retweet

const threadIndicatorXPath = `/div/div/div/article/div/a/div/div[2]/div/span`; //xpath to text label that reveals if a tweet is a part of a thread

const tweetTextXPath = `//div[@data-testid="tweetText"]`; //xpath that leads to div containing all tweet text

const tweetURLXPath = `//div/a[contains(@href, 'status')]`; //xpath to tweet url

const singleImageXPath = `//div[2]/div/img[@alt="Image"]`; //xpath to image that reveals if a tweet has one image

const multiImageXPath = `//div[2]/div[2]/div[2]/div[2]/div/div/div/div/div[2]/div/div[1]/div[1]//a/div/div/img[@alt="Image"]`; //xpath to image that reveals if a tweet has more than one image

//the following xpaths follow and individual tweet xpath and are used to find all images in a tweet with multiple images:  (tweetXpath + '[1]' + multiImage1XPath + x + multiImage2XPath + y + multiImage3XPath)
// the following combinations of x,y variables point to the corresponding image
// 1,1 = first image
// 2,1 = second image
// 2,2 = third image
// 1,2 = fourth image
const multiImage1XPath = `//div[2]/div[2]/div[2]/div[2]/div/div/div/div/div[2]/div/div[`;
const multiImage2XPath = `]/div[`;
const multiImage3XPath = `]//a/div/div/img[@alt="Image"]`;

//SETUP HEADLESS WEBDRIVER

const screen = {
  width: 1920,
  height: 1080
};
var driver = new webdriver.Builder()
    .forBrowser('chrome')
    .setChromeOptions(new chrome.Options().headless().windowSize(screen).addArguments(['user-agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.50 Safari/537.36']))
    .build();

//START WEBDRIVER AND ZOOM OUT

driver.get('https://mobile.twitter.com/' + userName + '/');
driver.executeScript("document.body.style.zoom='35%'");

(async function(){
	//WAIT UNTIL TIMELINE RENDERS
	await driver.wait(until.elementLocated(By.xpath(timeLineXPath + `[count(div) > 1]`)), 30000);

	//OPEN CSV FILE, CREATE IF NEEDED

	var csvOutput = " ";
	await fs.readFile(csvFilename, "utf-8", (err, data) => {
			if (err) {
				debuglog("Could not get CSV Data!",2)
				debuglog(err,1);
				writer = csvWriter({sendHeaders: false});
				writer.pipe(fs.createWriteStream(csvFilename));
				writer.write({
					header1: 'URLs'
				});
				writer.end();
			} else {
				csvOutput = data;
			}
	});

	for (var i = 1; i < (maxTweetScan+1); i++) {
		//RUN THIS CODE FOR EVERY TWEET SCANNED
		debuglog("Processing tweet " + i + " of " + maxTweetScan + "...",1);
		//PER-TWEET VARIABLES
		var thisTweetXPath = tweetXPath + `[1]`;
		var keepTweet = false;
		var quotedContent = "";


		//REMOVE NON-PRIMARY TWEETS
		debuglog("Filtering out disabled tweets...",2)
		while (!keepTweet) {
			await driver.wait(until.elementLocated(By.xpath(thisTweetXPath)), 30000);
			
			if (!modulesToEnable[0]) {
				//CHECK FOR QUOTE TWEETS
				isQT = await driver.findElement(webdriver.By.xpath(thisTweetXPath + quoteTweetContentXPath)).then(function() {
					return true; // It existed
				}, function(err) {
				    if (err instanceof webdriver.error.NoSuchElementError) {
				        return false; // It was not found
				    } else {
				        //webdriver.promise.rejected(err);
				    }
				});
			}
			if (!modulesToEnable[1]) {
				//CHECK FOR THREAD TWEET
				isThread = await driver.findElement(webdriver.By.xpath(thisTweetXPath + threadIndicatorXPath)).then(function() {
					return true; // It existed
				}, function(err) {
				    if (err instanceof webdriver.error.NoSuchElementError) {
				        return false; // It was not found
				    } else {
				        //webdriver.promise.rejected(err);
				    }
				});
			}
			
			//CHECK FOR RETWEETS
			isRT = await driver.findElement(webdriver.By.xpath(thisTweetXPath + retweetIndicatorXPath)).then(function() {
			    return true; // It existed
			}, function(err) {
			    if (err instanceof webdriver.error.NoSuchElementError) {
			        return false; // It was not found
			    } else {
			        //webdriver.promise.rejected(err);
			    }
			});

			//IF TWEET IS DISABLED, MARK FOR REMOVAL
			if (isRT || ((!modulesToEnable[0] && isQT) || (!modulesToEnable[1] && isThread)) ) {
				//TWEET IS QT, RT, OR THREAD
				keepTweet = false;
				driver.executeScript('var element = document.evaluate(`' + thisTweetXPath + '`,document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null ).singleNodeValue.remove();');
			} else {
				keepTweet = true;
			}
		}

		//GET TWEET URL
		await driver.wait(until.elementLocated(By.xpath(thisTweetXPath + tweetURLXPath)), 1000);
		mobileTweetURL = await driver.findElement(By.xpath(thisTweetXPath + tweetURLXPath)).getAttribute('href');
		tweetURL = await mobileTweetURL.replace('mobile.','');
		debuglog(tweetURL,2);

  	if (!csvOutput.includes(tweetURL)) {

  		//SETUP TEXT FOR TWEET STATUS
		var tweetHasText = false;
		await driver.wait(until.elementLocated(By.xpath(timeLineXPath + tweetTextXPath)), 1000);
		tweetText = ""

		//IS TWEET PART OF MULTISCRAPER, IF SO ADD HEADER
		if (fromLoop) {
			tweeterHandleText = await driver.findElement(By.xpath(thisTweetXPath + tweeterHandle)).getText();
			tweeterNameText = await driver.findElement(By.xpath(thisTweetXPath + tweeterName)).getText();
			tweetText = (tweeterNameText + " (" + tweeterHandleText + ")\r\n" + tweetURL + "\r\n\r\n")
		}

		//DOES TWEET HAVE TEXT
		tweetHasText = await driver.findElement(webdriver.By.xpath(thisTweetXPath + tweetTextXPath)).then(function() {
	  	return true; // It existed
		}, function(err) {
	  	if (err instanceof webdriver.error.NoSuchElementError) {
	  		return false; // It was not found
	  	} else {
	    	webdriver.promise.rejected(err);
	    }
		});
		//IF SO, ADD BODY TEXT TO TWEET TEXT
		if (tweetHasText){
			tweetText = tweetText + await driver.findElement(By.xpath(thisTweetXPath + tweetTextXPath)).getText();
		}

		//DOES TWEET HAVE A URL CARD
		tweetHasURL = await driver.findElement(webdriver.By.xpath(thisTweetXPath + urlCardXPath)).then(function() {
	    return true; // It existed
		}, function(err) {
	    if (err instanceof webdriver.error.NoSuchElementError) {
	      return false; // It was not found
	  	} else {
	      webdriver.promise.rejected(err);
	    }
		});
		//IF SO, ADD URL TO TWEET TEXT
		if (tweetHasURL){
		tweetCardURL = await driver.findElement(By.xpath(thisTweetXPath + urlCardXPath)).getAttribute('href');
		await expandUrl(tweetCardURL)
			.then(function (longUrl) {
			    debuglog("Long URL:" + longUrl,2);
					tweetText = tweetText + "\r\n\r\n" + longUrl;
			});
		}

		//IS TWEET A QUOTE TWEET
		isQT = await driver.findElement(webdriver.By.xpath(thisTweetXPath + quoteTweetContentXPath)).then(function() {
			return true; // It existed
		}, function(err) {
		    if (err instanceof webdriver.error.NoSuchElementError) {
		        return false; // It was not found
		    } else {
		        //webdriver.promise.rejected(err);
		    }
		});
		//IF SO, ADD QUOTE TWEET LINK TO TWEET TEXT
		if (isQT){
			await driver.sleep(1 * 1000)
			quotedContent = await driver.findElement(webdriver.By.xpath(thisTweetXPath + quoteTweetContentXPath));
			await driver.findElement(webdriver.By.xpath(thisTweetXPath + quoteTweetContentXPath)).sendKeys(webdriver.Key.CONTROL, webdriver.Key.ENTER);
			var parent = await driver.getWindowHandle();
			var windows = await driver.getAllWindowHandles();
			await driver.switchTo().window(windows[1]).then(() => {
  			driver.getCurrentUrl().then(url => {
  				debuglog('current url: "' + url + '"',2);
  				tweetText = tweetText + "\r\n\r\n" + "Quote tweeting: " + url;
  			});
  			driver.switchTo().window(parent);
			});
			await driver.switchTo().window(windows[1]);
			await driver.close();
			await driver.switchTo().window(parent);
		}

		debuglog(tweetText,1)

		//CODE TO RUN IF TWEET IS NOT IN CSV
		debuglog("Tweet #" + i + " has not been processed.", 1);

  		//HANDLE SAVING SINGLE IMAGES
  		var singleImageExisted = await driver.findElement(webdriver.By.xpath(thisTweetXPath + singleImageXPath)).then(function() {
		    return true; // It existed
		}, function(err) {
		    if (err instanceof webdriver.error.NoSuchElementError) {
		        return false; // It was not found
		    } else {
		        webdriver.promise.rejected(err);
		    }
		});
		if (singleImageExisted) {
			debuglog("Tweet #" + i + " contains a single image.", 2)
			imageCount = 1;
			imageURL = await driver.findElement(webdriver.By.xpath(thisTweetXPath + singleImageXPath)).getAttribute("src");
			await downloadImage(imageURL, './' + i + "." + 1 +'.jpg')
    			.then(/*console.log*/)
    			.catch(console.error);
    		debuglog("Downloaded " + imageCount + "image from tweet #" + i + ".", 2)
		}

		//HANDLE SAVING MULTTIPLE IMAGES
		var multiImageExisted = await driver.findElement(webdriver.By.xpath(thisTweetXPath + multiImageXPath)).then(function() {
		    return true; // It existed
		}, function(err) {
		    if (err instanceof webdriver.error.NoSuchElementError) {
		        return false; // It was not found
		    } else {
		        webdriver.promise.rejected(err);
		    }
		});
		if (multiImageExisted) {
			debuglog("Tweet #" + i + " contains multiple images.", 2)
			imageCount = 0;
			for (var x = 1; x < 3; x++) {
				for (var y = 1; y < 3; y++) {
					thisIteratExists = await driver.findElement(webdriver.By.xpath(thisTweetXPath + multiImage1XPath + x + multiImage2XPath + y + multiImage3XPath)).then(function() {
					    return true; // It existed
					}, function(err) {
					    if (err instanceof webdriver.error.NoSuchElementError) {
					        return false; // It was not found
					    } else {
					    	debuglog('I hope this doesnt break');
					        //webdriver.promise.rejected(err);
					    }
					});
					if (thisIteratExists) {
						debuglog(x + "," + y + " Exists!")
						iteratImgURL = await driver.findElement(webdriver.By.xpath(thisTweetXPath + multiImage1XPath + x + multiImage2XPath + y + multiImage3XPath)).getAttribute("src");
						imageCount++;
						await downloadImage(iteratImgURL, './' + i + "." + imageCount +'.jpg')
    						.then(/*console.log*/)
    						.catch(console.error);
					}
				}
			}
			debuglog("Downloaded " + imageCount + "images from tweet #" + i + ".", 2)
		}

		//HANDLE POSTING TWEETS TO MASTODON
		if (!disablePosts){
			if (singleImageExisted || multiImageExisted) {var imageExisted = true} else {var imageExisted = false}
			if (imageExisted) {
				
				//MAKE MASTODON POST WITH IMAGES
				debuglog("Uploading images to Mastodon...",1);
				var imageArray = [];
				for (var f = 1; f < (imageCount+1); f++) {
					await M.post('media', { file: fs.createReadStream('./' + i + '.' + f + '.jpg') }).then(resp => {
						imageArray.push(resp.data.id);
					}, function(err) {
			    		if (err) {
			        		debuglog(err,1);
			    		}
			    	})
				}
				imageArray.length = 4
				debuglog("Publishing post to Mastodon...",1);
				await M.post('statuses', { status: tweetText, media_ids: imageArray }, (err, data) => {
					if (err) {
						debuglog("Post to Mastodon failed with error: " + err, 1);
					} else {
						//ADD TWEET TO CSV TO PREVENT FUTURE INDEXING
						debuglog("Posting tweet #" + i + " to Mastodon succeeded!", 1);
						writer = csvWriter({sendHeaders: false});
						writer.pipe(fs.createWriteStream(csvFilename, {flags: 'a'}));
						writer.write({
					  		header1: tweetURL
						});
						writer.end();
					}
				})
			} else {
				//MAKE MASTODON POST WITHOUT IMAGES
				debuglog("Publishing post to Mastodon...",1);
			
				await M.post('statuses', { status: tweetText}, (err, data) => {
					if (err) {
						debuglog("Post to Mastodon failed with error: " + err, 1);
					} else {
						//ADD TWEET TO CSV TO PREVENT FUTURE PROCESSING
						debuglog("Posting tweet #" + i + " to Mastodon succeeded!", 1);
						writer = csvWriter({sendHeaders: false});
						writer.pipe(fs.createWriteStream(csvFilename, {flags: 'a'}));
						writer.write({
					  		header1: tweetURL
						});
						writer.end();
					}
				})
			}
		}
		
		//REMOVE SAVED IMAGE FILES
		debuglog("Cleaning up...",1);
		for (var j = 1; j < 5; j++) {
			path = ("./" + i + "." + j + ".jpg");
			try {
		  		if (fs.existsSync(path)) {
					fs.unlinkSync(path);
				} else {
					debuglog(path + " not found!",2);
				}
			} catch(err) {
				console.error(err)
			}
		}

	} else {
			//CODE TO RUN IF TWEET IS IN CSV
			debuglog("Tweet #" + i + " has already been processed.",1);
		}

		if (i < maxTweetScan) {driver.executeScript('var element = document.evaluate(`' + thisTweetXPath + '`,document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null ).singleNodeValue.remove();');}
    	
	}

	debuglog("Finished scraping " + userName + "'s tweets",1)
    //EXIT WEBDRIVER
	driver.quit();
}());