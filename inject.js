// var s = document.createElement('script');
// s.src = chrome.runtime.getURL('xhr.js');
// s.onload = function() {
//   this.remove();
// }; 

// (document.head || document.documentElement).appendChild(s);
// setTimeout(() => {
  const script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  //通过chrome.extension.getURL来获取包内资源的路径。需要在manifest.json文件中设置访问权限web_accessible_resources
  script.setAttribute('src', chrome.runtime.getURL('xhr.js'));
  const firstScriptEl = document.head.querySelector('script')
  document.head.insertBefore(script, firstScriptEl);
// });