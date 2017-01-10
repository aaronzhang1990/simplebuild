var path = require('path');
var fs = require('fs');

var chokidar = require('chokidar');
var debug = require('debug')('sb:watcher');

var utils = require('./utils');
var watcher;
var project_config;

module.exports = watch;

function watchAsset(asset) {
	watcher.add(asset.input);
}

function watch(config) {
	if(watcher) {
		stop_watcher();
	}
	project_config = config;
	watcher = start_watcher();
	watcher.add(config.configfile);
	config.tasks.forEach(function(task){
		if(!task.route) { return; }
		watcher.add(task.input);
		update_task_cache(task);
	});
}



function start_watcher() {
	var options = {};
	// 我在 ubuntu 16.04 下面需要开启这个标记才能正常工作
	if(process.platform === "linux") {
		options.usePolling = true;
	}
    var watcher = chokidar.watch([], options);
    watcher.on('change', on_file_change);
	watcher.on('unlink', on_file_remove);
    return watcher;
}

function stop_watcher() {
	if(!watcher) { return; }
	watcher.close();
	watcher = null;
}


function update_task_cache(task, file) {
	var type = path.extname(task.output || task.output_minify);
	var lib = require('./lib/' + type.substring(1));
	debug("updating cache for " + (task.output || task.input));
	return lib.on_file_change({task: task, file: file}).then(function(result){
		debug("cache updated!");
		task.output_cache = result.code;
		task.last_cache_time = Date.now();
		var deps = result.dependencies;
		if(Array.isArray(deps) && deps.length > 0) {
			// TODO: caculate diff
			task.dependencies = deps;
			watcher.add(deps);
		}
        return result;
    }).catch(function(e){
		console.error("update cache error: " + e.message);
		console.error(e.stack);
	});
}

function on_file_remove(file) {}

function on_file_change(file) {
	debug("detected file changed: " + file);
	if(file === project_config.configfile) {
		debug("reload config ...");
		return watch(utils.load_config(file));
	}
	config.tasks.forEach(function(task){
		if(!task.route) { return; }
		var find = task.input.indexOf(file) > -1;
		if(task.dependencies) {
			find = find || task.dependencies.indexOf(file) > -1;
		}
		find && update_task_cache(task);
	});
}
