class TweetPaths {
	constructor(orig,i) {
		if (orig == 'home') {
			this.timeLine = "//*[@id='react-root']/div/div/div[2]/main/div/div/div/div/div/div[3]/div/div/section/div/div"; //the immediate parent div of all tweets
		} else if (orig == 'thread') {
			this.timeLine = "/html/body/div[1]/div/div/div[2]/main/div/div/div/div[1]/div/section/div/div" //thread tweet xpath
		}
		this.tweet = (`${this.timeLine}/div`); //the div containing individual tweet content: (tweetXpath + '[1]')
		this.containsDivs = (`${this.timeLine}[count(div) > 1]`) //timeline conntaining divs
		this.path = `${this.tweet}[${orig == 'home' ? 1 : i}]`;

		//the following xpaths follow an individual tweet xpath: (tweetXpath + '[1]' + variableXPath)
		this.urlCard = `${this.path}/div/div/div/article/div/div/div/div[*]/div[*]/div[*]/div[*]/div/div[2]/a`
		this.tweeterHandle = `${this.path}/div/div/div/article/div/div/div/div[2]/div[2]/div[1]/div/div/div[1]/div/div/div[2]/div/div[1]/a/div/span[contains(text(),'@')]` /*text label containing tweeter's handle*/ 
		this.tweeterName = `${this.path}/div/div/div/article/div/div/div/div[2]/div[2]/div[1]/div/div/div[1]/div/div/div[1]/div/a/div/div[1]/span` /*text label containing tweeter's name*/ 
		this.quoteTweetHandle = `${this.path}/div/div/div/article/div/div/div/div[2]/div[2]/div[2]/div[2]/div[*]/div[2]/div/div[1]/div/div/div/div/div/div[2]/div[1]/div/div/div/span`; //xpath to text label that reveals if a tweet is a quote tweet (leads to the quote tweeted user's handle)
		this.quoteTweetContent = `${this.path}/div/div/div/article/div/div/div/div[2]/div[2]/div[2]/div[2]/div[*]/div[2][div/div[1]/div/div/div/div/div/div[2]/div[1]/div/div/div/span]` /*xpath to locate entirety of Quote Tweeted Content*/ 
		
		this.ageRestricted = `${this.path}/div/div/div/article//span/span[1]/span[contains(text(),'Age-restricted')]`; //xpath that reveals if tweet is age-restricted (& therefore not visible)
		this.pinnedTweet = `${this.path}/div/div/div/article/div/div/div/div[1]/div/div/div/div/div[2]/div/div/div/span[contains(text(),'Pinned')]` /*//xpath that reveals if tweet is pinned*/ 
		
		this.tweetText = `${this.path}//div[@data-testid='tweetText']`; //xpath that leads to div containing all tweet text
		//this.emoji = this.path + "//img"; //xpath that leads to div containing all tweet text
		this.tweetURL = `${this.path}//div[3]/a[contains(@href, 'status')]`; //xpath to tweet url
		this.video = `${this.path}/div/div/div/article/div/div/div/div[*]/div[*]/div[*]/div[*]/div[1]/div[1]//video`; //xpath that leads to videos that are not parts of quoted content
		this.singleImage = `${this.path}//div[1]/div/div/div/div/a/div/div[2]/div/img[@alt='Image']`; //xpath to image that reveals if a tweet has one image
		this.multiImage = `${this.path}//div[2]/div[2]/div[2]/div[2]/div/div/div/div/div[2]/div/div[1]/div[1]//a/div/div/img[@alt='Image']`; //xpath to image that reveals if a tweet has more than one image

		if (orig == 'home') { //home timeline only
			this.detectThread = `${this.path}/div/div/div/article/div/a/div/div[2]/div/span`; //xpath to text label that reveals if a tweet is a part of a thread from home timeline
			this.detectRT = `${this.path}/div/div/div/article/div/div/div/div[1]/div/div/div/div/div[2]/div/div/div/a/span`; //xpath to text label that reveals if a tweet is a retweet
		} else if (orig == 'thread'){ //thread timeline only
			this.entryTweet = `${this.path}/div/div/div/article/div/div/div/div[3]/div[*]/div[@role='group']` /*xpath that reveals if tweet is open in thread //openThreadTweetTSXPath*/ 
		}

		//the following xpaths follow an individual tweet xpath and are used to find all images in a tweet with multiple images:  (tweetXpath + '[1]' + multiImage1XPath + x + multiImage2XPath + y + multiImage3XPath)
		// the following combinations of x,y variables point to the corresponding image
		// 1,1 = first image
		// 2,1 = second image
		// 2,2 = third image
		// 1,2 = fourth image
		this.multiImage1 = "//div[2]/div[2]/div[2]/div[2]/div/div/div/div/div[2]/div/div[";
		this.multiImage2 = "]/div[";
		this.multiImage3 = "]//a/div/div/img[@alt='Image']";
	}
	tweetElement(i, pathFromTweet) {
		let xPath = (this.path + pathFromTweet);
		return xPath;
	}
	multiImages(x,y) {
		let xPath = (this.path + this.multiImage1 + x + this.multiImage2 + y + this.multiImage3);
		return xPath;
	}
}

module.exports = { TweetPaths }




