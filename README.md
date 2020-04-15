# PostMessageBus

跨iframe通信小工具, 要求浏览器支持 [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) 和 `URLSearchParams`.

## Install

```bash
npm install post-message-bus
```

或者直接引用
```html
<script src="http://github.alanwei.net/PostMessageBus/dist/post-message-bus.umd.js"></script>
```

## Use


点击访问[例子1](https://github.alanwei.net/PostMessageBus/test/one/parent.html)

```js
/**
 * 父级页面
 */ 
var parentBus = PostMessageBus.generateBusToFrame("child.html", {
    // 这里定义父级页面的方法, 供子页面调用
    greet: function (name, child) {
        // 这里可以继续使用 child 调用iframe中定义的方法
        return child.getPosition().then(function (pos) {
            // pos => /test/one/child.html
            return `你好${name}, 我知道你来自${pos}. 我叫哈哈.`;
        });
    }
});
parentBus.then(function ({ request }) {
    // 这里可以使用 request 调用子页面定义的方法
    log("子页面加载完成");
});
// 将iframe添加到文档中
document.body.append(parentBus.frame);

/**
 * iframe嵌套的子页面
 */
var childBus = PostMessageBus.generateBusToParent({
    // 这里定义的子页面的方法, 供父级页面调用
    getPosition: function (data, parent) {
        // 这里可以使用 parent 继续调用父级页面定义的方法
        return Promise.resolve(location.pathname); //模拟Ajax调用
    }
});
childBus.greet("呵呵").then(function (val) {
    log(val); //=> 你好呵呵, 我知道你来自/test/one/child.html. 我叫哈哈.
});
```


点击访问 [例子2](https://github.alanwei.net/PostMessageBus/test/multi/parent.html):

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