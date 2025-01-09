const previewsSection = document.getElementById("video-container");
const calibrationButtons = document.getElementById("calibration").elements;
const statusBadge = document.getElementById("status");
const gridAElement = document.getElementById("grid-a");
const gridA = gridAElement.getContext("2d");
const gridBElement = document.getElementById("grid-b");
const gridB = gridBElement.getContext("2d");
let camA;
let camB;
let touch = null;
let touchDist = 0;
let releaseDist = 0;
let lastDist = Infinity;

init().catch(notifyErr)

async function init() {
  notify("initializing the UI")
  setupCalibrationButtons();

  notify("asking for permissions")
  await navigator.mediaDevices.getUserMedia({video: true, audio: false}).catch(() => {throw new Error("cameras missing")})

  notify("loading camera feeds")
  await setupCameras();

  notifyOk("tracking")

  while (true) {
    await trackActions();
    await new Promise(r => setTimeout(r, 50))
  }
}

async function setupCameras() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoInputs = devices.filter((device) => device.kind === "videoinput");

  const cameras = await Promise.all(videoInputs.map(async cam => {
    const preview = document.createElement("figure");
    preview.style.position = "relative";

    const feed = document.createElement("video");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: cam.deviceId } },
      audio: false,
    });
    feed.srcObject = stream;
    feed.play();
    preview.appendChild(feed);

    const detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      {
        modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
        minPoseScore: 0.3,
        enableTracking: true,
        enableSmoothing: true,
      },
    );

    const calibration = {
      topLeft: [0, 0],
      topRight: [1, 0],
      bottomRight: [1, 1],
      bottomLeft: [0, 1],
    };

    previewsSection.appendChild(preview);

    return { detector, feed, preview, calibration };
  }))

  if (cameras.length === 0) {
    throw new Error("both cameras missing")
  }

  if (cameras.length === 1) {
    throw new Error("second camera missing")
  }

  if (cameras.length > 2) {
    throw new Error("too many cameras")
  }

  [camA, camB] = cameras;

  resizeGrid(gridAElement, gridA, camA.feed)
  resizeGrid(gridBElement, gridB, camB.feed)

  function resizeGrid(element, ctx, feed) {
    element.style.width = "100%";
    element.style.aspectRatio = `${feed.clientWidth} / ${feed.clientHeight}`;
    setTimeout(() => {
      ctx.canvas.width = element.clientWidth;
      ctx.canvas.height = element.clientHeight;
      ctx.lineWidth = 4;
      gridClear(ctx);
    }, 10)
  }
}

async function trackWrists(cam) {
  const poses = await cam.detector.estimatePoses(cam.feed);
  const width = cam.feed.videoWidth;
  const height = cam.feed.videoHeight;

  return poses
    .map((person) => person.keypoints)
    .map((kp) => [
      kp.find((point) => point.name === "left_wrist"),
      kp.find((point) => point.name === "right_wrist"),
    ])
    .map((inPx) => 
      inPx.map((point) => ({
        ...point,
        x: point.x / width,
        y: point.y / height,
      }))
    );
}

async function trackMinDist() {
  touch = null;

  const [camAData, camBData] = await Promise.all([camA, camB].map(trackWrists));
  const camAPoints = camAData.flat();
  const camBPoints = camBData.flat();

  let minDist = 0;

  const distances = camAPoints.forEach(aPoint => (camBPoints.forEach(bPoint => dist(aPoint, bPoint))))
  function dist(aPoint, bPoint) {
    const dx = aPoint.x - bPoint.x
    const dy = aPoint.y - bPoint.y
    const dist = Math.sqrt(dx**2 + dy**2)

    if (!minDist || dist < minDist) {
      minDist = dist;
      touch = [aPoint.x, aPoint.y];
    }
  }

  return minDist;
}

async function trackActions() {
  const promiseA = findPoints(camA, gridA);
  const promiseB = findPoints(camB, gridB);
  const [pointsA, pointsB] = await Promise.all([promiseA, promiseB]);

  return // ---------------------------------------------------------------------- //

  const minDist = await trackMinDist();

  if (minDist < touchDist && lastDist < touchDist) {
    notifyOk("click registered")
  }

  if (minDist > releaseDist && lastDist > releaseDist) {
    notifyOk("tracking")
  }

  lastDist = minDist;
}

