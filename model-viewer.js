// The 3D examples on the Summer API model pages are <model-viewer> elements.
// Load the component only once a page shows one; until then (or without
// script) each shows its turntable still.
(function () {
  var SRC = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js";
  var loaded = false;
  function load() {
    if (loaded || !document.querySelector("model-viewer")) return;
    loaded = true;
    var script = document.createElement("script");
    script.type = "module";
    script.src = SRC;
    document.head.appendChild(script);
  }
  load();
  new MutationObserver(load).observe(document.documentElement, { childList: true, subtree: true });
})();
