const previewsSection = document.getElementById("video-container");
const calibrationButtons = document.getElementById("calibration").elements;
const statusBadge = document.getElementById("status");
const gridAElement = document.getElementById("grid-a");
const gridA = gridAElement.getContext("2d");
const gridBElement = document.getElementById("grid-b");
const gridB = gridBElement.getContext("2d");
let camA;
let camB;
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
      gridClear(ctx);
    }, 10)
  }
}

async function trackWristsInPx(cam) {
  const poses = await cam.detector.estimatePoses(cam.feed);
  const width = cam.feed.videoWidth;
  const height = cam.feed.videoHeight;

  const people = poses
    .map((person) => person.keypoints)
    .map((kp) => [
      kp.find((point) => point.name === "left_wrist"),
      kp.find((point) => point.name === "right_wrist"),
    ])
    .map((inPx) => {
      const inPercent = inPx.map((point) => ({
        ...point,
        x: point.x / width,
        y: point.y / height,
      }));

      return inPercent;
    });

  return people
}

async function trackWrists(cam) {
  const people = await trackWristsInPx(cam);
  Array.from(cam.preview.children)
    .filter((child) => Array.from(child.classList).includes("marker"))
    .forEach((marker) => marker.remove());

  people.map(person => {
    const [leftWrist, rightWrist] = person;

    const markerL = document.createElement("div");
    markerL.classList = ["marker left"];
    markerL.style.left = leftWrist.x * 100 + "%";
    markerL.style.top = leftWrist.y * 100 + "%";

    const markerR = document.createElement("div");
    markerR.classList = ["marker right"];
    markerR.style.left = rightWrist.x * 100 + "%";
    markerR.style.top = rightWrist.y * 100 + "%";
    cam.preview.appendChild(markerL);
    cam.preview.appendChild(markerR);
  })

  return people.map(([leftWrist, rightWrist]) => {
    const width = (cam.calibration.bottomRight[0] - cam.calibration.topLeft[0])
    const height = (cam.calibration.bottomRight[1] - cam.calibration.topLeft[1])
    const lx = (leftWrist.x - cam.calibration.topLeft[0]) / width;
    const ly = (leftWrist.y - cam.calibration.topLeft[1]) / height;
    const rx = (rightWrist.x - cam.calibration.topLeft[0]) / width;
    const ry = (rightWrist.y - cam.calibration.topLeft[1]) / height;

    return { left: {x: lx, y: ly}, right: {x: rx, y: ry}}
  }).filter(i => (
      i.left.x >= 0 &&
      i.left.y <= 100 &&
      i.right.x >= 0 &&
      i.right.y <= 100
    ));
}

async function trackMinDist() {
  const [camAData, camBData] = await Promise.all([camA, camB].map(trackWrists));

  const camAPoints = camAData.flatMap(detectionToArray);
  const camBPoints = camBData.flatMap(detectionToArray);
  function detectionToArray({left, right}) {
    return [left, right]
  }

  const distances = camAPoints.flatMap(aPoint => (camBPoints.map(bPoint => dist(aPoint, bPoint))))
  function dist(aPoint, bPoint) {
    const dx = aPoint.x - bPoint.x
    const dy = aPoint.y - bPoint.y
    return Math.sqrt(dx**2 + dy**2)
  }

  return Math.min(...distances);
}

async function trackActions() {
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
    let [[leftA, rightA]] = await trackWristsInPx(camA)
    let [[leftB, rightB]] = await trackWristsInPx(camB)
    camA.calibration.topLeft = [leftA.x, leftA.y];
    camB.calibration.topLeft = [leftB.x, leftB.y];
    gridDrawScreen(camA.calibration, gridA);
    gridDrawScreen(camB.calibration, gridB);
  });

  calibrationButtons.tr.addEventListener("click", async () => {
    let [[leftA, rightA]] = await trackWristsInPx(camA)
    let [[leftB, rightB]] = await trackWristsInPx(camB)
    camA.calibration.topRight = [rightA.x, rightA.y];
    camB.calibration.topRight = [rightB.x, rightB.y];
    gridDrawScreen(camA.calibration, gridA);
    gridDrawScreen(camB.calibration, gridB);
  });

  calibrationButtons.bl.addEventListener("click", async () => {
    let [[leftA, rightA]] = await trackWristsInPx(camA)
    let [[leftB, rightB]] = await trackWristsInPx(camB)
    camA.calibration.bottomLeft = [leftA.x, leftA.y];
    camB.calibration.bottomLeft = [leftB.x, leftB.y];
    gridDrawScreen(camA.calibration, gridA);
    gridDrawScreen(camB.calibration, gridB);
  });

  calibrationButtons.br.addEventListener("click", async () => {
    let [[leftA, rightA]] = await trackWristsInPx(camA)
    let [[leftB, rightB]] = await trackWristsInPx(camB)
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
  ctx.fillStyle = "#eff1f5";
  ctx.strokeStyle = "transparent";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  gridColorDefault(ctx);
}
function gridColorDefault(ctx) {
  ctx.strokeStyle = "#4c4f69";
}
function gridColorAccent(ctx) {
  ctx.strokeStyle = "#1e66f5";
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
  ctx.beginPath()
  gridMoveTo(...rect.topLeft, ctx)
  gridLineTo(...rect.topRight, ctx)
  gridLineTo(...rect.bottomRight, ctx)
  gridLineTo(...rect.bottomLeft, ctx)
  gridLineTo(...rect.topLeft, ctx)
  ctx.stroke()
}

// implemented https://stackoverflow.com/questions/530396/how-to-draw-a-perspective-correct-grid-in-2d
function splitScreen(screen, ctx) {
  const left = [screen.topLeft, screen.bottomLeft]
  const bottom = [screen.bottomLeft, screen.bottomRight]
  const top = [screen.topLeft, screen.topRight]
  const right = [screen.topRight, screen.bottomRight]
  const diagonal1 = [screen.topLeft, screen.bottomRight]
  const diagonal2 = [screen.topRight, screen.bottomLeft]

  const center = math.intersect(...diagonal1, ...diagonal2)
  const vanishingPoint1 = math.intersect(...top, ...bottom)
  const vanishingPoint2 = math.intersect(...left, ...right)

  const primaryHorizontal = [center, vanishingPoint1]
  const primaryVertical = [center, vanishingPoint2]

  const leftCenter = math.intersect(...left, ...primaryHorizontal)
  const bottomCenter = math.intersect(...bottom, ...primaryVertical)
  const topCenter = math.intersect(...top, ...primaryVertical)
  const rightCenter = math.intersect(...right, ...primaryHorizontal)

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

  drawRect(quadrant1, ctx)
  drawRect(quadrant2, ctx)
  drawRect(quadrant3, ctx)
  drawRect(quadrant4, ctx)
}