function setupCalibrationButtons() {
  calibrationButtons.tl.addEventListener("click", async () => {
    let [[leftA, rightA]] = await trackWrists(camA)
    let [[leftB, rightB]] = await trackWrists(camB)
    camA.calibration.topLeft = [leftA.x, leftA.y];
    camB.calibration.topLeft = [leftB.x, leftB.y];
    gridDrawScreen(camA.calibration, gridA);
    gridDrawScreen(camB.calibration, gridB);
  });

  calibrationButtons.tr.addEventListener("click", async () => {
    let [[leftA, rightA]] = await trackWrists(camA)
    let [[leftB, rightB]] = await trackWrists(camB)
    camA.calibration.topRight = [rightA.x, rightA.y];
    camB.calibration.topRight = [rightB.x, rightB.y];
    gridDrawScreen(camA.calibration, gridA);
    gridDrawScreen(camB.calibration, gridB);
  });

  calibrationButtons.bl.addEventListener("click", async () => {
    let [[leftA, rightA]] = await trackWrists(camA)
    let [[leftB, rightB]] = await trackWrists(camB)
    camA.calibration.bottomLeft = [leftA.x, leftA.y];
    camB.calibration.bottomLeft = [leftB.x, leftB.y];
    gridDrawScreen(camA.calibration, gridA);
    gridDrawScreen(camB.calibration, gridB);
  });

  calibrationButtons.br.addEventListener("click", async () => {
    let [[leftA, rightA]] = await trackWrists(camA)
    let [[leftB, rightB]] = await trackWrists(camB)
    camA.calibration.bottomRight = [rightA.x, rightA.y];
    camB.calibration.bottomRight = [rightB.x, rightB.y];
    gridDrawScreen(camA.calibration, gridA);
    gridDrawScreen(camB.calibration, gridB);
  });

  calibrationButtons.in.addEventListener("click", async () => {
    touchDist = await trackMinDist();
  })

  calibrationButtons.out.addEventListener("click", async () => {
    releaseDist = await trackMinDist();
  })
}

function notifyOk(message) {
  statusBadge.textContent = message
  statusBadge.style.background = "var(--pico-primary)";
  console.log(message)
}

function notify(message) {
  statusBadge.textContent = message
  statusBadge.style.background = null;
  console.log(message)
}

function notifyErr(message) {
  statusBadge.textContent = message
  statusBadge.style.background = "light-dark(#d20f39, #f38ba8)";
  console.error(message)
}

function gridClear(ctx) {
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "transparent";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  gridColorDefault(ctx);
}
function gridColorDefault(ctx) {
  ctx.strokeStyle = "#aaa";
}
function gridColorAccent(ctx) {
  ctx.strokeStyle = "#0f0";
}

function gridMoveTo(x, y, ctx) {
  ctx.moveTo(x * ctx.canvas.width, y * ctx.canvas.height);
}

function gridLineTo(x, y, ctx) {
  ctx.lineTo(x * ctx.canvas.width, y * ctx.canvas.height);
}

function gridDrawScreen(screen, ctx) {
  gridClear(ctx);
  drawRect(screen, ctx);
}

function drawRect(rect, ctx) {
  gridColorDefault(ctx);
  if (rect.active === true) {
    gridColorAccent(ctx);
  }

  ctx.beginPath()
  gridMoveTo(...rect.topLeft, ctx)
  gridLineTo(...rect.topRight, ctx)
  gridLineTo(...rect.bottomRight, ctx)
  gridLineTo(...rect.bottomLeft, ctx)
  gridLineTo(...rect.topLeft, ctx)
  ctx.stroke()
}

