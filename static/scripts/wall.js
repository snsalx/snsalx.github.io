const previewsSection = document.getElementById("video-container");
const calibrationButtons = document.getElementById("calibration").elements;
const status = document.getElementById("status");
let camA;
let camB;

init().catch(notifyErr)

async function init() {
  notify("initializing the UI")
  setupCalibrationButtons();

  notify("asking for permissions")
  await navigator.mediaDevices.getUserMedia({video: true, audio: false})

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
      bottomRight: [1, 1],
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

  for (const person of people) {
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
  }

  return people.map(([leftWrist, rightWrist]) => {
    const width = (cam.calibration.bottomRight[0] - cam.calibration.topLeft[0])
    const height = (cam.calibration.bottomRight[1] - cam.calibration.topLeft[1])
    const lx = (leftWrist.x - cam.calibration.topLeft[0]) / width;
    const ly = (leftWrist.y - cam.calibration.topLeft[1]) / height;
    const rx = (leftWrist.x - cam.calibration.topLeft[0]) / width;
    const ry = (leftWrist.y - cam.calibration.topLeft[1]) / height;

    return { left: {x: lx, y: ly}, right: {x: rx, y: ry}}
  });
}

let lastDistLeftWrist = 0;
let threshold = 0.04;

async function trackActions() {
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

  notifyOk(Math.min(...distances));
}

function setupCalibrationButtons() {
  calibrationButtons.tl.addEventListener("click", async () =>
    [camA, camB].forEach(async (cam) => {
      const [[left, _]] = await trackWristsInPx(cam)
      cam.calibration.topLeft = [left.x, left.y];

      cam.preview.querySelector(".top-left")?.remove();
      const corner = document.createElement("div");
      corner.classList = ["corner top-left"];
      corner.style.left = left.x * 100 + "%";
      corner.style.top = left.y * 100 + "%";
      cam.preview.appendChild(corner);
    }),
  );

  calibrationButtons.br.addEventListener("click", async () =>
    [camA, camB].forEach(async (cam) => {
      const [[_, right]] = await trackWristsInPx(cam)
      cam.calibration.bottomRight = [right.x, right.y];

      cam.preview.querySelector(".bottom-right")?.remove();
      const corner = document.createElement("div");
      corner.classList = ["corner bottom-right"];
      corner.style.left= right.x * 100 + "%";
      corner.style.top = right.y * 100 + "%";
      cam.preview.appendChild(corner);
    }),
  );
}

function notifyOk(message) {
  status.textContent = message
  status.style.background = "var(--pico-primary)";
  console.log(message)
}

function notify(message) {
  status.textContent = message
  status.style.background = null;
  console.log(message)
}

function notifyErr(message) {
  status.textContent = message
  status.style.background = "light-dark(#d20f39, #f38ba8)";
  console.error(message)
}

