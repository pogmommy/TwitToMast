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
	- Line 3 determines whether or not quote tweets will be sent to Mastodon
		- true: Quote tweets will be sent to Mastodon
		- false: Quote tweets will not be sent to Mastodon
	- Line 4 determines whether or not tweets that are part of threads will be sent to Mastodon
		- true: Thread tweets will be sent to Mastodon
		- false: Thread tweets will not be sent to Mastodon
	- While they can be independently configured, it's recommended that Lines 3 and 4 are set to the same value
	
## Usage

### Single User Scraper

```
node ./TwitToMast.js [username] [tweet count] [debug level] [disable posts] [print header]
```
- `username       (string)`: the twitter handle of the user whose account will be scraped
- `tweet count    (integer)`: the number of enabled tweets that will be scraped from the targeted account
- `debug level    (0-2)`: Level of output that will be printed on screen
	- 0 or omitted: the program will to run silently (no output on screen)
	- 1: The program will print what tasks it is working on and errors, but nothing more
	- 2: The program will print what tasks it is working on and errors, as well as various other information necessary for troubleshooting
- `disable posts  ('write','noWrite')`: enable/disable posting tweets to Mastodon, useful for testing
- `print header   ('printHeader')`: enable attaching a header with the user's name, twitter handle, and link to tweet

[Example](https://tech.lgbt/@pogmommy)
	
### Multi User Scraper

Configure twitter accounts to be scraped in `usernameslist.txt` before running the script
```
node ./multi.js [tweet count] [debug level] [disable posts] [print header]
```
- Arguments have the same effect as listed above
- **Note that username is NOT used in this script**

[Example](https://techhub.social/@twitterscraper)

## How Types of Tweets are handled

- Self Posts
	- Preserves Text, links, and still images
- Quote Tweets
	- Preserves Text, links, still images, and link to quoted tweet
- Retweets
	- Retweets are not cross-posted at the moment
- Replies
	- To self:
		- Preserves Text, links, still images, but loses continuity (tweets are not stitched together in threads)
	- To others:
		- Replies to others are not cross-posted at the moment
	
## Q&A
**Q.** why isn't it staying open in the background to monitor my tweets?
**A.** TwitToMast doesn't run perpetually by default. You'll need to set it up yourself to run on a schedule.
- On macos, you can run the script every 10 minutes with the following command in an automator app set up to run at login.
	- `zsh -c "cd /path/to/repository/TwitToMast && exec screen -DmS twittercrosspost zsh -c 'while true; do /path/to/node ./TwitToMast.js [username] [tweet count] [debug level] & sleep 600; done'"`
	- You can connect to the created screen to monitor the output of the script with `screen -ls` and `screen -r [screenid]`
- Windows users, try [this](https://joshuatz.com/posts/2020/using-windows-task-scheduler-to-automate-nodejs-scripts/)
- If you're on linux, you probably already know what you're doing
**Q.** Doesn't bypassing Twitter's API violate their TOS?
**A.** No, elon musk personally gave me the go-ahead to do this.
![Proof](https://github.com/pogmom/TwitToMast/raw/main/api_license.png)