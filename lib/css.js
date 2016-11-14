var CleanCss = require('clean-css');
var fs = require('fs');
var path = require('path');

var utils = require('../utils');
var variables = require('../namevar');

exports.build = utils.arrayBuild(build);


/**
 *
 * @param config.input
 * @param config.output
 * @return Promise
 */
function build(config) {
	var input = config.input;
	var output = config.output;
	var output_dir = path.dirname(output);
	if(typeof input === "string") {
		input = [input];
	}
	return new Promies(function(resolve, reject){
		var codebuf = [], content;
		input.forEach(function(cssfile){
			var options = {
				keepSpecialComments: 0,
				processImport: true,
				relativeTo: path.dirname(cssfile),
				target: output_dir
			};
			var sourcecode = fs.readFileSync(cssfile, 'utf-8');
			var result = new CleanCss(options).minify(sourcecode);
			codebuf.push(result.styles);
		});
		content = codebuf.join('');
		output = variables.format(output, content);
		fs.writeFileSync(output, content);
		return true;
	});
}
