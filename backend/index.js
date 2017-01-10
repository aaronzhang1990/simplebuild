

exports.createBackend = function(config){
    var mod;
    if(typeof config === "string") {
        if(config.startsWith('http')) {
            mod = "remote";
        } else {
            mod = "local";
        }
    } else if(typeof config === "object") {
        mod = config.type;
    } else {
        throw new Error("不支持的 backend:", config);
    }
    mod = require('./' + mod);
    return mod(config);
};
