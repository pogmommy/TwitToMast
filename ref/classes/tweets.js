const webdriver = require('selenium-webdriver');
const By = webdriver.By;
//const { format } = require('fast-csv');

const elements = require('../functions/elements.js');		//link support.js
const XPathObjects = require('../classes/xpaths.js');		//link xpaths.js
const Args = require('../classes/arguments.js');
const args = new Args();
const support = require('../functions/support.js');
const debuglog = support.debuglog;
const funcs = require('../functions/functions.js');		//link functions.js
const mastodon = require('../functions/mastodon.js');		//link mastodon.js
const Formats = require('../classes/formats.js');
const format = new Formats();

//const homeX = new XPathObjects.TweetPaths("home");						//import xpath class object for home timeline
//const threadX = new XPathObjects.TweetPaths("thread");					//import xpath class object for thread timeline

class Tweets {
	constructor(orig,i) {
		//parameters
		this.orig = orig;
		this.index = i-1;
		this.no = i;
		this.processed = false;

		//detect to filter out
		this.isRT = false;
		this.isAR = false;
		this.isPin = false;
		this.keep = false;

		//detect to move into thread
		this.isThread = false;

		//processed text for posting
		this.text = "";

		//header
		this.name = "";
		this.handle = "";
		this.url = "";
		this.header = "";

		//body
		this.hasBody = false;
		this.body = "";
		this.hasLinks = false;
		this.links = "";

		//footer
		this.hasVideo = false;
		this.isQT = false;
		this.quoteLink = "";
		this.footer = "";

		//media
		this.hasSingleImage = false;
		this.hasMultiImage = false;
		this.hasImages = false;
		this.imgArray = [];
		this.imgCount = 0;
		this.imgUrl = "";
		this.iterateExists = false;
		this.iteratePath = "";

		//threading
		this.id = 0;
		this.prompt = 0;
		this.prompturl = 0;
		this.isReply = false;
		this.posted = false;

		if (orig == "thread") {
			this.threadLength = 0;
			this.EntryNotOpen = true;
		}
		//xpaths of tweet & elements
		this.x = new XPathObjects.TweetPaths(orig,i);
	}
	
	compileText(){
		const sectionArray = [this.header, this.body, this.footer];
		const nonEmptySections = sectionArray.filter(section => section !== '');
		this.text = nonEmptySections.join('\r\n\r\n');
	}
	
	appendSection(txt, section) {
		switch (section) {
			case 'header':
			this.header += this.header ? `\r\n${txt}` : txt;
			break;
			case 'body':
			this.body += this.body ? `\r\n${txt}` : txt;
			break;
			case 'footer':
			this.footer += this.footer ? `\r\n${txt}` : txt;
			break;
			default:
			throw new Error(`Invalid section: ${section}`);
		}
	}
	
