// The Standard in its 15° roll frame, gear up, tilted 15° nose right as the game shows it, with its plume.
// The plume is the game's (GameScene.updatePlume, GameScene.addFlame, PlumeShape.shimmer; ShipArt.makeStandard's colours): a `.flame`
// from one round bell (width k 1.67 m, length 1.1 m), its length breathing with a smooth shimmer of three slow sines. No halo, no
// diamonds (those are the Orbiter's). With prefers-reduced-motion the plume is drawn once, at rest.
(function () {
  "use strict";
  var canvas = document.getElementById("ship");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };

  // From the render (Lander, LanderTests/SiteAssetsRender.swift → standard-roll1.json), cropped to the ink: pixels a metre and
  // where the bell's rim is in the PNG.
  var SPRITE = { src: canvas.getAttribute("data-sprite"), w: 720, h: 782, ppm: 92.051, rimX: 361.0, rimY: 776.831 };
  var TILT = 15 * Math.PI / 180; // clockwise on screen: nose right, which is what shows roll frame +1

  // ShipArt.makeStandard: plumeOuter, plumeCore; the nozzle glow is the core, opaque.
  var OUTER = "rgba(189,168,255,0.26)";   // (0.74, 0.66, 1.00, 0.26)
  var CORE = "rgba(245,242,255,0.9)";     // (0.96, 0.95, 1.00, 0.90)
  var GLOW = [245, 242, 255];
  // The engine (ShipArt.Engine): x 0, width k, length.
  var K = 1.67, LENGTH = 1.1;
  // The throttle the page shows the ship at (0...1).
  var BURN = 0.85;
  // PlumeShape.shimmerWaves, shimmerLength; engine 0's phases (seed 0).
  var WAVES = [[2.3, 0.5], [3.7, 0.3], [6.1, 0.2]];
  var SHIMMER_LENGTH = 0.05;
  var PHASES = WAVES.map(function (_, i) { return ((0 * 2654435761 + i * 40503) & 0xffff) / 65536 * 2 * Math.PI; });

  function shimmer(t) {
    var sum = 0;
    for (var i = 0; i < WAVES.length; i++) sum += WAVES[i][1] * Math.sin(2 * Math.PI * WAVES[i][0] * t + PHASES[i]);
    return sum;
  }

  // Everything below is in metres, the bell's rim at the origin, y DOWN (the game's y up, flipped).
  var spriteLeft = -SPRITE.rimX / SPRITE.ppm, spriteTop = -SPRITE.rimY / SPRITE.ppm;
  var spriteW = SPRITE.w / SPRITE.ppm, spriteH = SPRITE.h / SPRITE.ppm;
  var longest = (1 + 5 * BURN) * (1 + SHIMMER_LENGTH) * LENGTH;
  var widest = 1.5 * (0.55 + 0.45 * BURN) * K;
  // The drawing's box (sprite and longest plume), tilted, gives the canvas's shape.
  var box = { l: Math.min(spriteLeft, -widest), r: Math.max(spriteLeft + spriteW, widest), t: spriteTop, b: Math.max(spriteTop + spriteH, longest) };
  var corners = [[box.l, box.t], [box.r, box.t], [box.l, box.b], [box.r, box.b]].map(function (p) {
    return [p[0] * Math.cos(TILT) - p[1] * Math.sin(TILT), p[0] * Math.sin(TILT) + p[1] * Math.cos(TILT)];
  });
  var minX = Math.min.apply(null, corners.map(function (c) { return c[0]; }));
  var maxX = Math.max.apply(null, corners.map(function (c) { return c[0]; }));
  var minY = Math.min.apply(null, corners.map(function (c) { return c[1]; }));
  var maxY = Math.max.apply(null, corners.map(function (c) { return c[1]; }));
  var boundsW = maxX - minX, boundsH = maxY - minY;

  var sprite = new Image();
  var scale = 1, dpr = 1, frame = 0;

  function size() {
    var cssW = canvas.clientWidth || 260;
    var cssH = cssW * boundsH / boundsW;
    canvas.style.aspectRatio = "auto";
    canvas.style.height = cssH + "px";
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    scale = cssW / boundsW;
  }

  // GameScene.addFlame: the outer edge from the rim's ±0.6k out to the tip, its curve's control `bulge` out at 0.45 of the length;
  // the core from ±0.34k, control 0.44k at 0.4 of its length.
  function flame(length) {
    var width = (0.55 + 0.45 * BURN) * K;
    var bulge = width * 1.5;
    var coreLength = length * 0.45;
    ctx.fillStyle = OUTER;
    ctx.beginPath();
    ctx.moveTo(-0.6 * K, 0);
    ctx.quadraticCurveTo(-bulge, length * 0.45, 0, length);
    ctx.quadraticCurveTo(bulge, length * 0.45, 0.6 * K, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = CORE;
    ctx.beginPath();
    ctx.moveTo(-0.34 * K, 0);
    ctx.quadraticCurveTo(-0.44 * K, coreLength * 0.4, 0, coreLength);
    ctx.quadraticCurveTo(0.44 * K, coreLength * 0.4, 0.34 * K, 0);
    ctx.closePath();
    ctx.fill();
  }

  // The nozzle glow: the game's dot texture (white to clear, radially), 2.2k across, 0.13 m under the rim, added as light.
  function glow(alpha) {
    var r = 1.1 * K;
    var g = ctx.createRadialGradient(0, 0.13, 0, 0, 0.13, r);
    g.addColorStop(0, "rgba(" + GLOW.join(",") + "," + alpha.toFixed(3) + ")");
    g.addColorStop(1, "rgba(" + GLOW.join(",") + ",0)");
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = g;
    ctx.fillRect(-r, 0.13 - r, 2 * r, 2 * r);
    ctx.restore();
  }

  function draw(t) {
    var jitter = 1 + SHIMMER_LENGTH * (reduce.matches ? 0 : shimmer(t));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var s = scale * dpr;
    ctx.setTransform(s, 0, 0, s, -minX * s, -minY * s);
    ctx.rotate(TILT);
    // The game's layers: plume (outer, core), nozzle glow, then the hull over them.
    flame((1 + 5 * BURN) * jitter * LENGTH);
    glow(0.35 + 0.5 * BURN * jitter);
    if (sprite.complete && sprite.naturalWidth) {
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(sprite, spriteLeft, spriteTop, spriteW, spriteH);
    }
  }

  function loop(ms) {
    draw(ms / 1000);
    frame = requestAnimationFrame(loop);
  }

  function start() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    size();
    if (reduce.matches) draw(0); else frame = requestAnimationFrame(loop);
  }

  sprite.onload = start;
  sprite.src = SPRITE.src;
  var resizeTimer = 0;
  window.addEventListener("resize", function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(start, 120); });
  if (reduce.addEventListener) reduce.addEventListener("change", start);
  start();
})();
