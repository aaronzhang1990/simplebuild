var cheerio = require('cheerio');
var minifyHTML = require('html-minifier').minify;
var path = require('path');
var utils = require('../utils');

var colors = require('colors');
exports.execute = execute;

exports.buildInMemory = buildInMemory;


/**
 *
 * @param task.input
 * @param task.output
 * @param task.route
 * @return Promise
 */
function execute(task) {
    return concat(task).then(function(result){
        if(task.output_minify) {
            return minify(result, task.output_minify);
        } else {
            return result;
        }
    });
}

function concat(task, save) {
    var contentlist = [], allcode;
    utils.eachfile(task.input, function(content, filename, i){
		if(i === 0) {
			contentlist.push('<!-- file: ' + filename + ' -->\n');
		} else {
	        contentlist.push('\n<!-- file: ' + filename + ' -->\n');
		}
        contentlist.push(content);
    });
    allcode = contentlist.join('');
	if(task.output && save !== false) {
    	utils.writefile(task.output, allcode);
	}
    return Promise.resolve({file: task.output, code: allcode});
}

function minify(input, output) {
    var $ = cheerio.load(input.code);
	var version = utils.md5(input.code);
    $('link').each(function(){
        var el = $(this), rel = el.attr('rel');
        if(rel !== "stylesheet") { return; }
        var href = el.attr('min-href');
        if(href) {
            el.removeAttr('min-href');
            el.attr('href', href + '?v=' + version);
        } else {
            el.remove();
        }
    });
    $('script').each(function(){
        var el = $(this), type = el.attr('type');
        if(type && !/script/.test(type)) {
            return;
        }
        var src = el.attr('min-src');
        if(src) {
            el.removeAttr('min-src');
            el.attr('src', src + '?v=' + version);
        } else {
            el.remove();
        }
    });
    var code = minifyHTML($.html(), {
        removeComments: true,
        collapseWhitespace: true
    });
    utils.writefile(output, code);
    return Promise.resolve({code: code, file: output});
}


/**
 * 这个函数被 route 用来通知文件变化，并更新缓存
 * @param e.file 发生变化的文件
 * @param e.task build 配置对象
 * @return promise
 */
function buildInMemory(asset) {
	return concat(asset, false);
}