async function findPoints(cam, ctx) {
  gridClear(ctx);

  const hands = await trackWrists(cam); // these are grouped by 2 - by people
  const quadrantLocation = [
    undefined,
    {x: 1, y: 0},
    {x: 0, y: 0},
    {x: 0, y: 1},
    {x: 1, y: 1},
  ]

  const depth = 10;
  const max = Math.pow(2, depth);

  return recurse(cam.calibration, hands.flat(), ctx, depth - 1)
    .map(point => ({x: point.x / max, y: point.y / max}))

  function recurse(screen, hands, ctx, iterationsLeft) {
    if (iterationsLeft <= 0) {
      return [quadrantLocation[2]]
    }

    return cutIntoQuadrants(screen).map((quad, idx) => {
      const point = hands.find(hand => pointInRect([hand.x, hand.y], quad));

      quad.active = Boolean(point)
      drawRect(quad, ctx);

      if (!quad.active) {
        return []
      }

      const outer = quadrantLocation[idx + 1]

      return recurse(quad, hands, ctx, iterationsLeft-1).flatMap(inner => ({
        x: outer.x * Math.pow(2, iterationsLeft) + inner.x,
        y: outer.y * Math.pow(2, iterationsLeft) + inner.y,
      }))
    }).flat()
  }
}

// implemented https://stackoverflow.com/questions/530396/how-to-draw-a-perspective-correct-grid-in-2d
function cutIntoQuadrants(screen) {
  const left = [screen.topLeft, screen.bottomLeft]
  const bottom = [screen.bottomLeft, screen.bottomRight]
  const top = [screen.topLeft, screen.topRight]
  const right = [screen.topRight, screen.bottomRight]
  const diagonal1 = [screen.topLeft, screen.bottomRight]
  const diagonal2 = [screen.topRight, screen.bottomLeft]

  const center = intersect(diagonal1, diagonal2)
  const vanishingPoint1 = intersect(top, bottom)
  const vanishingPoint2 = intersect(left, right)

  if (vanishingPoint1 === null || vanishingPoint2 === null) {
    console.debug('vanishing points are at infinity, meaning that either the world is perfect or the system is not calibrated')
    return []
  }

  const primaryHorizontal = [center, vanishingPoint1]
  const primaryVertical = [center, vanishingPoint2]

  const leftCenter = intersect(left, primaryHorizontal)
  const bottomCenter = intersect(bottom, primaryVertical)
  const topCenter = intersect(top, primaryVertical)
  const rightCenter = intersect(right, primaryHorizontal)

  const quadrant1 = {
    topLeft: topCenter,
    topRight: screen.topRight,
    bottomRight: rightCenter,
    bottomLeft: center,
  }
  const quadrant2 = {
    topLeft: screen.topLeft,
    topRight: topCenter,
    bottomRight: center,
    bottomLeft: leftCenter,
  }
  const quadrant3 = {
    topLeft: leftCenter,
    topRight: center,
    bottomRight: bottomCenter,
    bottomLeft: screen.bottomLeft,
  }
  const quadrant4 = {
    topLeft: center,
    topRight: rightCenter,
    bottomRight: screen.bottomRight,
    bottomLeft: bottomCenter,
  }

  return [quadrant1, quadrant2, quadrant3, quadrant4]
}

function intersect(line1, line2) {
  return math.intersect(...line1, ...line2)
}

// adapted from https://stackoverflow.com/questions/2049582/how-to-determine-if-a-point-is-in-a-2d-triangle
function pointInRect(point, rect) {
  function sign(p1, p2, p3) {
    return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])
  }

  const left = sign(point, rect.bottomLeft, rect.topLeft);
  const top = sign(point, rect.topLeft, rect.topRight);
  const diagonal = sign(point, rect.topRight, rect.bottomLeft);
  const right = sign(point, rect.topRight, rect.bottomRight);
  const bottom = sign(point, rect.bottomRight, rect.bottomLeft);

  const tri1HasNegative = (left < 0) || (top < 0) || (diagonal < 0);
  const tri1HasPositive = (left > 0) || (top > 0) || (diagonal > 0);
  const pointInTri1 = !(tri1HasNegative && tri1HasPositive)

  const tri2HasNegative = (right < 0) || (bottom < 0) || (diagonal > 0);
  const tri2HasPositive = (right > 0) || (bottom > 0) || (diagonal < 0);
  const pointInTri2 = !(tri2HasNegative && tri2HasPositive)

  return pointInTri1 || pointInTri2
}
