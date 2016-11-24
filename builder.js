var path = require('path');
var fs = require('fs');


exports.execute = execute;

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
		console.error(e);
		console.log(e.stack);
        return Promise.reject("unrecognize output type -> " + type);
    }
}

