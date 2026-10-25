// Summer API model pages: each 3D and audio example is a still linking to its
// file. Here the 3D links become a model to turn (model-viewer) and the audio
// links get a player; without this script the still and its link remain.
(function () {
  var VIEWER = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js";
  var viewerLoaded = false;
  var AUDIO = /\.(mp3|wav|ogg)(\?|$)/i;
  var MODEL = /\.glb(\?|$)|\/api\/media\/assets\//i;

  function loadViewer() {
    if (viewerLoaded) return;
    viewerLoaded = true;
    var script = document.createElement("script");
    script.type = "module";
    script.src = VIEWER;
    document.head.appendChild(script);
  }

  function enhance() {
    var links = document.querySelectorAll(".summer-samples a");
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      if (link.__summer) continue;
      link.__summer = true;
      var href = link.getAttribute("href") || "";
      var img = link.querySelector("img");
      if (MODEL.test(href) && img) {
        var viewer = document.createElement("model-viewer");
        viewer.setAttribute("src", href);
        viewer.setAttribute("poster", img.getAttribute("src"));
        viewer.setAttribute("alt", img.getAttribute("alt") || "");
        viewer.setAttribute("camera-controls", "");
        viewer.setAttribute("auto-rotate", "");
        viewer.setAttribute("loading", "lazy");
        link.replaceWith(viewer);
        loadViewer();
      } else if (AUDIO.test(href)) {
        var audio = document.createElement("audio");
        audio.controls = true;
        audio.preload = "none";
        audio.src = href;
        var box = document.createElement("div");
        if (img) box.appendChild(img);
        box.appendChild(audio);
        link.replaceWith(box);
      }
    }
  }

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      enhance();
    });
  }
  schedule();
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
})();
