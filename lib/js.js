var UglifyJS = require('uglify-js');
var browserify = require('browserify');
var es6ify = require('es6ify');

var utils = require('../utils');

exports.execute = execute;

exports.on_file_change = on_file_change;

/*
 *
 * @params config.input
 * @params config.output
 * @params config.commonjs
 * @params config.min
 * @params config.es6
 * @return Promise
 */
function execute(task) {
	var tmp = check_task(task);
	if(tmp !== true) {
		return tmp;
	}
    return concat(task).then(function(result){
        if(task.hasOwnProperty('output_minify')) {
            return minify(result, task.output_minify);
        } else {
            return result;
        }
    });
}

function concat(task, save) {
    var input = utils.resolve_path(task.input);
    var cwd = process.cwd();
    var result = Promise.resolve(input);
    if(!Array.isArray(input)) {
        input = [input];
    }
    if(task.es6) {
        result = result.then(compile2es5);
    }
    if(task.commonjs) {
        result = result.then(bundle);
    }
    return result.then(function(objects){
        if(!task.commonjs && !task.es6) {
            objects = objects.map(function(obj){
                return {file: obj, code: utils.readfile(obj)};
            });
        }
        return objects;
    }).then(function(objects){
        var contentlist = [], allcode;
        objects.forEach(function(obj){
            contentlist.push('\n/* file: ' + obj.file.replace(cwd, '') + ' */\n');
            contentlist.push(obj.code);
        });
        allcode = contentlist.join('');
        if(save !== false) {
            utils.writefile(task.output, allcode);
        }
        return {file: task.output, code: allcode};
    });
}

function compile2es5() {}

function bundle(input, es6) {
	var b = browserify(input, {});
	if(es6) {
		b.add(es6ify.runtime);
		b.transform(es6ify);
	}
	return new Promise(function(resolve, reject){
		b.bundle(function(err, buf){
			if(err) {
				reject(err);
			} else {
				resolve(buf);
			}
		});
	});
}

function minify(input, output) {
    var result = UglifyJS.minify(input.code, {
        fromString: true
    });
    utils.writefile(output, result.code);
    return Promise.resolve({code: result.code, file: output});
}

/**
 * 检查任务对象是否有效
 */
function check_task(task) {
	var input = utils.resolve_path(task.input);
	var output = utils.resolve_path(task.output);
    var rebase = task.route ? task.rebase : false;
    // js 必须配置 output
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
	return concat(task, false);
}
