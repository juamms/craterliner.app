// The game's sky (LunarArt.starfield, LunarArt.earth): black, small steady stars of varied size and brightness with faint warm/cool
// tints, about 200 per 512 pt square, and a small distant Earth lit from the left. On the page a few stars twinkle slowly; with
// prefers-reduced-motion they hold still.
(function () {
  "use strict";
  var canvas = document.getElementById("sky");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var stars = [], w = 0, h = 0, dpr = 1, frame = 0;

  // A small seeded generator, so the sky is the same on every visit and resize.
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function between(r, a, b) { return a + (b - a) * r(); }

  // One 512 px tile of stars, repeated across the page as the game tiles its starfield, so a resize (a phone's toolbar coming and
  // going) never moves a star.
  var TILE = 512;
  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    if (stars.length) return;
    var r = rng(11641);
    for (var i = 0; i < 200; i++) {
      // The game's numbers (diameter 0.3...1 pt, one in twenty 1.6 times that), the smallest nudged up a little to stay visible.
      var d = between(r, 0.6, 2.0) / 2 * (r() < 0.05 ? 1.6 : 1);
      var tint = between(r, -0.08, 0.08);
      stars.push({
        x: r() * TILE, y: r() * TILE, d: Math.max(d, 0.5),
        rgb: [Math.round(255 * (1 + Math.min(0, tint))), 255, Math.round(255 * (1 - Math.max(0, tint)))],
        a: between(r, 0.12, 0.8),
        // One in three twinkles: a slow swell of its brightness, each at its own pace.
        tw: r() < 0.33 ? between(r, 0.18, 0.4) : 0,
        hz: between(r, 0.08, 0.22), ph: r() * Math.PI * 2
      });
    }
  }

  function earth(cx, cy, size) {
    // LunarArt.earth, in the page's y-down coordinates: the day side top left, two cloud streaks, night over the right.
    var s = size, x0 = cx - s / 2, y0 = cy - s / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, s / 2 - s * 2 / 64, 0, Math.PI * 2);
    ctx.clip();
    var g = ctx.createLinearGradient(x0, y0, x0 + s, y0 + s);
    g.addColorStop(0, "rgb(140,191,255)");
    g.addColorStop(1, "rgb(38,89,191)");
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, s, s);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath(); ctx.ellipse(x0 + s * 0.375, y0 + s * 0.39, s * 0.175, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x0 + s * 0.425, y0 + s * 0.66, s * 0.125, s * 0.04, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.88)";
    ctx.beginPath(); ctx.ellipse(x0 + s * 0.83, y0 + s * 0.5, s * 0.55, s * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#000001";
    ctx.fillRect(0, 0, w, h);
    var still = reduce.matches;
    // Tiles from the page's middle out, so the pattern is centred whatever the width.
    var ox = (w / 2) % TILE - TILE, oy = 0;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var a = s.a;
      if (s.tw && !still) a *= 1 - s.tw * (0.5 + 0.5 * Math.sin(2 * Math.PI * s.hz * t + s.ph));
      ctx.fillStyle = "rgba(" + s.rgb[0] + "," + s.rgb[1] + "," + s.rgb[2] + "," + a.toFixed(3) + ")";
      for (var tx = ox; tx < w; tx += TILE) {
        for (var ty = oy; ty < h; ty += TILE) {
          ctx.beginPath();
          ctx.arc(tx + s.x, ty + s.y, s.d / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // Where the game hangs it: right of centre, near the top.
    earth(w * 0.78, Math.min(64, h * 0.09), 22);
  }

  function loop(ms) {
    if (window.innerWidth !== w || window.innerHeight !== h) build();
    draw(ms / 1000);
    frame = reduce.matches ? 0 : requestAnimationFrame(loop);
  }

  function start() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    build();
    if (reduce.matches) draw(0); else frame = requestAnimationFrame(loop);
  }

  var resizeTimer = 0;
  window.addEventListener("resize", function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(start, 120); });
  if (reduce.addEventListener) reduce.addEventListener("change", start);
  start();
})();
