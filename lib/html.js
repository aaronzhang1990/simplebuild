var cheerio = require('cheerio');
var minifyHTML = require('html-minifier').minify;
var path = require('path');
var utils = require('../utils');

var colors = require('colors');
exports.execute = execute;

exports.on_file_change = on_file_change;


/**
 *
 * @param task.input
 * @param task.output
 * @param task.route
 * @return Promise
 */
function execute(task, options) {
	var tmp = utils.check_task(task);
	if(tmp !== true) {
		return tmp;
	}
    var input = utils.resolve_path(task.input);
	if(!Array.isArray(input)) {
		input = [input];
	}
    return concat(task).then(function(result){
        if(task.hasOwnProperty('output_minify')) {
            return minify(result, task.output_minify, options);
        } else {
            return result;
        }
    });
}

function concat(task, save) {
    var contentlist = [], allcode;
    utils.eachfile(task.input, function(content, filename){
        contentlist.push('\n<!-- file: ' + filename + ' -->\n');
        contentlist.push(content);
    });
    allcode = contentlist.join('');
	if(task.output && save !== false) {
    	utils.writefile(task.output, allcode);
	}
    return Promise.resolve({file: task.output, code: allcode});
}

function minify(input, output, options) {
    var $ = cheerio.load(input.code);
    $('link').each(function(){
        var el = $(this), rel = el.attr('rel');
        if(rel !== "stylesheet") { return; }
        var href = hash(el.attr('min-href'), 'css', options);
        if(href) {
            el.removeAttr('min-href');
            el.attr('href', href);
        } else {
            el.remove();
        }
    });
    $('script').each(function(){
        var el = $(this), type = el.attr('type');
        if(type && !/script/.test(type)) {
            return;
        }
        var src = hash(el.attr('min-src'), 'js', options);
        if(src) {
            el.removeAttr('min-src');
            el.attr('src', src);
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

function hash(url, type, options) {
    var url_prefix = options[type + "_url_prefix"];
    // 优先使用 dist_root，如果项目并没有使用这种开发模式，使用 dev_root
    var root = options[type + "_dist_root"] || options[type + "_dev_root"];
    var file = path.join(root, url.replace(url_prefix, ''));
	var md5 = utils.filemd5(file);
	if(md5 === null) {
		console.log("warning: can't find file %s when generate html".yellow, file);
	}
	var newurl = url + '?v=' + md5;
    return newurl;
}

/**
 * 这个函数被 route 用来通知文件变化，并更新缓存
 * @param e.file 发生变化的文件
 * @param e.task build 配置对象
 * @return promise
 */
function on_file_change(e) {
    var task = e.task, result;
	if(task.isvalid !== true) {
		result = utils.check_task(task);
		if(result === true) {
			task.isvalid = true;
		} else {
			return result;
		}
	}
	return concat(task, false);
}
