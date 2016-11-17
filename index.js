var fs = require('fs');
var path = require('path');

var builder = require('builder');

module.exports = build;

if(require.main === module) {
    main();
}

/**
 * 根据构建配置文件构建项目
 * @param configfile {String} 配置文件
 * @return Promise 返回构建的 Promise
 */
function build(configfile) {
	var config = check(configfile);
    if(!Array.isArray(config.build)) {
        return;
    }
    var tasks = config.build;
    var task_index = 0, task_count = tasks.length;
	process.chdir(path.dirname(configfile));
    run_tasks();
    function run_tasks() {
        if(task_index >= task_count) { return; }
        var task = tasks[task_index];
        console.log("run build process: " + (task.name ? task.name : task_index));
        builder.execute(task).then(run_tasks, function(error){
            console.log(error);
        });
    }
}

function main() {
    var cfgfile = process.argv[2] || './build.json';
    var stat;
    try {
        cfgfile = path.resolve(cfgfile);
        stat = fs.lstatSync(cfgfile);
        if(stat.isFile()) {
            build(cfgfile);
        } else {
            printusage();
        }
    } catch(e) {
        printusage();
    }
}

function printusage() {
    console.error("Usage: %s [cfgfile]", __filename);
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
