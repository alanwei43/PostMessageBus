/*!
  * PostMessageBus v0.0.5
  * git+https://github.com/alanwei43/PostMessageBus.git
  * 
  * @author Alan Wei
  */
var PostMessageBus = (function (exports) {
  'use strict';

  /**
   * 删除末尾字符
   * @param {string} str 带删除字符串
   * @param {string[]} chars 字符
   * @returns {string}
   */
  function trimTailChars(str, chars) {
    if (typeof str !== 'string') {
      return str;
    }

    var validChars = (chars || []).filter(function (c) {
      return typeof c === 'string' && c.length === 1;
    });
    var trimedStr = str;

    var _loop = function _loop() {
      var latestChar = trimedStr[trimedStr.length - 1] || '';

      if (validChars.filter(function (c) {
        return c === latestChar;
      }).length) {
        trimedStr = trimedStr.substr(0, trimedStr.length - 1);
      } else {
        return "break";
      }
    };

    while (trimedStr.length) {
      var _ret = _loop();

      if (_ret === "break") break;
    }

    return trimedStr;
  }
  /**
   * URL追加参数
   * @param {String} url URL地址
   * @param {String} paramName 参数名称
   * @param {String} paramVal 参数值
   * @returns {String} 追加参数后的URL地址
   */


  function appendUrlParam(url, paramName, paramVal) {
    if (typeof url !== 'string') {
      return url;
    }

    if (paramVal === undefined || paramVal === null || paramVal === '') {
      return url;
    }

    var trimedChars = ['?', '&', '#'];
    var linkAddress = url;
    var hashParts = url.split('#');
    var hashParams = '';

    if (hashParts.length > 1) {
      linkAddress = hashParts[0];
      hashParams = hashParts.slice(1, hashParts.length).join('#');
    }

    linkAddress = trimTailChars(linkAddress, trimedChars);

    if (linkAddress.indexOf('?') === -1) {
      // 没有?, URL链接增加?
      linkAddress += '?';
    } else {
      linkAddress += '&';
    }

    linkAddress += "".concat(encodeURIComponent(paramName), "=").concat(encodeURIComponent(paramVal));

    if (hashParams) {
      linkAddress += '#' + hashParams;
    }

    return trimTailChars(linkAddress, trimedChars);
  }
  /**
   * 获取随机字符串
   * @param {string} prefix 前缀
   * @returns {string}
   */

  function getRandomKey(prefix) {
    return (prefix || '') + Date.now().toString(16) + Math.random().toString(16).substring(2);
  }

  var win = window;
  var URL_PARA_NAME = 'post-message-event-id';
  /**
   * 初始化消息数据
   * @param {string} eventId 事件Id
   * @param {string} msgId 消息Id
   * @param {string} command 命令
   * @param {'Request' | 'Response'} type 类型
   * @param {object} data 传递的数据
   */

  function initMessageData(eventId, msgId, command, type, data) {
    return {
      __eventId: eventId,
      msgId: msgId,
      command: command,
      type: type,
      data: data
    };
  }

  var Config = {
    /**
     * 格式化消息
     * @param {object} msg 消息
     * @returns {string}
     */
    serializer: function serializer(msg) {
      return JSON.stringify(msg);
    },

    /**
     * 解析消息
     * @param {string} json 消息字符串
     * @returns {{__eventId: string, msgId: string, command: string, type: 'Request' | 'Response', data: object}}
     */
    deserializer: function deserializer(json) {
      try {
        if (typeof json === 'string') {
          return JSON.parse(json);
        }

        if (json && json.__eventId) {
          return json;
        }
      } catch (ex) {
        return {};
      }

      return {};
    }
  };
  /**
   * 获取响应数据
   * @param {function | object} doResponse 响应
   * @param {string} cmd 操作
   * @param {object} data 数据
   * @param {object} context doResponse回调函数的上线文
   */

  function getDoResponseData(doResponse, cmd, data, context) {
    var resData = {};

    if (typeof doResponse === 'function') {
      resData = doResponse(cmd, data, context);
    } else if (doResponse && typeof doResponse[cmd] === 'function') {
      resData = doResponse[cmd](data, context);
    } else {
      console.warn(cmd + ' 没有对应实现');
    }

    return resData;
  }
  /**
   * 更新配置
   * @param {{serializer: function, deserializer: function}} param0 配置信息
   */


  function updateConfig(_ref) {
    var serializer = _ref.serializer,
        deserializer = _ref.deserializer;

    if (typeof serializer === 'function') {
      Config.serializer = serializer;
    }

    if (typeof deserializer === 'function') {
      Config.deserializer = deserializer;
    }
  }
  /**
   * 获取和iframe的通信
   * @param {string} link iframe链接地址
   * @param {function} doResponse 响应iframe内请求
   * @param {string} targetOrigin 默认 *
   */

  function generateBusToFrame(link, doResponse, targetOrigin) {
    var eventId = getRandomKey();
    var result = {
      frame: document.createElement('iframe'),
      eventId: eventId
    };

    if (typeof link !== 'string') {
      throw new Error('link 不能为空');
    }

    result.frame.src = appendUrlParam(link, URL_PARA_NAME, eventId);

    function postMsg2Frame(msg) {
      if (result.frame && result.frame.contentWindow) {
        result.frame.contentWindow.postMessage(Config.serializer(msg), targetOrigin || '*');
      } else {
        console.warn('iframe is null');
      }
    }

    var callbackStacks = [{
      id: '...',
      command: 'command',
      callback: function callback() {}
    }];
    var proxyReq = new Proxy({}, {
      get: function get(_target, prop) {
        return function (data) {
          return new Promise(function (resolve) {
            var message = {
              id: getRandomKey(),
              command: prop,
              callback: function callback(response) {
                resolve(response);
              }
            };
            callbackStacks.push(message);
            var postMsg = initMessageData(eventId, message.id, prop, 'Request', data);
            postMsg2Frame(postMsg);
          });
        };
      }
    });
    var ready = new Promise(function (resolve, reject) {
      var msgListener = function msgListener(e) {
        var message = Config.deserializer(e.data);

        if (message.__eventId !== eventId) {
          return;
        }

        if (message.command === eventId) {
          // frame is ready
          resolve({
            frame: result.frame,
            message: message,
            eventId: eventId,
            request: proxyReq
          });
          return;
        }

        if (message.type === 'Request') {
          var responseData = getDoResponseData(doResponse, message.command, message.data, proxyReq);
          Promise.resolve(responseData).then(function (resolvedData) {
            var responseMsg = initMessageData(eventId, message.msgId, message.command, 'Response', resolvedData);
            postMsg2Frame(responseMsg);
          });
        }

        if (message.type === 'Response') {
          var matchCallback = callbackStacks.filter(function (item) {
            return item !== null;
          }).filter(function (item) {
            return item.command === message.command && item.id === message.msgId;
          })[0];

          if (matchCallback && matchCallback.callback) {
            matchCallback.callback(message.data);
            callbackStacks[callbackStacks.indexOf(matchCallback)] = null;
          } else {
            console.warn("[".concat(location.host, "] message not match handler: "), message);
          }
        }
      };

      result.frame.addEventListener('error', function (err) {
        win.removeEventListener('message', msgListener);
        reject(err);
      });
      win.addEventListener('message', msgListener);
    });
    ready.frame = result.frame;
    ready.eventId = result.eventId;
    return ready;
  }
  /**
   * 获取和parent的通信
   * @param {function | object} doResponse 对parent请求的响应
   * @param {string} targetOrigin 默认 *
   * @returns {object}
   */

  function generateBusToParent(doResponse, targetOrigin) {
    var eventId = new URLSearchParams(location.search).get(URL_PARA_NAME);

    if (!eventId) {
      console.warn('URL参数 ' + URL_PARA_NAME + ' 不能为空');
      return;
    }

    if (!win.parent) {
      console.warn('不是iframe环境');
      return;
    }

    function postMsg2Parent(msg) {
      win.parent.postMessage(Config.serializer(msg), targetOrigin || '*');
    }

    var callbackStacks = [{
      id: '...',
      command: 'command',
      callback: function callback() {}
    }];
    var reqProxy = new Proxy({}, {
      get: function get(target, prop) {
        return function (data) {
          return new Promise(function (resolve) {
            var message = {
              id: getRandomKey(),
              command: prop,
              callback: function callback(response) {
                resolve(response);
              }
            };
            callbackStacks.push(message);
            var postMsg = initMessageData(eventId, message.id, prop, 'Request', data);
            postMsg2Parent(postMsg);
          });
        };
      }
    });
    win.addEventListener('message', function (e) {
      if (!e.data) {
        return;
      }

      var message = Config.deserializer(e.data);

      if (message.__eventId !== eventId) {
        console.warn('event id not equal', e.data);
      }

      if (message.type === 'Request') {
        var responseData = getDoResponseData(doResponse, message.command, message.data, reqProxy);
        Promise.resolve(responseData).then(function (resolvedData) {
          var responseMsg = initMessageData(message.__eventId, message.msgId, message.command, 'Response', resolvedData);
          postMsg2Parent(responseMsg);
        });
      }

      if (message.type === 'Response') {
        var matchCallback = callbackStacks.filter(function (item) {
          return item !== null;
        }).filter(function (item) {
          return item.command === message.command && item.id === message.msgId;
        })[0];

        if (matchCallback && matchCallback.callback) {
          matchCallback.callback(message.data);
          callbackStacks[callbackStacks.indexOf(matchCallback)] = null;
        } else {
          console.warn("[".concat(location.host, "] message not match handler: "), message);
        }
      }
    }, false);

    (function echoParentFrameIsReady() {
      postMsg2Parent(initMessageData(eventId, eventId, eventId, 'Request', {}));
    })();

    return reqProxy;
  }

  exports.generateBusToFrame = generateBusToFrame;
  exports.generateBusToParent = generateBusToParent;
  exports.updateConfig = updateConfig;

  return exports;

}({}));
