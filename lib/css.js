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
	var tmp = check_task(task);
	if(tmp !== true) {
		return tmp;
	}
    return concat(task.input, task.output, task.rebase, task.route).then(function(result){
        if(task.hasOwnProperty('output_minify')) {
            return minify(result, task.output_minify);
        } else {
            return result;
        }
    });
}

function concat(input, output, rebase, route, save) {
    var contentlist = [], allcode;
    var cwd = process.cwd();
    utils.eachfile(input, function(content, filename){
        contentlist.push('\n/* file: ' + filename.replace(cwd, '') + ' */\n');
        contentlist.push(content);
    });
    allcode = contentlist.join('');
	if(save !== false) {
    	utils.writefile(output, allcode);
	}
    return Promise.resolve({file: output, code: allcode});
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
 * 检查任务对象是否有效
 */
function check_task(task) {
	var input = utils.resolve_path(task.input);
	var output = utils.resolve_path(task.output);
    var rebase = task.route ? task.rebase : false;
    // css 必须配置 output
    if(!output) {
        return utils.config_error("output");
    }
    // 如果 output 是 input 中的一个文件
    if(utils.check_conflict(input, output)) {
        return utils.invalid_output_error();
    }
	return true;
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
	return concat(task.input, task.output, task.rebase, task.route, false);
}
