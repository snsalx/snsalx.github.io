let sectionTemplate = document.getElementById("section-template").content;
let pointTemplate = document.getElementById("point-template").content;
let sections = document.getElementById("section-container");

document.getElementById("add-section").addEventListener("click", createSection);
document.getElementById("download-zip").addEventListener("click", buildZip);

function createSection() {
  const fragment = sectionTemplate.cloneNode(true).children[0];
  const section = parseSection(fragment);

  section.meta.title.addEventListener("input", rerender);
  section.meta.deleteSection.addEventListener("click", () => {
    fragment.remove();
    rerender();
  });
  section.addPoint.addEventListener("click", () => createPoint(section));

  sections.appendChild(fragment);
  rerender();
}

function createPoint(section) {
  const [point] = pointTemplate.cloneNode(true).children;

  point.elements.delete.addEventListener("click", () => point.remove());
  point.elements.move.addEventListener("click", () =>
    movePoint(section, point),
  );

  if (!movePoint(section, point)) {
    return;
  }

  section.points.appendChild(point);
  rerender();
}

function movePoint(section, point) {
  function handleImageClick({ clientX, clientY }) {
    const img = section.image.getBoundingClientRect();

    point.elements.x.value = clientX - img.x;
    point.elements.y.value = clientY - img.y;

    section.image.style.cursor = null;
    section.image.removeEventListener("click", handleImageClick);
  }

  if (!confirm("Click on the image to set the point's position")) {
    return false;
  }

  section.image.style.cursor = "crosshair";
  section.image.addEventListener("click", handleImageClick);

  return true;
}

function buildZip() {
  const json = listSections()
    .map((section) => ({
      meta: Object.fromEntries(new FormData(section.meta)),
      points: Array.from(section.points.children).map((point) =>
        Object.fromEntries(new FormData(point)),
      ),
    }))
    .map((section) => ({
      meta: { ...section.meta, image: section.meta.image.name },
      points: section.points,
    }));

  const zip = new JSZip();
  zip.file("data.json", JSON.stringify(json));

  zip.generateAsync({ type: "blob" }).then((blob) => saveAs(blob, "map.zip"));
}

function rerender() {
  const sections = listSections();

  const sectionTitles = sections
    .map((section) => section.meta.elements.title.value)
    .filter(Boolean);

  const options = sectionTitles.map((title) => {
    const text = document.createTextNode(title);
    const option = document.createElement("option");
    option.appendChild(text);
    option.value = title;
    return option;
  });

  sections
    .flatMap((section) => Array.from(section.points.children))
    .map((form) => form.elements.sectionLink)
    .forEach((select) => {
      const value = select.value;
      const empty = select.children[0];
      const opts = options.map((option) => option.cloneNode(true));

      select.replaceChildren(...[empty, ...opts]);
      select.value = value;
    });
}

function listSections() {
  return Array.from(sections.children).map(parseSection);
}

function parseSection(domSection) {
  return {
    meta: domSection.children[0],
    image: domSection.querySelector("img"),
    points: domSection.children[2],
    addPoint: domSection.children[3],
  };
}
