
echo 'export PATH=$PATH:/usr/local/bin/chromedriver' >> ~/.zshenv
source ~/.zshenv
if [ `wc -l ./output/output.txt | awk '{print $1}'` -ge "500" ]
then
	mv ./output/output.txt "./output/$(date +"%m-%d-%y-%h-%m-%s").txt"
fi
echo 'running script...' >> ./output/output.txt
/bin/date >> ./output/output.txt
/usr/local/bin/node ./TwitToMast.js -[arguments] -u [username] -n [tweetcount] >> ./output/output.txt
/usr/bin/pkill Chrome
/usr/bin/killall node
