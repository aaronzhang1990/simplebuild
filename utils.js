var path = require('path');
var fs = require('fs');
var crypto = require('crypto');

var colors = require('colors');
var mkdirp = require('mkdirp');
var json = require('comment-json');
var Mock = require('mockjs');

exports.resolve_path = resolve_path;
exports.eachfile = eachfile;
exports.readfile = readfile;
exports.writefile = writefile;
exports.md5 = md5;
exports.filemd5 = filemd5;
exports.readable_time = readable_time;
exports.load_config = load_config;
exports.make_response = make_response;
exports.isfile = isfile;
exports.isdir = isdir;
exports.copyAttributes = copyAttributes;

function resolve_path(input) {
	if(!input) { return input; }
	if(Array.isArray(input)) {
		return input.map(function(p){
			return path.resolve(p);
		});
	} else {
		return path.resolve(input);
	}

}

function eachfile(input, callback) {
	if(!Array.isArray(input)) {
		input = [input];
	}
	input.forEach(function(f, i){
		var content = fs.readFileSync(f, 'utf-8');
		callback(content, f, i);
	});
}

function readfile(input) {
    return fs.readFileSync(input, 'utf-8');
}

function writefile(file, content) {
	if(!fs.existsSync(file)) {
		mkdirp.sync(path.dirname(file));
	}
	var oldmd5 = filemd5(file);
	var newmd5 = md5(content);
	// 如果文件已经存在，并且将要写入的内容和现有内容一致
	if(oldmd5 === newmd5) { return; }
	fs.writeFileSync(file, content);
}

function md5(str) {
	var hash = crypto.createHash('md5');
	hash.update(str);
	return hash.digest('hex');
}

function filemd5(file) {
	try {
		var content = fs.readFileSync(file);
		return md5(content);
	} catch(e) {
		return null;
	}
}


function readable_time(time) {
	var parts = [], ms, seconds, sec, minutes, min, hours;
	ms = time % 1000;
	seconds = (time - ms) / 1000;
	sec = seconds % 60;
	minutes = (seconds - sec) / 60;
	min = minutes % 60;
	hours = (minutes - min) / 60;
	if(hours > 0) {
		parts.push(hours + 'h');
	}
	if(min > 0) {
		parts.push(miin + 'm');
	}
	if(sec > 0) {
		parts.push(sec + 's');
	}
	if(ms > 0) {
		parts.push(ms + 'ms');
	}
	return parts.join('');
}


function load_config(cfgfile) {
    var content = readfile(cfgfile);
    var config = json.parse(content, null, true);
	try {
		check_config(config);
		return config;
	} catch(e) {
		console.log(e.message.red);
		console.log(e.stack.red);
		process.exit();
	}
}


function make_response(resp, file) {
    var content = readfile(file);
    resp.json(Mock.mock(json.parse(content)));
}

function isfile(file) {
	try {
		var stat = fs.lstatSync(file);
		return stat.isFile();
	} catch(e) {
		return false;
	}
}

function isdir(file) {
	try {
		var stat = fs.lstatSync(file);
		return stat.isDirectory();
	} catch(e) {
		return false;
	}
}

function check_config(config) {
	var fields = ['css_url_prefix', 'js_url_prefix'];
	fields.forEach(function(name){
		if(!config[name]) {
			throw new Error("config error: " + name + " not set");
		}
	});
	fields = ['css_dist_root', 'js_dist_root', 'css_dev_root', 'js_dev_root'];
	fields.forEach(function(name){
		if(!config[name]) {
			throw new Error("config error: " + name + " not set");
		}
		if(!isdir(config[name])) {
			throw new Error(("warning: you set " + name + " = " + config[name] + ", but " + config[name] + " is not a directory!").yellow);
		}
	});
	var tasks = config.tasks;
	if(!Array.isArray(tasks)) {
		tasks = [tasks];
	}
	tasks.forEach(check_task);
	config.tasks = tasks;
}

/**
 * 检查任务对象是否有效，规则：
 * 1. input 指定的文件必须存在
 * 2. output 不能是 input 中的某一项，除非 input == output
 */
function check_task(task) {
	var input = task.input;
	var output = resolve_path(task.output);
	if(!Array.isArray(input)) {
		input = [input];
	}
	input = resolve_path(input);
	input.forEach(function(f){
		if(!isfile(f)) {
			throw new Error("file does't exists: " + f + "\n" + JSON.stringify(task));
		}
	});
	if(output && input.indexOf(output) > -1) {
		if(input.length > 1) {
			throw new Error("invalid output, can't be one of input\n" + JSON.stringify(task, null, 4));
		}
	}
	task.input = input;
	task.output = resolve_path(task.output);
	task.output_minify = resolve_path(task.output_minify);
}

function copyAttributes(attrs, dest, src) {
	var i, len, k;
	for(i=0,len=attrs.length;i<len;i++) {
		k = attrs[i];
		dest[k] = src[k];
	}
}
