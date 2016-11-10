var CleanCss = require('clean-css');
var fs = require('fs');
var path = require('path');

var utils = require('../utils');

exports.build = utils.arrayBuild(build);

function build(arr){
	var index = 0;
	if(!Array.isArray(arr)) {
		arr = [arr];
	}
	return buildOne(arr[index]).then(function(result){
		if(index + 1 < arr.length) {
			return buildOne(arr[++index]);
		}
		return result;
	});
}

/**
 *
 * @param config.input
 * @param config.output
 * @return Promise
 */
function buildOne(config) {
	var input = config.input, output = config.output;
	if(typeof input === "string") {
		input = [input];
	}
	return new Promies(function(resolve, reject){
		var codebuf = [];
		input.forEach(function(cssfile){
			var options = {
				keepSpecialComments: 0,
				processImport: true,
				relativeTo: path.dirname(cssfile),
				target: output
			};
			var sourcecode = fs.readFileSync(cssfile, 'utf-8');
			var result = new CleanCss(options).minify(sourcecode);
			codebuf.push(result.styles);
		});
		fs.writeFileSync(output, codebuf.join(''));
		return true;
	});
}
