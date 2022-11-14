// console.log(
//   "--------> content ========>",
//   window.localStorage.getItem("__subtitles_data__")
// );
// Create subtitle line
(function () {
  let videoEl = null;
  let subtitleData = []; // 字幕数据

  let inited = false;
  let timer;
  let curSubtitleStartIndex = 0; // 当前字幕的起始区间索引
  let pageSize = 10; // 每页显示的字幕数
  let pageTotal = 0; // 字幕总页数
  let curRenderIdx = []; // 当前渲染的字幕索引区间
  let curSubtitleDataIndex = 0; // 当前正在播放的字幕索引
  let isSubtitleChange = true; // 字幕是否发生变动
  let contentDom = null; // 字幕内容 dom

  function msToSecondOffset(ms) {
    return Math.max((ms - 100), 0) / 1000;
  }

  function genSubtitleBlock(text, startTimeMs) {
    const el = document.createElement("div");
    el.className = "__subtitle_block";
    el.innerHTML = text;
    el.addEventListener('click', () => {
      // console.log('startTimeMs: ', startTimeMs);
      videoEl.currentTime = msToSecondOffset(startTimeMs)
    })
    return el;
  }

  function getContentDom() {
    if (!contentDom) {
      contentDom = document.querySelector(".__subtitles_content");
    }
    return contentDom
  }

  function appendSubtitle() {}

  function findIndexMatchVideoTime(timeMs) {
    // console.log('timeMs: ', timeMs);
    let len = subtitleData.length;
    let result = -1;
    let slideIndex = [0, len - 1];
    // 如果滑动窗口的起始值已经是数据最后一个, 说明视频已处于末尾最后
    // TODO: 是否要判断 最后的时间 已经没有了字幕
    while (len && slideIndex[0] < len - 1 && slideIndex[0] < slideIndex[1]) {
      const first = slideIndex[0];
      const last = slideIndex[1];
      const diff = last - first;
      const half = Math.ceil(diff / 2);
      const { tStartMs, dDurationMs } = subtitleData[first + half];
      if (timeMs >= tStartMs && timeMs <= tStartMs + dDurationMs) {
        // 匹配到字幕
        const matchIndex = first + half;
        result = matchIndex;
        break;
      }
      if (timeMs > tStartMs && timeMs > tStartMs + dDurationMs) {
        slideIndex = [first + half, slideIndex[1]];
      }
      if (timeMs < tStartMs) {
        slideIndex = [slideIndex[0], first + half - 1];
      }
    }
    
    // console.log('slideIndex: ', slideIndex);
    /* 
      还有一种情况: 当前时间在中间, 但是有一段时间是没有字幕的, 此时上面的循环匹配不到
      这时候 slideIndex 窗口应该是相等的两个数
     */
    //
    if (slideIndex[0] === slideIndex[1]) {
      const { tStartMs, dDurationMs } = subtitleData[slideIndex[0]];
      if (timeMs >= tStartMs && timeMs <= tStartMs + dDurationMs) {
        return slideIndex[0];
      }
      if (timeMs > tStartMs) {
        return Math.min(slideIndex[0] + 1, len - 1);
      }
      if (timeMs < tStartMs) {
        return Math.max(slideIndex[0] - 1, 0);
      }
    }
    return result;
  }

  function renderSubtitle(startIndex) {
    // console.log('startIndex: ', startIndex);
    const arr = [];
    for(let i = startIndex; i < startIndex + pageSize && i < subtitleData.length - 1; i++) {
      const { segs = [], tStartMs } = subtitleData[i]
      arr.push(genSubtitleBlock(segs[0].utf8 || '', tStartMs))
    }
    const subtitleContentEl = getContentDom();
    subtitleContentEl.innerHTML = '';
    subtitleContentEl.append(...arr)
    curRenderIdx = [startIndex, startIndex + pageSize - 1];
  }

  // 更新正在播放的的字幕样式
  function toggleActiveSubtitleStyle() {
    if (!isSubtitleChange) return;
    const index = curSubtitleDataIndex % pageSize;
    const subtitleContentEls = document.querySelectorAll(".__subtitle_block");
    [...subtitleContentEls].forEach((el, idx) => {
      if (idx === index) {
        el.classList.add('__subtitle_block-active') 
      } else {
        el.classList.remove('__subtitle_block-active')
      }
    })
  }

  function videoListener() {
    videoEl = document.querySelector("video");
    videoEl.addEventListener("timeupdate", (e) => {
      const currentTimeMs = videoEl.currentTime * 1000;
      const matchSubtitleIndex = findIndexMatchVideoTime(currentTimeMs)
      if (curSubtitleDataIndex !== matchSubtitleIndex) {
        // console.log('matchSubtitleIndex: ', matchSubtitleIndex);
        isSubtitleChange = true;
        curSubtitleDataIndex = matchSubtitleIndex;
      }
      if (matchSubtitleIndex >= subtitleData.length) {
        // 说明在视频末尾了, 且后续没有字幕了, 那么显示最后一页字幕
        curSubtitleStartIndex = (pageTotal - 1) * pageSize
      } else {
        curSubtitleStartIndex = Math.floor(matchSubtitleIndex / pageSize) * pageSize
      }
      // console.log('curSubtitleStartIndex: ', curSubtitleStartIndex);
      // 如果索引还处在已渲染的区间内, 则不做任何渲染操作
      if (curRenderIdx.length && curSubtitleStartIndex >= curRenderIdx[0] && curSubtitleStartIndex <= curRenderIdx[1]) {
        toggleActiveSubtitleStyle();
        return;
      }
      // 渲染字幕
      renderSubtitle(curSubtitleStartIndex)
      toggleActiveSubtitleStyle();
    });
  }

  function navigateSentence(newDataIndex) {
    const subtitle = subtitleData[Math.max(newDataIndex, 0)]
    if (subtitle) {
      const { tStartMs } = subtitle;
      videoEl.currentTime = msToSecondOffset(tStartMs)
    }
  }

  function controllListener() {
    const icons = document.querySelectorAll('.__subtitles_head img');
    const prev = icons[0];
    const next = icons[1];
    prev.addEventListener('click', () => {
      navigateSentence(curSubtitleDataIndex - 1);
    })
    next.addEventListener('click', () => {
      navigateSentence(curSubtitleDataIndex + 1);
    })
  }

  function initContainerStyle() {
    const youtubeContainer = document.querySelector('#container')
    const el = document.querySelector(".__video_subitles");
    el.style['min-height'] = youtubeContainer.getBoundingClientRect().height;
  }

  async function main() {
    if (inited) return;
    let cachedSubtitleData = window.localStorage.getItem("__subtitles_data__");
    if (!cachedSubtitleData) return;
    cachedSubtitleData = JSON.parse(cachedSubtitleData);
    subtitleData = cachedSubtitleData.events || [];
    const subtitleContentEl = getContentDom();
    if (subtitleContentEl) {
      pageTotal = Math.ceil(subtitleData.length / pageSize)
      // video 时间监听
      videoListener();
      controllListener();
      // setTimeout(() => {
      //   initContainerStyle()
      // }, 1000);
      inited = true;
    } else {
      // timer = setTimeout(main, 1500)
    }
  }

  function toggleContent() {
    if (!inited) return;
    const el = document.querySelector(".__video_subitles");
    const hiddenCls = '__video_subitles--hidden'
    if (el.classList.contains(hiddenCls)) {
      el.classList.remove(hiddenCls)
    } else {
      el.classList.add(hiddenCls)
    }
  }

  function init() {
    const iconEl = document.querySelector(".__extension_icon");
    iconEl.addEventListener("click", () => {
      main();
      toggleContent();
    });
    // const subtitleContentEl = document.querySelector(".__subtitles_content");
    main();
  }

  init();
})();