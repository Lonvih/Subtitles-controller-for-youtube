$(function () {
  console.log("插件加载成功 loaded");
  let video = null;
  let secondary = null;
  /* 
    {
      dDurationMs: number;
      tStartMs: numer;
      segs: [{utf8: string}]
    }
  */

  // get site secondary html tag
  // inject extension html
  async function getSecondaryHtml() {
    if (secondary) return secondary;
    return new Promise((resolve) => {
      // Use interval loop to find dom.
      let timer = setInterval(() => {
        let el = document.querySelector("#secondary");
        if (el) {
          secondary = el;
          clearInterval(timer);
          resolve(secondary);
        }
      }, 500);

      // clear interval after 60 seconds if cannot find dom.
      setTimeout(() => {
        timer && clearInterval(timer);
      }, 60 * 1000);
    });
  }

  // get video html tag
  async function getVideoHtml() {
    if (video) return video;
    return new Promise((resolve) => {
      // Use interval loop to find dom.
      let timer = setInterval(() => {
        let el = document.querySelector("video");
        if (el) {
          video = el;
          clearInterval(timer);
          resolve(video);
        }
      }, 500);

      // clear interval after 60 seconds if cannot find dom.
      setTimeout(() => {
        timer && clearInterval(timer);
      }, 60 * 1000);
    });
  }
  // chrome.runtime.onMessage.addListener((details, _) => {
  //   console.log("消息收到:::: ", details);
  // });
  window.addEventListener(
    "message",
    function (e) {
      const { event, data } = e.data;
      if (event === "__subtitles_capture__") {
        console.log("字幕文件已获取 ========> ");
        console.log(data);
        // window.localStorage.set('__subtitles_data__', JSON.stringify(data))
        // window.__subtitles_data__ = data
        window.localStorage.setItem("__subtitles_data__", JSON.stringify(data));
        console.log("<========== 字幕文件已获取");
      }
    },
    false
  );

  // Load content html which have to injected to secondary html tag
  $.ajax({
    url: chrome.runtime.getURL("content.html"),
    async success(data) {
      const el = await getSecondaryHtml();
      const contentScript = document.createElement("script");
      contentScript.setAttribute("type", "text/javascript");
      contentScript.setAttribute("src", chrome.runtime.getURL("content.js"));
      el.appendChild($.parseHTML(data, true)[0]);
      el.appendChild(contentScript);
    },
  });
  //
});
