var http = require('http');
var parseUrl = require('url').parse;
var debug = require('debug')('sb:backend:remote')

// 导出为 middleware

module.exports = function(options){
    var parts, host, port, prefix;
    if(typeof options === "string") {
        parts = parseUrl(options);
        host = parts.hostname;
        port = parts.port;
        prefix = parts.pathname;
        if(parts.protocol !== "http:") {
            throw new Error("只支持 http 协议");
        }
    } else {
        host = options.host;
        port = options.port;
        prefix = options.prefix || '/';
    }
    return function(req, resp, next){
        var clientRequest;
        debug("new browser request:", req.url);
        if(req.url.indexOf(prefix) !== 0) {
            return next();
        }
        clientRequest = http.request({
            method: req.method,
            host: host,
            port: port,
            path: req.url,
            headers: req.headers
        }, function(s){
            resp.status(s.statusCode);
            resp.set(s.headers);
            s.pipe(resp);
        });
        req.pipe(clientRequest);
        clientRequest.on('error', function(e){
            resp.status(500).end("请求远程服务器失败：" + e.message);
        });
        clientRequest.setTimeout(10000, function(){
            resp.status(500).end("请求远程服务器超时！");
        });
    };
};
