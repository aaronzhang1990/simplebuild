var fs = require('fs');
var path = require('path');
var assert = require('assert');
var colors = require('colors');
var debug = require('debug')('build:main');

var utils = require('./utils');

module.exports = build;

if(require.main === module) {
    main();
}


// easy_pack server [cfgfile]
// easy_pack build [cfgfile]
function main() {
    var cmd = process.argv[2];
    var cfgfile = process.argv[3] || './build.json';
    var stat;
    try {
        cfgfile = path.resolve(cfgfile);
        stat = fs.lstatSync(cfgfile);
        if(stat.isDirectory()) {
            cfgfile = path.join(cfgfile, "build.json");
        }
        stat = fs.lstatSync(cfgfile);
        if(!stat.isFile()) {
            throw new Error("");
        }
    } catch(e) {
        console.error("找不到 " + cfgfile);
        return;
    }
    if(cmd === "server") {
        start_server(cfgfile);
    } else if(cmd === "build") {
        build(cfgfile);
    } else {
        printusage();
    }
    
}

function start_server(configfile) {
    var config = check(configfile);
    var server = require('./server');
	process.chdir(path.dirname(configfile));
	debug('use build file: ' + configfile);
    server.start(configfile);
}

/**
 * 根据构建配置文件构建项目
 * @param configfile {String} 配置文件
 * @return Promise 返回构建的 Promise
 */
function build(configfile) {
	var config = check(configfile);
	var tasks = config.tasks;
    if(!Array.isArray(tasks)) {
		if(tasks && tasks.hasOwnProperty('input')) {
			tasks = [tasks];
		} else {
			console.log("no task found, exit.");
			return;
		}
    }
    var builder = require('./builder');
    var task_index = 0, task_count = tasks.length;
	process.chdir(path.dirname(configfile));
    run_tasks();
    function run_tasks() {
        if(task_index >= task_count) { return; }
        var task = tasks[task_index];
		var task_start = Date.now();
		var continue_run = false;
        console.log("run task: " + (task.name ? task.name : '[' + task_index + ']'));
        builder.execute(task, config).then(function(){
			console.log("          done!".green);
			continue_run = true;
		}, function(error){
            console.log("          fail:".red);
			console.log(error);
        }).finally(function(){
			var task_end = Date.now();
			console.log("time: " + utils.readable_time(task_end - task_start));
			if(continue_run) { run_tasks(); }
		});
    }
}


function printusage() {
    console.error("Usage: %s [command] [cfgfile]", __filename);
    console.error("commands:");
    console.error("    build     打包压缩");
    console.error("    server    运行开发服务器");
}

// 检查 configfile 并且返回格式正确的配置对象
function check(configfile) {
	var content, config;
	if(typeof configfile !== "string") {
		throw new Error(configfile + " is not file path");
	}
	var stat = fs.lstatSync(configfile);
	assert.ok(stat.isFile(), "file \"" + configfile + "\" does't exists!");
	try {
		content = fs.readFileSync(configfile, 'utf-8');
		config = json.parse(content, null, true);
	} catch(e) {
		if(e.code === "ENOENT") {
			//
		}
	}
	return config;
}