	async identifyElements(driver){
		await elements.waitFor(driver,this.x.tweet,args.timeOut); //WAIT FOR TWEET URL OF CURRENT ITERATE TWEET

		this.isAR = await elements.doesExist(driver,this.x.ageRestricted);//IS TWEET AGE-RESTRICTED?
		if (this.isAR){
			return;
		}

		var mTweetURL = await elements.getAttribute(driver,this.x.tweetURL,'href') //GET URL OF TWEET
		this.url = await mTweetURL.replace('://mobile.','://'); //SAVE TWEET URL TO TWEET OBJECT WITHOUT MOBILE

		this.hasBody = await elements.doesExist(driver,this.x.tweetText);//DOES TWEET HAVE BODY TEST?
		this.hasLinks = await elements.doesExist(driver,this.x.urlCard);//DOES TWEET HAVE URL CARDS
		this.hasVideo = await elements.doesExist(driver,this.x.video);//DOES TWEET HAVE VIDEO MEDIA?

		this.isQT = await elements.doesExist(driver, this.x.quoteTweetContent);//IS TWEET A QUOTE TWEET
		this.isThread = await elements.doesExist(driver,this.x.detectThread);//IS TWEET A PART OF THREAD
		debuglog(`IS THREAD? ${this.isThread}`,2)
		
		debuglog("does retweet element exist?")
		debuglog(await elements.doesExist(driver,this.x.detectRT))
		this.isRT = await elements.doesExist(driver,this.x.detectRT);//CHECK FOR RETWEETS
		if (!this.isRT) { //IF NOT A RETWEET, VERIFY USING BACKUP METHOD
			debuglog("TWEET IS NOT A RETWEET!!",2)
			var hasHandle = await elements.doesExist(driver,this.x.tweeterHandle); //CHECK IF TWEET HAS HANDLE
			if (hasHandle) { //IF TWEET HAS HANDLE, CHECK IF USERNAME EXISTS IN HANDLE TEXT
				var handle = await elements.getText(driver,this.x.tweeterHandle); //GET HANDLE TEXT
				this.isRT = !(handle.search(new RegExp(args.userName, "i")) == 1); //IF USERNAME IS INSIDE HANDLE TEXT
				//this.isRT = (!handle.toUpperCase().includes(args.userName.toUpperCase())); //IF USERNAME IS INSIDE HANDLE TEXT
				debuglog(handle,2)
				debuglog(args.userName,2)
				debuglog((handle.search(new RegExp(args.userName, "i")) == 1))
			}
		} else {
			debuglog("PRIMARY RETWEET CHECK METHOD WORKED")
		}
		this.isPin = await elements.doesExist(driver,this.x.pinnedTweet);//IS TWEET PINNED
		
		this.hasSingleImage = await elements.doesExist(driver, this.x.singleImage);//DOES TWEET HAVE SINGLE IMAGE?
		this.hasMultiImage = await elements.doesExist(driver,this.x.multiImage);//DOES TWEET HAVE MULTIPLE IMAGES?
		this.hasImages = this.hasSingleImage || this.hasMultiImage;//DOES TWEET HAVE ANY MEDIA?

	}

	async getElementProperties(driver){
		if (args.printMeta) { //IF TWEET HEADER IS ENABLED
			debuglog("running header stuff",2);
			this.handle = await elements.getText(driver,this.x.tweeterHandle);//GET TEXT OF TWEETER HANDLE (@)
			this.name = await elements.getText(driver,this.x.tweeterName);//GET TEXT OF TWEETER NAME (DISPLAY NAME)
			this.appendSection(`${this.name} (${this.handle})\r\n${this.url}`,'header');//COMBINE HEADER COMPONENTS WITH URL
			debuglog(`Tweet Header:\r\n${this.header}`);
		}

		if (this.hasBody){//IF TWEET HAS BODY TEXT
			debuglog("running body text stuff",2);
			/*use this later to make emojis work? https://stackoverflow.com/questions/65328118/convert-img-with-alt-attribute-to-text-with-selenium-webdriver
			await driver.findElement(webdriver.By.xpath(this.x.timeLine)) // GETS NUMBER OF ELEMENTS IN THREAD, SHOULD NOT ITERATE MORE THAN THIS MANY TIMES. NOT USED ANYMORE
				.findElements(webdriver.By.xpath(this.x.emoji))
				.then(function(elements){
					debuglog("Found  emoji!",2);
					//this.threadLength = elements.length;
				});*/
			const bodyText = await elements.getText(driver,this.x.tweetText);//SET TWEET BODY TO TEXT OF TWEET
			this.appendSection(bodyText,'body');
			debuglog(`Tweet Body:\r\n${this.body}`);
		}

		if (this.hasLinks){//IF TWEET HAS URL CARD
			debuglog("running url card stuff",2);
			var tweetCardURL = await elements.getAttribute(driver,this.x.urlCard,"href");//GET URL OF URL CARD
			this.links = await funcs.expandUrl(tweetCardURL);
			this.appendSection(this.links,'body');
			debuglog(`Tweet link: ${this.links}`);
		}

		if (this.isQT){ //IF THREAD IS A QUOTE TWEET, GET URL AND ADD TO EITHER HEADER OR FOOTER
			await driver.sleep(1000);
			debuglog("running quote tweet stuff",2);
			debuglog(await elements.getText(driver, this.x.quoteTweetContent));
			//driver.wait(webdriver.until(ExpectedConditions.elementToBeClickable(By.xpath(this.x.quoteTweetContent))));
			await driver.findElement(By.xpath(this.x.quoteTweetContent)).sendKeys(webdriver.Key.CONTROL, webdriver.Key.ENTER);//OPEN QUOTE TWEET IN NEW TAB
			this.parent = await driver.getWindowHandle(); 
			var windows = await driver.getAllWindowHandles();
			await driver.switchTo().window(windows[windows.length-1]).then(() => { //SWITCH TO NEW TAB WITH QUOTED TWEET
				driver.getCurrentUrl().then(url => {
					this.quoteLink = url.replace('://mobile.','://'); //MAKE MOBILE TWEET NON-MOBILE
					const text = args.reQuotes //DETERMINE HOW TO FORMAT QUOTE LINK DEPENDING ON RELAVANT ARGUMENT
						? `Re: ${this.quoteLink}` 
						: `« Quoting ${this.quoteLink} »`;
					args.reQuotes ? this.appendSection(text,'header') : this.appendSection(text,'footer'); //PLACE QUOTE LINK AT HEADER OR FOOTER OF TWEET
				});
				driver.switchTo().window(this.parent);//SWITCH BACK TO ORIGINAL TAB
			});
			await driver.switchTo().window(windows[windows.length-1]);//SWITCH TO NEW TAB AGAIN BECAUSE THAT'S THE ONLY WAY I COULD MAKE THIS PART WORK
			await driver.close();//CLOSE NEW TAB
			await driver.switchTo().window(this.parent);//SWITCH BACK TO ORIGINAL TAB... AGAIN
			debuglog(`Tweet Header: ${this.header}`)
			debuglog(`Tweet Footer: ${this.footer}`);
		}

		if (this.hasVideo) {//IF TWEET HAS NON-POSTABLE MEDIA, APPEND FOOTER DETAILING SO
			debuglog("running video stuff",2);
			this.appendSection(`⚠ Original tweet had attachment(s) that couldn't be cross-posted. View it at ${this.url}`,'footer');
			debuglog(`Tweet Footer: ${this.footer}`);
		}
	}

