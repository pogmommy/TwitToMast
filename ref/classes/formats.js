const colors = require('cli-color');

class Formats {
	constructor() {
		this.success = colors.green.bold;
		this.error = colors.red.bold;
		this.warn = colors.yellow;
		this.notice = colors.blue.bold;
		this.bold = colors.bold;
		this.underline = colors.underline;
		this.italic = colors.italic;
	}
}

module.exports = Formats