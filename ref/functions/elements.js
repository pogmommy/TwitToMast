const webdriver = require('selenium-webdriver');
const By = webdriver.By;
const until = webdriver.until;

async function doesExist(drvr,path){
    exists = drvr.findElement(By.xpath(path)).then(function() {
        return true; // It existed
    }, function(err) {
        if (err instanceof webdriver.error.NoSuchElementError) {
            return false; // It was not found
        }
    });
    return exists;
}

async function waitFor(drvr,xpath,ms){
    await drvr.wait(until.elementLocated(By.xpath(xpath)), ms);
}

async function getAttribute(drvr,xpath,attribute){
    return drvr.findElement(By.xpath(xpath)).getAttribute(attribute);
}

async function getText(drvr,xpath){
    return drvr.findElement(By.xpath(xpath)).getText();
}

async function getElement(drvr,xpath){
    return drvr.findElement(By.xpath(xpath));
}

module.exports = { doesExist,waitFor,getAttribute,getText,getElement };