	async downloadImages(driver,imgSavePath) {
		if (this.hasSingleImage) {
			debuglog(`${this.orig} Tweet #${this.no} contains a single image.`, 2)
			this.imgCount = 1;
			this.imgUrl = await elements.getAttribute(driver,this.x.singleImage,"src")
			const jpgPath = `${imgSavePath}${this.orig == 'home' ? '' : 'r'}${this.no}.${this.imgCount}.jpg`
			await funcs.downloadImage(this.imgUrl, jpgPath)
				.then(debuglog)
				.catch(console.error);
			debuglog(`Downloaded image from tweet #${this.no} at url ${this.imgUrl}.`, 2)
		} else if (this.hasMultiImage) {
			debuglog(`${this.orig} Tweet #${this.no} contains multiple images.`, 2)
			this.imgCount = 0;
			for (var x = 1; x < 3; x++) {
				for (var y = 1; y < 3; y++) {
					this.iterateExists = await elements.doesExist(driver,this.x.multiImages(x,y));
					if (this.iterateExists) {
						debuglog(`${x},${y} Exists!`);
						this.imgUrl = await elements.getAttribute(driver,this.x.multiImages(x,y),'src')
						debuglog(this.imgUrl,2);
						this.imgCount++
						const jpgPath = `${imgSavePath}${this.orig == 'home' ? '' : 'r'}${this.no}.${this.imgCount}.jpg`
						await funcs.downloadImage(this.imgUrl, jpgPath)
							.then(debuglog)
							.catch(console.error);
						debuglog()
						debuglog(`Downloaded image from tweet #${this.no} at url ${this.imgUrl}.`, 2)
					}
				}
			}
		}
			debuglog(`Downloaded ${this.imgCount} image(s) from tweet #${this.no}.`,1)
	}

	async uploadImages(imgSavePath) {
		if (this.hasImages) {debuglog("Uploading images to Mastodon...",1);}
		for (var f = 1; f < (this.imgCount+1); f++) {
			var jpgPath = `${imgSavePath}${this.orig == 'home' ? '' : 'r'}${this.no}.${f}.jpg`
			debuglog(`uploading image to mastodon: ${jpgPath}`);
			var imgid = await mastodon.postMedia(jpgPath)
			debuglog(`mastodon image id: ${imgid}`);
			this.imgArray.push(imgid);
		}
	}

	async printPreview(){
		const postPreviewMessage = `${format.success('Mastodon Post Preview:')}
╔${'═'.repeat(process.stdout.columns-2)}╗
${this.text}
╚${'═'.repeat(process.stdout.columns-2)}╝`;
		debuglog(postPreviewMessage, 1);
	}
}

module.exports = Tweets




