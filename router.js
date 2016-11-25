var path = require('path');
var fs = require('fs');

var express = require('express');
var chokidar = require('chokidar');
var debug = require('debug')('sb:router')
var router = express.Router();

var utils = require('./utils');
var watcher = start_watcher();
var first_call_watch = false;;


module.exports = router;

// 为了让程序简单点，不监听 cfgfile 发生的变化
// 这意味着，如果 cfgfile 发生了变化，必须重启开发服务器
router.watch = function(config, mode){
	debug("start watch " + config.configfile + " on " + mode + " mode");
    // 本地静态文件
    if(mode === "production") {
        router.use(config.css_url_prefix, express.static(config.css_dist_root));
        router.use(config.js_url_prefix, express.static(config.js_dist_root));
    } else {
        router.use(config.css_url_prefix, express.static(config.css_dev_root));
        router.use(config.js_url_prefix, express.static(config.js_dev_root));
    }
    // 动态更新的静态文件
	var route_key = mode === "production" ? "dist_route" : "dev_route";
    config.tasks.forEach(function(task){
        if(task[route_key]) {
	        add_route(task, mode);
		}
    });
    // ajax 请求映射请求
    router.use(ajax2local(path.dirname(config.configfile)));
};

function start_watcher() {
	var options = {};
	// 我在 ubuntu 16.04 下面需要开启这个标记才能正常工作
	if(process.platform === "linux") {
		options.usePolling = true;
	}
    var watcher = chokidar.watch([], options);
    watcher.on('change', trigger_file_change);
    return watcher;
}


function ajax2local(root) {
    root = path.resolve(root);
    return function(req, resp, next){
        var dir = 'ajax' + req.path, file, last_slash;
        dir = path.join(root, dir.trim());
        if(dir.endsWith('/')) {
            dir = dir.substring(0, dir.length - 1);
        }
        last_slash = dir.lastIndexOf('/');
        file = dir.substring(0, last_slash) + '/' + req.method.toLowerCase() + '-' + dir.substring(last_slash + 1) + '.json';
        if(fs.existsSync(file)) {
            return utils.make_response(resp, file);
        }
        file = dir + '.json';
        if(fs.existsSync(file)) {
            return utils.make_response(resp, file);
        }
        next();
    };
}

function add_route(task, mode) {
	if(mode === "production") {
		debug("[" + mode + "] add route for: " + task.dist_route);
		create_dist_route(task);
	} else {
		debug("[" + mode + "] add route for: " + task.dev_route);
		create_dev_route(task);
	}
}

function create_dev_route(task){
    var output_cache;
    var last_update_time = 0;
	// 监听文件变化并打包
    watch_file_change(task.input, function(file){
		update_task_cache(task, file).then(function(result){
			output_cache = result.code;
			last_update_time = Date.now();
			debug("cache updated");
		}).catch(function(err){
			console.error(err);
		});
	});
    // 第一次请求时，手动触发 on_file_change 获得 output 并缓存
    // 文件发生变更时，更新缓存
	router.get(task.dev_route, function(req, resp) {
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
				}).catch(function(err){
					throw err;
				});
			}
		} else {
			resp.status(304).end();
		}
	});
}

function create_dist_route(task){
	if(!utils.isfile(task.output_minify)) {
		throw new Error("you start on production mode, please run \"sb build\" first");
	}
	router.get(task.dist_route, function(req, resp){
		resp.sendFile(task.output_minify);
	});
}


function update_task_cache(task, file) {
	var type = path.extname(task.output || task.output_minify);
	var lib = require('./lib/' + type.substring(1));
	if(!file) {
		file = task.input[0];
	}
	return lib.on_file_change({task: task, file: file});
}

var watch_stack = [];
var watched_files = {};
function watch_file_change(input, callback) {
	input.forEach(function(file){
		if(!watched_files.hasOwnProperty(file)) {
			watcher.add(file);
			watched_files[file] = true;
		}
	});
	watch_stack.push([input, callback]);
}
function trigger_file_change(file) {
	debug("detected file changed: " + file);
	watch_stack.forEach(function(arr){
		var input = arr[0], fn = arr[1];
		var find = false;
		find = input.indexOf(file) > -1;
		if(find) {
			fn(file);
		}
	});
}
