// Init
const matrix = document.getElementById("matrix");
const ctx = matrix.getContext("2d");
const rect = matrix.getBoundingClientRect();

const resolutionVertical = 16;
const resolutionHorizontal = 16;

const width = matrix.clientWidth;
const height = matrix.clientHeight;
ctx.canvas.width = width;
ctx.canvas.height = height;

const gap = 1;
const cellW = width / resolutionHorizontal;
const cellH = height / resolutionVertical;

function point(x, y, r, g, b) {
  const xInPx = Math.floor(x) * cellW + gap;
  const yInPx = Math.floor(y) * cellH + gap;

  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

  ctx.fillRect(xInPx, yInPx, cellW - gap*2, cellH - gap*2);
}

for (let i = 0; i < resolutionVertical; i++) {
  for (let j = 0; j < resolutionHorizontal; j++) {
    point(j, i, 0, 0, 0);
  }
}

// Form handler
function processColor(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

const colorInput = document.getElementById("color");
let color = processColor(colorInput.value);

colorInput.addEventListener("change", event => {
  color = processColor(event.target.value)
})

// Click handler
matrix.addEventListener("mousemove", handleMouse);
matrix.addEventListener("click", handleMouse);
function handleMouse(event) {
  if (!event.buttons && event.type === "mousemove") {
    return;
  }

  const x = (event.clientX - rect.x) / width * resolutionHorizontal;
  const y = (event.clientY - rect.y) / height * resolutionVertical;

  point(x, y, ...color);
}
