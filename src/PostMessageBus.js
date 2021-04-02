import { getRandomKey, appendUrlParam } from './util';

const win = window;
const URL_PARA_NAME = 'post-message-event-id';

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

const Config = {
  /**
   * 格式化消息
   * @param {object} msg 消息
   * @returns {string}
   */
  serializer: function (msg) {
    return JSON.stringify(msg);
  },
  /**
   * 解析消息
   * @param {string} json 消息字符串
   * @returns {{__eventId: string, msgId: string, command: string, type: 'Request' | 'Response', data: object}}
   */
  deserializer: function (json) {
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
  let resData = {};
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
export function updateConfig({ serializer, deserializer }) {
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
export function generateBusToFrame(link, doResponse, targetOrigin) {
  const eventId = getRandomKey();
  const result = {
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

  const callbackStacks = [{
    id: '...',
    command: 'command',
    callback: function () { }
  }];
  const proxyReq = new Proxy({
  }, {
    get: function (_target, prop) {
      return function (data) {
        return new Promise((resolve) => {
          const message = {
            id: getRandomKey(),
            command: prop,
            callback: function (response) {
              resolve(response);
            }
          };
          callbackStacks.push(message);
          const postMsg = initMessageData(eventId, message.id, prop, 'Request', data);
          postMsg2Frame(postMsg);
        });
      };
    }
  });

  const ready = new Promise((resolve, reject) => {
    const msgListener = function (e) {
      const message = Config.deserializer(e.data);

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
        const responseData = getDoResponseData(doResponse, message.command, message.data, proxyReq);
        Promise.resolve(responseData).then(resolvedData => {
          const responseMsg = initMessageData(eventId, message.msgId, message.command, 'Response', resolvedData);
          postMsg2Frame(responseMsg);
        });
      }
      if (message.type === 'Response') {
        const matchCallback = callbackStacks.filter(item => item !== null).filter(item => item.command === message.command && item.id === message.msgId)[0];
        if (matchCallback && matchCallback.callback) {
          matchCallback.callback(message.data);
          callbackStacks[callbackStacks.indexOf(matchCallback)] = null;
        } else {
          console.warn(`[${location.host}] message not match handler: `, message);
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
export function generateBusToParent(doResponse, targetOrigin) {
  const eventId = new URLSearchParams(location.search).get(URL_PARA_NAME);
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

  const callbackStacks = [{
    id: '...',
    command: 'command',
    callback: function () { }
  }];

  const reqProxy = new Proxy({}, {
    get: function (target, prop) {
      return function (data) {
        return new Promise(resolve => {
          const message = {
            id: getRandomKey(),
            command: prop,
            callback: function (response) {
              resolve(response);
            }
          };
          callbackStacks.push(message);
          const postMsg = initMessageData(eventId, message.id, prop, 'Request', data);
          postMsg2Parent(postMsg);
        });
      };
    }
  });

  win.addEventListener('message', function (e) {
    if (!e.data) {
      return;
    }
    const message = Config.deserializer(e.data);

    if (message.__eventId !== eventId) {
      console.warn('event id not equal', e.data);
    }

    if (message.type === 'Request') {
      const responseData = getDoResponseData(doResponse, message.command, message.data, reqProxy);
      Promise.resolve(responseData).then(resolvedData => {
        const responseMsg = initMessageData(message.__eventId, message.msgId, message.command, 'Response', resolvedData);
        postMsg2Parent(responseMsg);
      });
    }
    if (message.type === 'Response') {
      const matchCallback = callbackStacks.filter(item => item !== null).filter(item => item.command === message.command && item.id === message.msgId)[0];
      if (matchCallback && matchCallback.callback) {
        matchCallback.callback(message.data);
        callbackStacks[callbackStacks.indexOf(matchCallback)] = null;
      } else {
        console.warn(`[${location.host}] message not match handler: `, message);
      }
    }
  }, false);

  (function echoParentFrameIsReady() {
    postMsg2Parent(initMessageData(eventId, eventId, eventId, 'Request', {}));
  })();
  return reqProxy;
}
