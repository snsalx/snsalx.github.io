const videoContainer = document.getElementById("video-container");
const calibrationButtons = document.getElementById("calibration").elements;
const status = document.getElementById("status");
const inputs = [];
let lastTimer;

init().catch(die)

async function init() {
  setupCalibrationButtons();
  status.textContent = "asking for permissions"
  await navigator.mediaDevices.getUserMedia({video: true, audio: false})
  status.textContent = "loading camera feeds"
  await setupCameras();
  status.textContent = "tracking";
  status.style.background = "var(--pico-primary)";

  await track();
}

async function setupCameras() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cameras = devices.filter((device) => device.kind === "videoinput");

  for (const camera of cameras) {
    console.log('Found a camera')
    const figure = document.createElement("figure");
    figure.style.position = "relative";

    const video = document.createElement("video");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: camera.deviceId } },
      audio: false,
    });
    video.srcObject = stream;
    video.play();
    figure.appendChild(video);

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

    videoContainer.appendChild(figure);

    inputs.push({ detector, video, figure, calibration, detections: [] });
  }
}

async function trackWrists(input) {
  const poses = await input.detector.estimatePoses(input.video);
  const width = input.video.videoWidth;
  const height = input.video.videoHeight;

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

  Array.from(input.figure.children)
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
    input.figure.appendChild(markerL);
    input.figure.appendChild(markerR);
  }

  input.detections = people.map(([leftWrist, rightWrist]) => {
    const width = (input.calibration.bottomRight[0] - input.calibration.topLeft[0])
    const height = (input.calibration.bottomRight[1] - input.calibration.topLeft[1])
    const lx = (leftWrist.x - input.calibration.topLeft[0]) / width;
    const ly = (leftWrist.y - input.calibration.topLeft[1]) / height;
    const rx = (leftWrist.x - input.calibration.topLeft[0]) / width;
    const ry = (leftWrist.y - input.calibration.topLeft[1]) / height;

    return { leftWrist: {x: lx, y: ly}, rightWrist: {x: rx, y: ry}}
  });

  return people;
}

let lastDistLeftWrist = 0;
let threshold = 0.04;

async function track() {
  inputs.map(trackWrists);

  lastTimer = setTimeout(track, 10);

  if (inputs.length != 2) {
    throw new Error("wrong number of cameras")
    return
  }

  const [camA, camB] = inputs;
 
  if (camA.detections[0]?.leftWrist && camB.detections[0]?.leftWrist) {
    const distLeftWrist = Math.sqrt(
      (camA.detections[0].leftWrist.x - camB.detections[0].leftWrist.x) ** 2 +
      (camA.detections[0].leftWrist.y - camB.detections[0].leftWrist.y) ** 2
    );

    if (distLeftWrist < threshold && lastDistLeftWrist < threshold) {
      console.log('held')
    }
    if (distLeftWrist < threshold) {
      lastDistLeftWrist = distLeftWrist;
    }
  }
}

function setupCalibrationButtons() {
  status.textContent = "initializing the UI"
  calibrationButtons.tl.addEventListener("click", async () =>
    inputs.forEach(async (input) => {
      const [person] = await trackWrists(input);
      const [wrist, _] = person;
      input.calibration.topLeft = [wrist.x, wrist.y];

      input.figure.querySelector(".top-left")?.remove();
      const corner = document.createElement("div");
      corner.classList = ["corner top-left"];
      corner.style.left = wrist.x * 100 + "%";
      corner.style.top = wrist.y * 100 + "%";
      input.figure.appendChild(corner);
    }),
  );

  calibrationButtons.br.addEventListener("click", async () =>
    inputs.forEach(async (input) => {
      const [person] = await trackWrists(input);
      const [_, wrist] = person;
      input.calibration.bottomRight = [wrist.x, wrist.y];

      input.figure.querySelector(".bottom-right")?.remove();
      const corner = document.createElement("div");
      corner.classList = ["corner bottom-right"];
      corner.style.left = wrist.x * 100 + "%";
      corner.style.top = wrist.y * 100 + "%";
      input.figure.appendChild(corner);
    }),
  );
}


function die() {
  clearTimeout(lastTimer)
  status.textContent = "ERROR: at least one camera missing"
  status.style.background = "light-dark(#d20f39, #f38ba8)";
}
