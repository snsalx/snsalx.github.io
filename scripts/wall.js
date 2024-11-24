const videoContainer = document.getElementById("video-container");
const calibrationButtons = document.getElementById("calibration").elements;
const inputs = [];

setupCalibration();
setupCameras();
frame();

function setupCalibration() {
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

  calibrationButtons.tr.addEventListener("click", async () =>
    inputs.forEach(async (input) => {
      const [person] = await trackWrists(input);
      const [_, wrist] = person;
      input.calibration.topLeft = [wrist.x, wrist.y];

      input.figure.querySelector(".top-right")?.remove();
      const corner = document.createElement("div");
      corner.classList = ["corner top-right"];
      corner.style.left = wrist.x * 100 + "%";
      corner.style.top = wrist.y * 100 + "%";
      input.figure.appendChild(corner);
    }),
  );

  calibrationButtons.bl.addEventListener("click", async () =>
    inputs.forEach(async (input) => {
      const [person] = await trackWrists(input);
      const [wrist, _] = person;
      input.calibration.topLeft = [wrist.x, wrist.y];

      input.figure.querySelector(".bottom-left")?.remove();
      const corner = document.createElement("div");
      corner.classList = ["corner bottom-left"];
      corner.style.left = wrist.x * 100 + "%";
      corner.style.top = wrist.y * 100 + "%";
      input.figure.appendChild(corner);
    }),
  );

  calibrationButtons.br.addEventListener("click", async () =>
    inputs.forEach(async (input) => {
      const [person] = await trackWrists(input);
      const [_, wrist] = person;
      input.calibration.topLeft = [wrist.x, wrist.y];

      input.figure.querySelector(".bottom-right")?.remove();
      const corner = document.createElement("div");
      corner.classList = ["corner bottom-right"];
      corner.style.left = wrist.x * 100 + "%";
      corner.style.top = wrist.y * 100 + "%";
      input.figure.appendChild(corner);
    }),
  );
}

async function setupCameras() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cameras = devices.filter((device) => device.kind === "videoinput");

  for (const camera of cameras) {
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
        enableTracking: true,
        enableSmoothing: true,
      },
    );

    const calibration = {
      topLeft: [0, 0],
      topRight: [0, 0],
      bottomLeft: [0, 1],
      bottomRight: [1, 1],
    };

    videoContainer.appendChild(figure);

    inputs.push({ detector, video, figure, calibration });
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

  return people;
}

async function frame() {
  inputs.map(trackWrists);
  setTimeout(frame, 30);
}
