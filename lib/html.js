var cheerio = require('cheerio');
var minifyHTML = require('html-minifier').minify;

var utils = require('../utils');

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
    var input = task.input, ret;
    // 合并模板文件，此时需要有 output
    if(Array.isArray(input) && input.length > 1) {
        ret = check_task(task);
        if(ret !== true) {
            return ret;
        }
        ret = concat(input, task.output);
    } else {
        if(Array.isArray(input)) {
            input = input[0];
        }
        ret = Promise.resolve({file: input, code: utils.readfile(input)});
    }

    return ret.then(function(result){
        if(task.hasOwnProperty('output_minify')) {
            return minify(result, task.output_minify, options);
        } else {
            return result;
        }
    });
}

function concat(input, output, save) {
    var contentlist = [], allcode;
    var cwd = process.cwd();
    utils.eachfile(input, function(content, filename){
        contentlist.push('\n<!-- file: ' + filename + ' -->\n');
        contentlist.push(content);
    });
    allcode = contentlist.join('');
	if(save !== false) {
    	utils.writefile(output, allcode);
	}
    return Promise.resolve({file: output, code: allcode});
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

/**
 * 检查任务对象是否有效
 */
function check_task(task) {
	
	return true;
}

function hash(url, type, options) {
    var url_prefix = options[type + "_url_prefix"];
    // 优先使用 dist_root，如果项目并没有使用这种开发模式，使用 dev_root
    var root = options[type + "_dist_root"] || options[type + "_dev_root"];
    var file = path.join(root, url.replace(url_prefix, ''));
    return url + '?v=' + utils.filemd5(file);
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
		result = check_task(task);
		if(result === true) {
			task.isvalid = true;
		} else {
			return result;
		}
	}
	return concat(task.input, task.output, false);
}
