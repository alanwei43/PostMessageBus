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
  const validChars = (chars || []).filter(c => typeof c === 'string' && c.length === 1);
  let trimedStr = str;
  while (trimedStr.length) {
    const latestChar = trimedStr[trimedStr.length - 1] || '';
    if (validChars.filter(c => c === latestChar).length) {
      trimedStr = trimedStr.substr(0, trimedStr.length - 1);
    } else {
      break;
    }
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
export function appendUrlParam(url, paramName, paramVal) {
  if (typeof url !== 'string') {
    return url;
  }
  if (paramVal === undefined || paramVal === null || paramVal === '') {
    return url;
  }
  const trimedChars = ['?', '&', '#'];
  let linkAddress = url;
  const hashParts = url.split('#');
  let hashParams = '';
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

  linkAddress += `${encodeURIComponent(paramName)}=${encodeURIComponent(paramVal)}`;
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
export function getRandomKey(prefix) {
  return (prefix || '') + Date.now().toString(16) + Math.random().toString(16).substring(2);
}
