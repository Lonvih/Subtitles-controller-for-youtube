const tool = {
  isString(value) {
    return Object.prototype.toString.call(value) == "[object String]";
  },
  isPlainObject(obj) {
    let hasOwn = Object.prototype.hasOwnProperty;
    // Must be an Object.
    if (!obj || typeof obj !== "object" || obj.nodeType || isWindow(obj)) {
      return false;
    }
    try {
      if (
        obj.constructor &&
        !hasOwn.call(obj, "constructor") &&
        !hasOwn.call(obj.constructor.prototype, "isPrototypeOf")
      ) {
        return false;
      }
    } catch (e) {
      return false;
    }
    let key;
    for (key in obj) {
    }
    return key === undefined || hasOwn.call(obj, key);
  },
};

const senMes = (data) =>{
  window.postMessage(data, '*');
}

//这个类是基于腾讯开源vconsole（https://github.com/Tencent/vConsole）、写的适用本插件的一个类
class RewriteNetwork {
  constructor() {
    this.reqList = {}; // URL as key, request item as value
    this._open = undefined; // the origin function
    this._send = undefined;
    this._setRequestHeader = undefined;
    this.status = false;
    this.mockAjax();
  }
  onRemove() {
    if (window.XMLHttpRequest) {
      window.XMLHttpRequest.prototype.open = this._open;
      window.XMLHttpRequest.prototype.send = this._send;
      window.XMLHttpRequest.prototype.setRequestHeader = this._setRequestHeader;
      this._open = undefined;
      this._send = undefined;
      this._setRequestHeader = undefined;
    }
  }
  /**
   * mock ajax request
   * @private
   */
  mockAjax() {
    let _XMLHttpRequest = window.XMLHttpRequest;
    if (!_XMLHttpRequest) {
      return;
    }
    //保存原生_XMLHttpRequest方法、用于下方重写
    const _open = window.XMLHttpRequest.prototype.open,
      _send = window.XMLHttpRequest.prototype.send,
      _setRequestHeader = window.XMLHttpRequest.prototype.setRequestHeader;
    this._open = _open;
    this._send = _send;
    this._setRequestHeader = _setRequestHeader;
    //重写设置请求头open
    const that = this;
    window.XMLHttpRequest.prototype.open = function () {
      let XMLReq = this;
      let args = [].slice.call(arguments),
        method = args[0],
        url = args[1],
        id = that.getUniqueID();
      let timer = null;

      // may be used by other functions
      XMLReq._requestID = id;
      XMLReq._method = method;
      XMLReq._url = url;

      // mock onreadystatechange
      let _onreadystatechange = XMLReq.onreadystatechange || function () {};
      //定时轮询去查看状态 每次 readyState 属性改变的时候调用的事件句柄函数。当 readyState 为 3 时，它也可能调用多次。
      let onreadystatechange = function () {
        let item = that.reqList[id] || {};

        //恢复初始化
        item.readyState = XMLReq.readyState;
        item.status = 0;
        //同步XMLReq状态
        if (XMLReq.readyState > 1) {
          item.status = XMLReq.status;
        }
        item.responseType = XMLReq.responseType;
        //初始化状态。XMLHttpRequest 对象已创建或已被 abort() 方法重置。
        if (XMLReq.readyState == 0) {
          if (!item.startTime) {
            item.startTime = +new Date();
          }
          //open() 方法已调用，但是 send() 方法未调用。请求还没有被发送
        } else if (XMLReq.readyState == 1) {
          if (!item.startTime) {
            item.startTime = +new Date();
          }
          //Send() 方法已调用，HTTP 请求已发送到 Web 服务器。未接收到响应。
        } else if (XMLReq.readyState == 2) {
          // HEADERS_RECEIVED
          item.header = {};
          let header = XMLReq.getAllResponseHeaders() || "",
            headerArr = header.split("\n");
          // extract plain text to key-value format
          for (let i = 0; i < headerArr.length; i++) {
            let line = headerArr[i];
            if (!line) {
              continue;
            }
            let arr = line.split(": ");
            let key = arr[0],
              value = arr.slice(1).join(": ");
            item.header[key] = value;
          }
          //所有响应头部都已经接收到。响应体开始接收但未完成
        } else if (XMLReq.readyState == 3) {
          //HTTP 响应已经完全接收。
        } else if (XMLReq.readyState == 4) {
          clearInterval(timer);
          (item.endTime = +new Date()),
            (item.costTime = item.endTime - (item.startTime || item.endTime));
          item.response = XMLReq.response;
          item.method = XMLReq._method;
          item.url = XMLReq._url;
          item.req_type = "xml";
          item.getData = XMLReq.getData;
          item.postData = XMLReq.postData;
          that.filterData(item);
        } else {
          clearInterval(timer);
        }
        return _onreadystatechange.apply(XMLReq, arguments);
      };
      XMLReq.onreadystatechange = onreadystatechange;

      //轮询查询状态
      let preState = -1;
      timer = setInterval(function () {
        if (preState != XMLReq.readyState) {
          preState = XMLReq.readyState;
          onreadystatechange.call(XMLReq);
        }
      }, 10);

      return _open.apply(XMLReq, args);
    };

    // 重写设置请求头setRequestHeader
    window.XMLHttpRequest.prototype.setRequestHeader = function () {
      const XMLReq = this;
      const args = [].slice.call(arguments);

      const item = that.reqList[XMLReq._requestID];
      if (item) {
        if (!item.requestHeader) {
          item.requestHeader = {};
        }
        item.requestHeader[args[0]] = args[1];
      }
      return _setRequestHeader.apply(XMLReq, args);
    };

    // 重写send
    window.XMLHttpRequest.prototype.send = function () {
      let XMLReq = this;
      let args = [].slice.call(arguments),
        data = args[0];

      let item = that.reqList[XMLReq._requestID] || {};
      item.method = XMLReq._method ? XMLReq._method.toUpperCase() : "GET";

      let query = XMLReq._url ? XMLReq._url.split("?") : []; // a.php?b=c&d=?e => ['a.php', 'b=c&d=', 'e']
      item.url = XMLReq._url || "";
      item.name = query.shift() || ""; // => ['b=c&d=', 'e']
      item.name =
        item.name.replace(new RegExp("[/]*$"), "").split("/").pop() || "";

      if (query.length > 0) {
        item.name += "?" + query;
        item.getData = {};
        query = query.join("?"); // => 'b=c&d=?e'
        query = query.split("&"); // => ['b=c', 'd=?e']
        for (let q of query) {
          q = q.split("=");
          item.getData[q[0]] = decodeURIComponent(q[1]);
        }
      }
      if (item.method == "POST") {
        // save POST data
        if (tool.isString(data)) {
          let arr = data.split("&");
          item.postData = {};
          for (let q of arr) {
            q = q.split("=");
            item.postData[q[0]] = q[1];
          }
        } else if (tool.isPlainObject(data)) {
          item.postData = data;
        } else {
          item.postData = "[object Object]";
        }
      }
      XMLReq.getData = item.getData || "";
      XMLReq.postData = item.postData || "";
      return _send.apply(XMLReq, args);
    };
  }

  filterData({ url, method, req_type, response, getData, postData }) {
    if (!url) return;
    const req_data = {
      url,
      method,
      req_type,
      response,
      getData, //query参数
      postData,
    };
    if (/\/api\/timedtext/.test(url)) {
      const { response } = req_data;
      const parsedData = JSON.parse(response)
      senMes({event: '__subtitles_capture__', data: parsedData})
    }
  }

  /**
   * generate an unique id string (32)
   * @private
   * @return string
   */
  getUniqueID() {
    let id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        let r = (Math.random() * 16) | 0,
          v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
    return id;
  }
}

new RewriteNetwork()