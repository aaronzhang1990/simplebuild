#simplebuild
一个简单的前端集成构建工具。

现在的前端构建工具数不胜数，如 webpack, gulp, grunt 等。它们都非常强大，能够极大的提升开发体验。但是，对于 js 新手而言，接触这些并不能让他们的工作效率有所提升，反而会被各种配置绕晕，结果白白浪费了许多时间。这也是我写这个工具的主要原因。

简单介绍下这个工具的特性：

* 配置简益求简
* css, js, html 打包压缩一气呵成
* 以 commonjs 方式写代码，ES6 也可以
* 自带开发服务器，代码改变后自动在内存打包
* 模拟任意前端 ajax 请求，支持批量生成数据



## 安装
直接从 npm 安装：
```
npm install simplebuild -g
```
## 使用
运行 `sb` 查看自带的帮助，还是很简单的:
```plain
Usage: <install_path>/buildtool/index.js [command] [cfgfile]
command:
    build     根据 build.json 打包压缩
	server    运行开发服务器
    gen       生成 build.json

cfgfile:      默认为 ./build.json
```
## build.json
`sb` 默认读取当前目录的 `build.json` 来完成打包压缩及动态生成代码，为了尽可能简单，`build.json` 只需要很少的配置即可。

而且为了方便理解，`build.json` 允许使用 js 注释为每个选项批注说明。

下面是默认运行 `sb gen` 生成的 `build.json`：
```js
{
	// 在服务器上访问 css 时 url 前缀
    "css_url_prefix": "/static/css",
    // 本地开发环境 css 根目录
    "css_dev_root": "./src/css",
	// 本地仿生产环境根目录
    "css_dist_root": "./static/dist/css",
	// 服务器上访问 js 时 url 前缀
    "js_url_prefix": "/static/js",
	// 本地开发环境 js 根目录
    "js_dev_root": "./src/js",
	// 本地仿生产环境根目录
    "js_dist_root": "./static/dist/js",
	// input 源文件，可以是单个文件路径，也可以是多个文件，暂不支持通配符
	// output 输出文件，可以简单的理解为合并源文件
	// output_minify 在合并后的源文件基础上压缩
	// dev_route 开发环境访问资源的 url 绝对路径
	// dist_route 仿生产环境访问资源的 url 绝对路径
	"tasks": [{
		// 这里说明了如何合并使用的多个库文件，由于库文件一般被压缩过，所以这里不需要指定 output_minify
		"input": ["src/libs/jquery.min.js", "src/libs/angular.min.js", "src/libs/bootstrap/js/bootstrap.min.js"],
		"output": "src/js/libs.min.js",
		"route": "/static/js/libs.min.js"
	}, {
		// 这里说明了使用 commonjs 方式写代码，output 将会使用 browserify 打包所有依赖的文件
		"input": "src/js/app.js",
		"output": "src/js/app.bundle.js",
		"output_minify": "dist/js/app.bundle.min.js",
		"commonjs": true
	}, {
		// 这里说明了使用 es6 方式写代码，output 将会翻译为 es5 代码
		"input": "src/js/app.js",
		"output": "src/js/app.bundle.js",
		"output_minify": "dist/js/app.bundle.min.js",
		"es6": true
	}, {
		// 也可以简单的合并源代码
		"input": ["src/js/1.js", "src/js/2.js"],
		"output": "src/js/app.js",
		"output_minify": "dist/js/app.min.js",
		"route": "/static/js/app.js"
	}, {
		// 简单的合并 css
		"input": ["src/css/1.css", "src/css/3.css"],
		"output": "src/css/all.css",
		"output_minify": "dist/css/all.min.css",
		"route": "/static/css/all.css"
	}, {
		// 注意：
		// 压缩独立页面的时候，页面内所有的 link[min-href], script[min-src] 属性都将替换到 link[href], script[src] 并删除掉
		// 如果 min-href, min-src 的值为空，将删除这个元素
		// 比如，压缩下面的 HTML
		// <link rel="stylesheet" type="text/css" href="/static/css/all.css" min-href="/static/css/all.min.css">
		// <script type="text/javascript" src="/static/js/all.bundle.js" min-src="/static/js/all.bundle.min.js"></script>
		// 将得到：
		// <link rel="stylesheet" type="text/css" href="/static/css/all.min.css">
		// <script type="text/javascript" src="/static/js/all.bundle.min.js"></script>
		// 但是，压缩下面的 HTML
		// <!-- 手动设置 min-href="" -->
		// <link rel="stylesheet" type="text/css" href="/static/css/all.css" min-href="">
		// <!-- 不设置 min-src -->
		// <script type="text/javascript" src="/static/js/all.bundle.js"></script>
		// 将删除上面的 html 代码
		"input": "index.html",
		"output_minify": "dist/index.html",
		"route": "/"
	}],
	"server": {
		"host": "127.0.0.1",
		"port": 8080
	}
}
```

