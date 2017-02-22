var fs = require('fs');

exports.createBackend = function(config){
    var mod, stat;
    if(typeof config === "string") {
        if(config.startsWith('http')) {
            mod = "remote";
        } else {
			stat = fs.lstatSync(config);
			if(stat.isDirectory()) {
	            mod = "local";
			} else if(stat.isFile()) {
				mod = "har";
			} else {
				throw new Error("unsupported backend: " + config);
			}
        }
    } else if(typeof config === "object") {
        mod = config.type;
    } else {
        throw new Error("不支持的 backend:", config);
    }
    mod = require('./' + mod);
    return mod(config);
};
