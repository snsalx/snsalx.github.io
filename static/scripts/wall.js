const previewsSection = document.getElementById("video-container");
const calibrationButtons = document.getElementById("calibration").elements;
const statusBadge = document.getElementById("status");
const gridElement = document.getElementById("grid-canvas");
const grid = gridElement.getContext("2d");
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

  gridElement.clientWidth = camA.feed.clientWidth;
  gridElement.clientHeight = camA.feed.clientHeight;
  grid.canvas.width = camA.feed.clientWidth;
  grid.canvas.height = camA.feed.clientHeight;
  gridClear();
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
    gridDrawScreen();
  });

  calibrationButtons.tr.addEventListener("click", async () => {
    let [[leftA, rightA]] = await trackWristsInPx(camA)
    let [[leftB, rightB]] = await trackWristsInPx(camB)
    camA.calibration.topRight = [rightA.x, rightA.y];
    camB.calibration.topRight = [rightB.x, rightB.y];
    gridDrawScreen();
  });

  calibrationButtons.bl.addEventListener("click", async () => {
    let [[leftA, rightA]] = await trackWristsInPx(camA)
    let [[leftB, rightB]] = await trackWristsInPx(camB)
    camA.calibration.bottomLeft = [leftA.x, leftA.y];
    camB.calibration.bottomLeft = [leftB.x, leftB.y];
    gridDrawScreen();
  });

  calibrationButtons.br.addEventListener("click", async () => {
    let [[leftA, rightA]] = await trackWristsInPx(camA)
    let [[leftB, rightB]] = await trackWristsInPx(camB)
    camA.calibration.bottomRight = [rightA.x, rightA.y];
    camB.calibration.bottomRight = [rightB.x, rightB.y];
    gridDrawScreen();
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

function gridClear() {
  grid.clearRect(0, 0, grid.canvas.width, grid.canvas.height)
}

function gridPoint(x, y) {
  grid.fillRect(x*grid.canvs.width-10, y*grid.canvas.height-10, 20, 20);
}

function gridMove(x, y) {
  grid.moveTo(x * grid.canvas.width, y * grid.canvas.height);
}

function gridLine(x, y) {
  grid.lineTo(x * grid.canvas.width, y * grid.canvas.height);
}

function gridDrawScreen() {
    gridClear();

    grid.beginPath()
    gridMove(...camA.calibration.topLeft)
    gridLine(...camA.calibration.topRight)
    gridLine(...camA.calibration.bottomRight)
    gridLine(...camA.calibration.bottomLeft)
    gridLine(...camA.calibration.topLeft)
    grid.stroke()
}
