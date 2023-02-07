//REQUIREMENTS

const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const By = webdriver.By;
const until = webdriver.until;
const fs = require('fs');
const csvWriter = require('csv-write-stream');
const Masto = require('mastodon');
const client = require('https');
var Jimp = require("jimp");
let imgConvert = require('image-convert');

//VALIDATE INPUT

const args = process.argv;
if (args[2] == "-h"){
	console.log("usage: $TwitToMast.js [username] [tweet count] [debug level]");
	console.log("        username: string");
	console.log("        tweet count: integer");
	console.log("        debug level: 1,2 (omit for no output)");
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
if (((args[4] != 1) && (args[4] != 2)) && (typeof args[4] != 'undefined')){
	console.log("Expected [1/2], got '" + args[4] + "' instead");
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
		modulesToEnable[c] = true;
	} else if (config[c] = "false"){
		modulesToEnable[c] = false;
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
debuglog(args);
debuglog("userName: " + userName);
debuglog("maxTweetScan: " + maxTweetScan);
debuglog("debug: " + debug);

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
	switch (debug) {
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

function screenshotElement(driver, locator) {
    return new Promise(async (resolve, reject) => {
      try {
        let base64Image = await driver.takeScreenshot();
        let decodedImage = new Buffer(base64Image, "base64");
        let dimensions = await driver.findElement(By.xpath(locator)).getRect();
        debuglog(dimensions,2)
        let xLoc = dimensions.x*0.7;
        let yLoc = dimensions.y*0.7;
        let eWidth = dimensions.width*0.7;
        let eHeight = dimensions.height*0.7;
        let image = await Jimp.read(decodedImage);
        image.crop(xLoc, yLoc, eWidth, eHeight).getBase64(Jimp.AUTO, (err, data) => {
          if (err) {
            console.error(err)
            reject(err)
          }
          imgConvert.fromBuffer({
            buffer: data,
            output_format: "jpg"
          }, function (err, buffer, file) {
            if (!err) {
              let croppedImageDataBase64 = buffer.toString('base64')
              resolve(croppedImageDataBase64)
            }
            else {
              console.error(err.message);
              reject(err)
            }
          })
        });
      } catch (err) {
        console.error(err.message);
        reject(err)
      }
    })
}

debuglog("Setting up...",1)

//SETUP REMAINDER OF VARIABLES

const csvFilename = "./URLList.csv";

//XPATH CONSTANTS

const timeLineXPath = `//*[@id="react-root"]/div/div/div[2]/main/div/div/div/div/div/div[3]/div/div/section/div/div`; //the immediate parent div of all tweets

const tweetXPath = (timeLineXPath + `/div`); //the div containing individual tweet content: (tweetXpath + '[1]')

//the following xpaths follow an individual tweet xpath: (tweetXpath + '[1]' + variableXPath)

const quoteTweetHandleXPath = `/div/div/div/article/div/div/div/div[2]/div[2]/div[2]/div[2]/div[*]/div[2]/div/div[1]/div/div/div/div/div/div[2]/div[1]/div/div/div/span`; //xpath to text label that reveals if a tweet is a quote tweet (leads to the quote tweeted user's handle)

const quoteTweetContentXPath= `/div/div/div/article/div/div/div/div[2]/div[2]/div[2]/div[2]/div[*]/div[2][div/div[1]/div/div/div/div/div/div[2]/div[1]/div/div/div/span]` //xpath to locate entirety of Quote Tweeted Content

const retweetIndicatorXPath = `/div/div/div/article/div/div/div/div[1]/div/div/div/div/div[2]/div/div/div/a/span`; //xpath to text label that reveals if a tweet is a retweet

const threadIndicatorXPath = `/div/div/div/article/div/a/div/div[2]/div/span`; //xpath to text label that reveals if a tweet is a part of a thread

const tweetTextXPath = `//div[@data-testid="tweetText"]`; //xpath that leads to div containing all tweet text

const tweetURLXPath = `//div/a[contains(@href, 'status')]`; //xpath to image that reveals if a tweet is a part of a thread

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
    .setChromeOptions(new chrome.Options().headless().windowSize(screen).addArguments(['user-agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.50 Safari/537.36'])) //CHANGED CODE
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
		debuglog("Filtering out disabled tweets...",1)
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
		mobileTweetURL = await driver.findElement(By.xpath(thisTweetXPath + tweetURLXPath)).getAttribute('href');
		tweetURL = await mobileTweetURL.replace('mobile.','');

    	if (!csvOutput.includes(tweetURL)) {

    		//SETUP TEXT FOR TWEET STATUS
			var tweetHasText = false;
			await driver.wait(until.elementLocated(By.xpath(timeLineXPath + tweetTextXPath)), 1000);
			tweetHasText = await driver.findElement(webdriver.By.xpath(thisTweetXPath + tweetTextXPath)).then(function() {
			    return true; // It existed
			}, function(err) {
			    if (err instanceof webdriver.error.NoSuchElementError) {
			        return false; // It was not found
			    } else {
			        webdriver.promise.rejected(err);
			    }
			});
			if (tweetHasText){
				tweetText = await driver.findElement(By.xpath(thisTweetXPath + tweetTextXPath)).getText();
				debuglog("Tweet Text: " + tweetText,2);
			} else {
				tweetText = " ";
			}

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
			if (isQT){
				await driver.sleep(1 * 1000)
				quotedContent = await driver.findElement(webdriver.By.xpath(thisTweetXPath + quoteTweetContentXPath));
				var b64img = await screenshotElement(driver, thisTweetXPath + quoteTweetContentXPath);
				var base64Data = b64img.replace(/^data:image\/png;base64,/, "");
				require("fs").writeFile('./' + i + "." + 0 +'.jpg', base64Data, 'base64', function(err) {
					debuglog(err,1);
				});

			}

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
			if (singleImageExisted || multiImageExisted) {var imageExisted = true} else {var imageExisted = false}
			if (imageExisted) {
				
				//MAKE MASTODON POST WITH IMAGES
				debuglog("Uploading images to Mastodon...",1);
				var imageArray = [];

				if (isQT) {
					await M.post('media', { file: fs.createReadStream('./' + i + '.0.jpg') }).then(resp => {
						imageArray.push(resp.data.id);
					}, function(err) {
			    		if (err) {
			        		debuglog(err,1);
			    		}
			    	})
				}
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
			
			//REMOVE SAVED IMAGE FILES
			debuglog("cleaning up...",1);
			for (var j = 0; j < 5; j++) {
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

    //EXIT WEBDRIVER
	driver.quit();
}());