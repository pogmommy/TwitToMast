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

```
node ./TwitToMast.js [username] [tweet count] [debug level] [disable posts]
```
- `username       (string)`: the twitter handle of the user whose account will be scraped
- `tweet count    (integer)`: the number of enabled tweets that will be scraped from the targeted account
- `debug level    (0-2)`: Level of output that will be printed on screen.
	- 0 or omitted: the program will to run silently (no output on screen)
	- 1: The program will print what tasks it is working on and errors, but nothing more.
	- 2: The program will print what tasks it is working on and errors, as well as various other information necessary for troubleshooting.
- `disable posts  ('noWrite')`: disable posting tweets to Mastodon, useful for testing
	
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
	
## Other important details
- This program does not run on a loop on its own. If you need it to run automatically, you'll need to find a way to schedule the script to be executed periodically.
