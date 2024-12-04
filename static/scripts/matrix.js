// Serial connection
let port;
let encoder = new TextEncoderStream();
let connection;

async function connect() {
  if (!("serial" in navigator)) {
    alert("Unsupported browser");
    return
  }
  
  port = await navigator.serial.requestPort();
  await port.open({ baudRate: 9600 });

  encoder.readable.pipeTo(port.writable);
  connection = encoder.writable.getWriter();
}

async function send(text) {
  if (!connection) {
    return
  }

  console.log("Sending packet:", text);
  await connection.write(text+"\n");
}

// Preview
const matrix = document.getElementById("matrix");
const ctx = matrix.getContext("2d");
const rect = matrix.getBoundingClientRect();

const resolutionVertical = 16;
const resolutionHorizontal = 16;

const width = matrix.clientWidth;
const height = matrix.clientHeight;
ctx.canvas.width = width;
ctx.canvas.height = height;

const gap = 4;
const cellW = width / resolutionHorizontal;
const cellH = height / resolutionVertical;

// Init
async function initMatrix() {
  await connect();

  for (let i = 0; i < resolutionVertical; i++) {
    for (let j = 0; j < resolutionHorizontal; j++) {
      point(j, i, 0, 0, 0);
    }
  }
}

initMatrix()

// Color selector
let color;

const colorInput = document.getElementById("color");
processColor();

colorInput.addEventListener("change", processColor)

function processColor(hex) {
  if (!hex) {
    hex = colorInput.value;
  } else {
    colorInput.value = hex;
  }

  color = [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

document.addEventListener("keydown", event => {
  switch(event.key) {
    case "1":
      processColor("#ff0000")
      break;
    case "2":
      processColor("#00ff00")
      break;
    case "3":
      processColor("#0000ff")
      break;
    case "4":
      processColor("#ffff00")
      break;
    case "5":
      processColor("#00ffff")
      break;
    case "6":
      processColor("#ff00ff")
      break;
    case "9":
      processColor("#ffffff")
      break;
    case "0":
      processColor("#000000")
      break;
  }
})

// Mouse handler
matrix.addEventListener("mousemove", handleMouse);
matrix.addEventListener("click", handleMouse);
function handleMouse(event) {
  if (!event.buttons && event.type === "mousemove") {
    return;
  }

  const x = (event.clientX - rect.x) / width * resolutionHorizontal;
  const y = (event.clientY - rect.y) / height * resolutionVertical;

  point(Math.floor(x), Math.floor(y), ...color);
}

// Drawing logic
function point(x, y, r, g, b) {
  console.log(`Painting pixel ${x}x${y}`)

  const xInPx = x * cellW;
  const yInPx = y * cellH;

  ctx.fillStyle = `rgb(30, 30, 46)`;
  ctx.fillRect(xInPx, yInPx, cellW, cellH);

  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(xInPx + gap, yInPx + gap, cellW - gap*2, cellH - gap*2);

  const packet = [x, y, r, g, b].join(",");

  send(packet);
}

