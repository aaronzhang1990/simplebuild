var cheerio = require('cheerio');
var minifyHTML = require('html-minifier').minify;

var utils = require('../utils');
var variables = require('../namevar');

exports.build = utils.arrayBuild(build);

/*
 * @params config.input
 * @params config.output
 * @return promise
 */
function build(config){
	var input = config.input;
	var output = config.output;
	if(Array.isArray(input)) {
		input = [input];
	}
	return new Promise(function(resolve, reject){
		var bufs = [], all;
		input.forEach(function(f){
			bufs.push(fs.readFileSync(f, 'utf-8'));
		});
		all = bufs.join('');
		fs.writeFileSync(output, all, 'utf-8');
		resolve(true);
	});
}

/*
 * 压缩目标 html
 * 替换 link[href] 和 script[src]
 *
 * 这里有一个问题：如何更好的确定 href|src 所指向的文件
 */
function minify(html) {
	var $ = cheerio.load(html);
	$('link').each(function(){
		var el = $(this), file;
		file = el.attr('local-href');
		if(file) { return; }
		stat = fs.lstatSync(file);
		if(stat.isFile(file)) {
			normalize(file, el);
		}
	});
	return minifyHTML($.html(), {
		removeComments: true,
		collapseWhitespace: true
	});
}

function normalize(file, el) {
	var nowhref = el.attr('min-href');
	var buf = fs.readFileSync(file);
	variables.format(nowhref, buf)
}
