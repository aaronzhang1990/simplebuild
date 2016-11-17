var CleanCss = require('clean-css');

var utils = require('../utils');

exports.execute = execute;

exports.on_file_change = on_file_change;


/**
 *
 * @param task.input
 * @param task.output
 * @param task.route
 * @param task.rebase 暂时无效
 * @return Promise
 */
function execute(task) {
	var input = utils.resolve_path(task.input);
	var output = utils.resolve_path(task.output);
    var rebase = task.route ? task.rebase : false;
    // css 必须配置 output
    if(!output) {
        return utils.config_error("output");
    }
    // 如果 output 是 input 中的一个文件
    if(utils.check_conflict(input, output)) {
        return utils.invalid_output_error();
    }
    return concat(input, output, rebase, task.route).then(function(result){
        if(task.hasOwnProperty('output_minify')) {
            return minify(result, task.output_minify);
        } else {
            return result;
        }
    });
/*	var output_dir = path.dirname(output);
	if(typeof input === "string") {
		input = [input];
	}
	return new Promies(function(resolve, reject){
		var codebuf = [], content;
		input.forEach(function(cssfile){
			var options = {
				keepSpecialComments: 0,
				processImport: true,
				relativeTo: path.dirname(cssfile),
				target: output_dir
			};
			var sourcecode = fs.readFileSync(cssfile, 'utf-8');
			var result = new CleanCss(options).minify(sourcecode);
			codebuf.push(result.styles);
		});
		content = codebuf.join('');
		output = variables.format(output, content);
		fs.writeFileSync(output, content);
		return true;
	});
*/
}

function concat(input, output, rebase, route) {
    var contentlist = [], allcode;
    var cwd = process.cwd();
    utils.eachfile(input, function(content, filename){
        content.push('/* file: ' + filename.replace(cwd, '') + ' */\n');
        contentlist.push(content);
    });
    allcode = contentlist.join('\n');
    utils.writefile(output, allcode);
    return Promise.resolve({file: output, code: allcode});
}

function minify(input, output) {
    var options = {
        keepSpecialComments: 0,
        processImport: false
    };
    
    var result = new CleanCss(options).minify(input.code);
    utils.writefile(output, result.styles);
    return Promise.resolve({code: result.styles, file: output});
}

/**
 * 这个函数被 route 用来通知文件变化，并更新缓存
 * @param e.file
 * @param e.task
 */
function on_file_change(e) {
    var task = e.task;
}
