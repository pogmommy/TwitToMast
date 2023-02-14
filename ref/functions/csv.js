const csvWriter = require('csv-write-stream');
const fs = require('fs');
const support = require('../functions/support.js');
const debuglog = support.debuglog;

async function initCSV(csvFN){
	writer = csvWriter({sendHeaders: false});
	writer.pipe(fs.createWriteStream(csvFN));
	writer.write({
		header1: 'URLs',
		header2: 'IDs',
		header3: 'Origin'
	});
	writer.end();
}

async function openCSV(csvFN){
	await fs.readFile(csvFN, "utf-8", (err, data) => {
		if (!err) {
			return data;
		}
	});
	return output;
}
async function appendToCSV(url,id,orig,csvFN,fc){
	debuglog(`writing '${url}' to CSV!!`,2)
	writer = csvWriter({sendHeaders: false});
	writer.pipe(fs.createWriteStream(csvFN, {flags: 'a'}));
	debuglog(`file contents: ${fc}`);
	if (!fc.includes(url)){
		writer.write({
	  		header1: url,
	  		header2: id,
	  		header3: orig
		});
	}
	writer.end();
}

module.exports = { initCSV,appendToCSV,openCSV };





