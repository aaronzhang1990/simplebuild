var CleanCss = require('clean-css');

var utils = require('../utils');

exports.execute = execute;

exports.on_file_change = on_file_change;


/**
 *
 * @param task.input
 * @param task.output
 * @param task.route
 * @param task.rebase 暂时无效
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
			contentlist.push('/* file: ' + filename + ' */\n');
		} else {
	        contentlist.push('\n/* file: ' + filename + ' */\n');
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
    var options = {
        keepSpecialComments: 0,
        processImport: false
    };
    
    var result = new CleanCss(options).minify(input.code);
    utils.writefile(output, result.styles);
    return Promise.resolve({code: result.styles, file: output});
}


/**
 * 这个函数被 route 用来通知文件变化，并更新缓存
 * @param e.file 发生变化的文件
 * @param e.task build 配置对象
 * @return promise
 */
function on_file_change(e) {
	return concat(e.task, false);
}
