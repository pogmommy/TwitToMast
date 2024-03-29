# Currently Broken- Repairs are a low priority at present

# TwitToMast
Bypass paywalled APIs to crosspost from Twitter to Mastodon

## Installation:

1. Clone the repo and set up the script's dependencies
```
git clone https://github.com/pogmom/TwitToMast.git
cd TwitToMast
npm install
```

2. Install [Chrome Webdriver](https://chromedriver.chromium.org/downloads) and set up your PATH as outlined in Step 3 [here](https://www.selenium.dev/documentation/webdriver/getting_started/install_drivers/)

3. Retrieve your Mastodon API Key
	- From your Mastodon Account, go to Preferences > Development > New Application
	- Enter any name you'd like, press "submit"
	- You should see the application with the name you just gave it in your applications list
	- Click on its name, and copy the string of text to the right of where it says "Your Access Token"
	
4. Update config.txt with your Mastodon account settings
	- Replace "API_KEY" on line 1 with the Access Token you retrieved in the previous step
	- Replace "API_URL" on line 2 with your Mastodon instance's API URL
		- This will look like "https://mastodon.social/api/v1/", replacing "mastodon.social" with the domain you registered your account through
	- Replace "CONTENT_WARNING_PREFIX" on line 3 with your preferred spoiler/content warning prefix if you plan to use this feature
		- commonly used prefixes include "CW//", "TW//", and "SPOILER//"
	
## Usage

```
node ./TwitToMast.js [-htqrspmbc] [-u username] [-n tweetcount] [-d debuglevel] [-w timeout]
node ./multi.js [-htqrspmbc] [-n tweetcount] [-d debuglevel] [-w timeout]
```

## Arguments

```
	-h:	- show help screen (you made it here!)
	-u: username
		- the twitter handle of the user whose account will be scraped
			- defaults to 'Twitter' (@twitter)
	-n: tweetcount
		- the number of enabled tweets that will be scraped from the targeted account
			- defaults to 5
	-t:	- tweets that are part of threads will be included in the scan
	-q:	- quote tweets will be included in the scan
	-r:	- Link to quoted tweet will appear in the header, preceded by "re: "
			- default behavior posts link at bottom preceded by "Quoting "
	-s:	- Enable content warning prefixes
            - tweets beginning with a certain string (defined in config.txt) will use following text on the same line as Mastodon content warning
	-p:	- enable/disable posting to Mastodon
	-m:	- include user's name, handle, and link to tweet
	-b:	- display browser (disable headless mode)
	-c:	- force URL to be logged to file if posts are disabled
	-d: debuglevel
		- amount of information to print to console
			0: only errors
			1: current task + tweet Text (default)
			2: pretty much everything
	-w: timeout
		- length of time (in ms) to wait for page elements to load
			- defaults to 30000 (30 seconds)
```

[Example of single-user scraper](https://pogmommy.gay/@pogmommy)

[Example of multi-user scraper](https://techhub.social/@twitterscraper) (now inactive)

## How types of content are handled

- Text
	- All text (except emojis) is currently included in cross-posts
- Quote Tweets
	- Preserves text of quote tweet and allows
- Media
	- All still images attached to a tweet will be included in cross-posts
	- Videos are unable to be attached to cross-posts, but a link to the original video will be included
- Retweets
	- Retweets are not cross-posted
- Replies
	- To self:
		- Preserves Text, links, still images, quoted content, and continuity (mastodon post are stitched together in threads)
	- To others:
		- Replies to others are not cross-posted at the moment
	
## Q&A
**Q.** why isn't it staying open in the background to monitor my tweets?

**A.** TwitToMast doesn't run perpetually by default. You'll need to set it up yourself to run on a schedule.

- on MacOS: `macOS_loop.sh` is an included shell script that will run TwitToMast repeatedly on a 10-minute interval. You will need to edit [arguments], [username], and [tweetcount] inside the script according to your use case. This script is provided as a proof-of-concept, there are likely more optimal ways of running TwitToMast on a loop. The shell script should log the output to a file, renaming the file if it exceeds 500 lines. It will also forcibly kill Chrome and Node in the case that for some reason they remain open after the script has finished.
	- You can connect to the created screen to monitor the output of the script with `screen -ls` and `screen -r [screenid]`
- On Windows: try [this](https://joshuatz.com/posts/2020/using-windows-task-scheduler-to-automate-nodejs-scripts/)
- If you're on linux, you probably already know what you're doing

**Q.** Doesn't bypassing Twitter's API violate their TOS?

**A.** No, elon musk personally gave me the go-ahead to do this.
![Proof](https://github.com/pogmom/TwitToMast/raw/main/api_license.png)
