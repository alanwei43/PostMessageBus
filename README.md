# PostMessageBus

跨iframe通信小工具, 要求浏览器支持 [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) 和 `URLSearchParams`.

## Install

```bash
npm install post-message-bus
```

## Use

`test` 目录下有例子, 点击访问 [例子](http://github.alanwei.net/PostMessageBus/test/parent.html) 打开控制台即可看到效果.

父页面使用以下代码初始化: 

```javascript
 var bus1 = PostMessageBus.generateBusToFrame("child2.html", {
    echo: function (from, req) {
        log(`received echo ${from}`);
        return req.getName().then(name => `Hello ${name}`); // 支持返回 Promise
    }
    // 更多响应方法
});
document.body.append(bus1.frame); //将iframe添加到当前文档.
bus1.then(({request}) => {
    log("child1.html is ready"); // 子页面加载完成.
    /**
     * 这里可以使用 request 直接调用iframe内的方法, 比如: 
     * request.sendData("some data").then(iframeResponseData => "send successed");
     */
    request.getName().then(name => name === "Tim Cook") // true
});
```

子iframe页面使用以下代码初始化:

```javascript
const bus = PostMessageBus.generateBusToParent({
    getName: function () {
        return "Tim Cook";
    },
    sendData: function (d) {
        log(`received parent data: ${d}`);
    }
});
/**
 * bus 可以调用parent内定义的响应方法:
 */ 
bus.echo(location.href).then(greet => log(greet));
```