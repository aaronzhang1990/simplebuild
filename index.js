var fs = require('fs');
var path = require('path');
var assert = require('assert');
var colors = require('colors');
var debug = require('debug')('sb:main');

var utils = require('./utils');
var config = require('./config_wrapper');

module.exports = main;

if(require.main === module) {
    main();
}


// sb server [cfgfile]
// sb build [cfgfile]
// sb gen
function main() {
    var cmd = process.argv[2], cfgfile;
	if(cmd === "gen") {
        generate();
	} else if(cmd === "build") {
        config.initConfig(process.argv[3]);
        build();
    } else if(cmd === "server") {
        var options = {};
        process.argv.slice(3).forEach(function(arg){
            if(arg.indexOf('--') === 0) {
                arg = arg.substring(2);
                if(arg.length > 0) {
                    options[arg] = true;
                }
            } else {
                cfgfile = arg;
            }
        });
        if(options.production === true || process.env.NODE_ENV === "production") {
            process.env.NODE_ENV = "production";
        } else {
            process.env.NODE_ENV = "development";
        }
        config.initConfig(cfgfile);
        start_server();
    } else {
        printusage();
    }
}


/**
 * 启动开发服务器
 */
function start_server() {
    require('./server').start();
}

/**
 * 打包压缩
 * @param configfile {String} 配置文件
 * @return Promise 返回构建的 Promise
 */
function build() {
	var tasks = config.tasks;
    var builder = require('./builder');
    var task_index = 0, task_count = tasks.length;
    run_tasks();
    function run_tasks() {
        if(task_index >= task_count) { return; }
        var task = tasks[task_index];
		var task_start = Date.now();
		var continue_run = false;
        process.stdout.write("run task: " + (task.name ? task.name : '[' + task_index + ']'));
        builder.execute(task, config).then(function(){
			process.stdout.write(("    done! " + (Date.now() - task_start) + "ms\n").green);
			task_index++;
			run_tasks();
		}, function(error){
			process.stdout.write(("    done! " + (Date.now() - task_start) + "ms\n").red);
			console.log(error);
			console.log(error.stack);
        });
    }
}


function printusage() {
    console.error("Usage: sb [command] options [cfgfile]");
    console.error("command:");
    console.error("    build     打包压缩");
    console.error("    server    运行开发服务器");
	console.error("    gen       生成 build.json");
	console.error("options:");
	console.error("--production  启动生产模式");
	console.error("--development 启动开发模式，默认");
	console.error("cfgfile:      默认为 ./build.json");
}

function generate(){
	var cwd = process.cwd();
	var from = path.join(__dirname, "build.sample.json");
	var to = path.join(cwd, "build.json");
	fs.createReadStream(from).pipe(fs.createWriteStream(to));
}
