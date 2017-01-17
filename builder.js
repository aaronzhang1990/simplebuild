var path = require('path');
var fs = require('fs');
var async = require('async');
var colors = require('colors');
var debug = require('debug')('sb:builder');

var config = require('./config_wrapper');

exports.build = build;

/**
 * 根据配置执行一条任务，先根据 input 生成 output
 * 在根据 output 生成 out_minify
 * @param task.input
 * @param task.output
 * @param task.output_minify
 */
function execute(task, options) {
    var type = path.extname(task.output || task.output_minify), m;
    try {
        m = require('./lib/' + type.substring(1));
        return m.execute(task, options);
    } catch(e) {
        return Promise.reject(e);
    }
}

function build() {
	var writer = process.stdout;
	var assets = config.dynamic_assets;
	debug('total task: ' + assets.length);
	async.eachOfSeries(assets, function(asset, i, callback){
		var label = asset.name ? asset.name : ('[ ' + i + ' ]');
		writer.write("run task: " + label + ' ');
		if(asset.canMinify()) {
			var start = Date.now();
			execute(asset).then(function(){
				var timestr = Date.now() - start + 'ms';
				writer.write(timestr.cyan + ' 成功\n');
				callback(null);
			}, callback);
		} else {
			writer.write("  can't minify, ignore ...");
			callback(null);
		}
	}, function(error){
		if(error) {
			console.error(error.message);
			console.error(error.stack);
		}
	});
}
