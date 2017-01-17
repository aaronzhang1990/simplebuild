#simplebuild
一个简单的前端集成构建工具。

现在的前端构建工具数不胜数，如 webpack, gulp, grunt 等。它们都非常强大，能够有效的提升开发体验。但是，对于 js 新手而言，接触这些并不能让他们的工作效率有所提升，反而会被各种配置绕晕，结果白白浪费了许多时间；对于有经验的熟手来说，如果每次配置这些工具都需要重新学习一遍这些工具也是低效的。为了一劳永逸，就写了这个工具。

简单介绍下这个工具的特性：

* 配置简益求简
* css, js, html 打包压缩一气呵成
* 以 commonjs 方式写代码，ES6 也可以
* 自带开发服务器，代码改变后自动在内存打包
* 模拟任意前端 ajax 请求，支持批量生成数据



## 安装
直接从 npm 安装：
```
npm install oe-simplebuild -g
```
安装完成之后，命令 `sb` （即 simplebuild 的简写）就可以运行了。

## 使用
运行 `sb` 可以查看自带的帮助:
```plain
Usage: sb [command] [options] [cfgfile]
command:
    build         打包压缩
    server        运行开发服务器
    gen           生成 build.json
options:
    --production  启动生产模式
    --development 启动开发模式，默认
cfgfile:          默认为 ./build.json
```

## 开发服务器
sb 的主要目的之一就是实现一个服务器：当本地 js 文件发生变化的时候，自动根据 `require` 或者手动指定的依赖构建目标 js 文件

## build.json
`sb` 需要指定一些参数来运行，这些参数放在 `build.json` 文件中。`sb` 默认读取当前目录的 `build.json`。

下面是默认运行 `sb gen` 生成的 `build.json`：
```js
{
	"server": {
		"host": "127.0.0.1",
		"port": 8080
	},
	"development": {
		"backend": "./ajax",
		"urlmaps": {
			"/": "./views/index.html",
			"/login": "./views/login.html",
			"/static": "./static/src"
		},
		"dynamic_assets": [{
			"url": "/static/js/all.js",
			"input": ["src/js/file1.js", "src/js/file2.js", "src/js/file3.js"],
			"output": "src/js/all.js",
			"output_minify": "dist/js/all-min.js"
		}]
	},
	"production": {
		"backend": "10.2.81.136:8081",
		"urlmaps": {
			"/": "./views/index.html",
			"/static": "./static/dist"
		}
	}
}
```

`server` 指定内部服务器启动时绑定的地址和端口

`development` 和 `production` 分别是内部服务器运行在开发模式和产品模式使用的配置，它们的配置参数基本一致：

* `urlmaps` 指定 url 到本地文件（夹）的映射关系，如：{"/static": "/path/to/file"}，启动内部服务器后，访问 /static/js/app.js 将返回 /path/to/directory/js/app.js 
* `backend` 指定 ajax 数据后端。当前支持两种后端，一种是将请求映射到本地 json 文件，另一种是将请求转发给真实的后端服务器
* `dynamic_assets` 指定动态资源。只有 `development` 模式支持。参见动态资源配置。

### 动态资源配置
下面参考一个例子来说明动态资源的功能：
```json
{
	"url": "/static/js/all.js",
	"input": ["src/js/file1.js", "src/js/file2.js", ...],
	"output": "src/js/all.js",
	"output_minify": "dist/js/all.min.js"
}
```
开发时，浏览器访问 `/static/js/all.js`，内部服务器返回缓存的 `src/js/all.js`。当 `input` 里面的任意文件发生变化后，`simplebuild` 自动将 `input` 指定的文件合并到内存，当浏览器再次访问 `/static/js/all.js` 时，返回缓存内容。

构建时，`simplebuild` 将 `input` 合并到 `output`，如果指定了 `output_minify`，压缩 `output` 到 `output_minify`

动态资源支持 js, css。js 动态资源还支持下面的配置：
* `commonjs` 表明 `input` 为 commonjs 风格的代码，构建的时候会根据 `require` 自动查找依赖
* `es6` 表明 `input` 为 es6 代码，构建的时候会先翻译为 es5 代码。由于翻译为 es5 代码后, `import` 翻译为 `require`，所以指定了此配置意味着 `commonjs: true`
