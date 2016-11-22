var fs = require('fs');
var path = require('path');
var assert = require('assert');
var colors = require('colors');
var debug = require('debug')('sb:main');

var utils = require('./utils');

module.exports = main;

if(require.main === module) {
    main();
}


// sb server [cfgfile]
// sb build [cfgfile]
// sb gen
function main() {
    var cmd = process.argv[2];
    var cfgfile = process.argv[3];
	if(cmd === "gen") {
		if(!cfgfile) {
			generate();
		}
		return;
	}
	cfgfile = cfgfile || './build.json';
    try {
        cfgfile = path.resolve(cfgfile);
        var stat = fs.lstatSync(cfgfile);
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


/**
 * 启动开发服务器
 */
function start_server(configfile) {
	var config;
	debug('use build file: ' + configfile);
	process.chdir(path.dirname(configfile));
    config = utils.load_config(configfile);
	config.configfile = configfile;
    require('./server').start(config);
}

/**
 * 打包压缩
 * @param configfile {String} 配置文件
 * @return Promise 返回构建的 Promise
 */
function build(configfile) {
	var config = utils.load_config(configfile);
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
	console.error("    gen       生成 build.json");
	console.error();
	console.error("cfgfile:      默认为 ./build.json");
}

function generate(){
	var cwd = process.cwd();
	var from = path.join(__dirname, "build.sample.json");
	var to = path.join(cwd, "build.json");
	fs.createReadStream(from).pipe(fs.createWriteStream(to));
}
