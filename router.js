var path = require('path');
var fs = require('fs');

var express = require('express');
var chokidar = require('chokidar');
var Mock = require('mockjs');
var debug = require('debug')('build:router')
var router = express.Router();

var utils = require('./utils');
var watcher = start_watcher();
var first_call_watch = false;;


module.exports = router;

// 为了让程序简单点，不监听 cfgfile 发生的变化
// 这意味着，如果 cfgfile 发生了变化，必须重启开发服务器
router.watch = function(config, mode){
	debug("start watch " + config.configfile + "on " + mode + " mode");
    // 本地静态文件
    if(mode === "production") {
        router.use(config.css_url_prefix, express.static(config.css_dist_root));
        router.use(config.js_url_prefix, express.static(config.js_dist_root));
    } else {
        router.use(config.css_url_prefix, express.static(config.css_dev_root));
        router.use(config.js_url_prefix, express.static(config.js_dev_root));
    }
    // 动态更新的静态文件
    config.tasks.forEach(function(task){
        if(!task.route) { return; }
        add_route(task);
    });
    // ajax 请求映射请求
    router.use(ajax2local(path.dirname(config.configfile)));
};

function start_watcher() {
    var watcher = chokidar.watch([]);
    watcher.on('change', trigger_file_change);
    return watcher;
}


function ajax2local(root) {
    root = path.resolve(root);
    return function(req, resp, next){
        var dir = 'ajax' + request.path, file, last_slash;
        dir = path.join(root, dir.trim());
        if(dir.endsWith('/')) {
            dir = dir.substring(0, dir.length - 1);
        }
        last_slash = dir.lastIndexOf('/');
        file = dir.substring(0, last_slash) + '/' + req.method.toLowerCase() + '-' + dir.substring(last_slash + 1) + '.json';
        if(fs.existsSync(file)) {
            return make_response(resp, file);
        }
        file = dir + '.json';
        if(fs.existsSync(file)) {
            return make_response(resp, file);
        }
        next();
    };
}

function make_response(resp, file) {
    var content = utils.readfile(file);
    resp.json(Mock.mock(JSON.parse(content)));
}


function add_route(task) {
    var output_cache;
    var last_update_time = 0;
	debug('add route for ' + task.route);
    watch_file_change(task.input, function(file){
		update_task_cache(task, file).then(function(result){
			output_cache = result.code;
			last_update_time = Date.now();
		});
	});
    // 第一次请求时，手动触发 on_file_change 获得 output 并缓存
    // 文件发生变更时，更新缓存
    router.get(task.route, function(req, resp){
		var time = req.get('if-modified-since') || -1;
		var type = path.extname(task.output || task.output_minify);
		// 说明：如果浏览器端禁用了缓存，将看不到缓存的效果
		if(last_update_time > time) {
			resp.set('Last-Modified', new Date(last_update_time));
			resp.type(type);
			if(output_cache) {
				resp.end(output_cache);
			} else {
				update_task_cache(task).then(function(result){
					output_cache = result.code;
					last_update_time = Date.now();
					resp.end(result.code);
				});
			}
		} else {
			resp.status(304).end();
		}
	});
}

function update_task_cache(task, file) {
	var type = path.extname(task.output || task.output_minify);
	var lib = require('./lib/' + type.substring(1));
	if(!file) {
		file = Array.isArray(task.input) ? task.input[0] : task.input;
	}
	return lib.on_file_change({task: task, file: file});
}

var watch_stack = [];
var watched_files = {};
function watch_file_change(input, callback) {
	if(Array.isArray(input)) {
		input.forEach(function(f){
			if(!watched_files.hasOwnProperty(f)) {
				watcher.add(f);
				watched_files[f] = true;
			}
		});
	} else {
		if(!watched_files.hasOwnProperty(input)) {
			watcher.add(input);
			watched_files[input] = true;
		}
	}
	watch_stack.push([input, callback]);
}
function trigger_file_change(file) {
	watch_stack.forEach(function(arr){
		var input = arr[0], fn = arr[1];
		var find = false;
		if(Array.isArray(input)) {
			find = input.indexOf(file) === -1;
		} else {
			find = input === file;
		}
		if(find) {
			fn(file);
		}
	});
}
