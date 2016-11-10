var fs = require('fs');
var path = require('path');

var csslib = require('./lib/css');
var jslib = require('./lib/js');
var htmllib = require('./lib/html');

module.exports = build;

/**
 * 根据构建配置文件构建项目
 * @param configfile {String} 配置文件
 * @return Promise 返回构建的 Promise
 */
function build(configfile) {
	var config = check(configfile);
	process.chdir(path.dirname(configfile));
	// 可能需要对 configfile 做一些检查
	// configfile 也有可能是 String, Object, Stream
	// 构建顺序 css -> js -> html
	// 如果某一个没有就进行下一个
	csslib.build(config.css).then(function(result){
		if(result) {
			return jslib.build(config.js);
		}
		return result;
	}).then(function(result){
		if(result) {
			return htmllib.build(config.html);
		}
		return result;
	});
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
