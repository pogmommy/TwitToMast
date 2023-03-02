class TweetPaths {
	constructor(orig,i) {
		if (orig == 'home') {
			this.timeLine = "/html//section/div/div"; //FIXED //the immediate parent div of all tweets
		} else if (orig == 'thread') {
			this.timeLine = "/html//section/div/div" //FIXED //thread tweet xpath
		}
		this.tweet = (`${this.timeLine}/div`); //the div containing individual tweet content: (tweetXpath + '[1]')
		this.containsDivs = (`${this.timeLine}[count(div[@data-testid='cellInnerDiv']) > 1]`) //timeline conntaining divs
		this.path = `${this.tweet}[${orig == 'home' ? 1 : i}][@data-testid='cellInnerDiv']`; //FIXED

		//the following xpaths follow an individual tweet xpath: (tweetXpath + '[1]' + variableXPath)
		this.tweeterHandle = `${this.path}//article//div[@data-testid='User-Names']//a[not(contains(@href,'status'))]/div/span[starts-with(text(),'@')]` //FIXED /*text label containing tweeter's handle*/ //FIXED
		this.tweeterName = `${this.path}//article//div[@data-testid='User-Names']/div[1]//a[not(contains(@href,'status'))]//div[1]/span` //FIXED /*text label containing tweeter's name*/ //FIXED
		//this.quoteTweetHandle = `${this.path}//article/div/div/div/div[2]/div[2]/div[2]/div[2]/div[*]/div[2]/div/div[1]/div/div/div/div/div/div[2]/div[1]/div/div/div/span`; //xpath to text label that reveals if a tweet is a quote tweet (leads to the quote tweeted user's handle)
		this.quoteTweetContent = `${this.path}//article//div[div/span[.="Quote Tweet"]]/div[2]` //FIXED /*xpath to locate entirety of Quote Tweeted Content*/ 
		
		this.ageRestricted = `${this.path}//article//span[span[span[contains(text(),'Age-restricted')]]]/a[contains(@href,'notices')]`; //FIXED //xpath that reveals if tweet is age-restricted (& therefore not visible)
		this.pinnedTweet = `${this.path}//article//div[@data-testid='socialContext']/span[contains(text(),'Pinned')]`; //FIXED /*//xpath that reveals if tweet is pinned*/ 
		
		this.tweetText = `${this.path}//article//div[@data-testid='tweetText']`; //xpath that leads to div containing all tweet text //FIXED
		this.urlCard = `${this.path}//article//a[div[contains(@data-testid,'card')]]` //FIXED
		//this.emoji = this.path + "//img"; //xpath that leads to div containing all tweet text
		this.tweetURL = `${this.path}//article//div[@data-testid='User-Names']//div[3]//a[contains(@href,'status')]`; //xpath to tweet url //FIXED
		this.video = `${this.path}/html//section/div/div/div[*][@data-testid='cellInnerDiv']//article//div[2]/div[3]/div[1]/div[1]//video`; //FIXED //xpath that leads to videos that are not parts of quoted content
		this.singleImage = `${this.path}//article//div[2]/div[3]/div[1]/div[1]/div/div[1]//a//div[2]/div[@data-testid='tweetPhoto']/img`; //FIXED //xpath to image that reveals if a tweet has one image
		//this.singleImage = `${this.path}//div[1]/div/div/div/div/a/div/div[2]/div/img[@alt='Image']`; //xpath to image that reveals if a tweet has one image
		this.multiImage = `${this.path}//article//div[3]/div[1]//div[1]/div[2]/div/div[2]/div[1]//a//div[@data-testid='tweetPhoto']/img`; //FIXED //xpath to image that reveals if a tweet has more than one image

		if (orig == 'home') { //home timeline only
			this.detectThread = `${this.path}//article//a[contains(@href,'status')]//span[contains(text(),'Show this thread')]`; //xpath to text label that reveals if a tweet is a part of a thread from home timeline //FIXED
			this.detectRT = `${this.path}//article//a[span[@data-testid='socialContext']]/span[contains(., 'Retweeted')]`; //xpath to text label that reveals if a tweet is a retweet //FIXED
		} else if (orig == 'thread'){ //thread timeline only
			this.notEntryTweet = `${this.path}//article//div[@data-testid='User-Names']//time` //FIXED /*xpath that reveals if tweet is open in thread //openThreadTweetTSXPath*/ //fixed
		}

		//the following xpaths follow an individual tweet xpath and are used to find all images in a tweet with multiple images:  (tweetXpath + '[1]' + multiImage1XPath + x + multiImage2XPath + y + multiImage3XPath)
		// the following combinations of x,y variables point to the corresponding image
		// 1,1 = first image
		// 2,1 = second image
		// 2,2 = third image
		// 1,2 = fourth image
		this.multiImage1 = "//article//div[3]/div[1]//div[1]/div[2]/div/div[";
		this.multiImage2 = "]/div[";
		this.multiImage3 = "]//a//div[@data-testid='tweetPhoto']/img";
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




