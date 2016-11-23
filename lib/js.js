var UglifyJS = require('uglify-js');
var browserify = require('browserify');
var through = require('through');
var babel = require('babel-core');

var utils = require('../utils');
var es2015_path = require.resolve('babel-preset-es2015');

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
    if(!Array.isArray(input)) {
        input = [input];
    }
    var result = Promise.resolve(input);
    if(task.es6) {
        result = result.then(compile2es5);
		task.commonjs = true;
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
		var contentlist = [], allcode, file_cmt = objects.length > 1;
		objects.forEach(function(obj){
			file_cmt && contentlist.push('\n/* file: ' + obj.file + ' */\n');
			contentlist.push(obj.code);
		});
		allcode = contentlist.join('');
		if(save !== false) {
			utils.writefile(task.output, allcode);
		}
		return {file: task.output, code: allcode};
    });
}

function compile2es5(input) {
	var objects = [];
	input.forEach(function(file){
		var result = babel.transformFileSync(file, {
			presets: [es2015_path]
		});
		objects.push({code: result.code, file: file, es6: true});
	});
	return Promise.resolve(objects);
}

function bundle(input) {
	var es6 = input[0].es6, files, b;
	if(es6) {
		files = input.map(function(obj){
			return obj.file;
		});
	} else {
		files = input;
	}
	b = browserify(files, {});
	if(es6) {
		b.transform(function(file){
			var data;
			input.forEach(function(obj){
				if(obj.file === file) {
					data = obj.code;
				}
			});
			if(!data) {
				data = babel.transformFileSync(file, {presets: [es2015_path]}).code;
			}
			return through(function(){}, function(){
				this.queue('/* file: ' + file + '*/');
				this.queue(data);
				this.queue(null);
			});
		});
	}
	return new Promise(function(resolve, reject){
		b.bundle(function(err, buf){
			if(err) {
				reject(err);
			} else {
				resolve([{code: buf, file: 'bundle.js'}]);
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
