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
function execute(task) {
    var type = path.extname(task.output), m;
    try {
        // html 可以不指定 output，这里自动补上
        if(type === ".html") {
            if(!task.hasOwnProperty('output')) {
                task.output = task.input;
            }
        }
        m = require('./lib/' + type.substring(1));
        return m.execute(task);
    } catch(e) {
        return Promise.reject("unrecognize output type -> " + type);
    }
}

