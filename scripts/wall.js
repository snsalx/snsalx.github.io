const videoContainer = document.getElementById("video-container");
const inputs = [];

loadCameras();
frame();

async function loadCameras() {
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
    inputs.push({ detector, video, figure });

    videoContainer.appendChild(figure);
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
    const markerR = document.createElement("div");
    markerL.classList = ["marker left"];
    markerR.classList = ["marker right"];

    markerL.style.display = "block";
    markerL.style.left = leftWrist.x * 100 + "%";
    markerL.style.top = leftWrist.y * 100 + "%";

    markerL.style.display = "block";
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
