var crypto = require('crypto');

var variable_regexp = /\{(.*?)\}/g;

exports.format = format;


function format(fstr, buf) {
	return fstr.replace(variable_regexp, function(_, variable){
		if(variable === "md5") {
			return hash(buf);
		} else {
			return '';
		}
	});
}

function hash(buf) {
	var method = crypto.createHash('md5');
	method.update(buf);
	return method.digest('hex');
}


