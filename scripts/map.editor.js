// Initialization
let sectionTemplate = document.getElementById("section-template").content;
let pointTemplate = document.getElementById("point-template").content;
let sections = document.getElementById("section-container");

document.getElementById("add-section").addEventListener("click", createSection);
document.getElementById("download-zip").addEventListener("click", buildZip);

// Functions
function createSection() {
  const fragment = sectionTemplate.cloneNode(true).children[0];
  const section = parseSection(fragment);

  section.meta.title.addEventListener("input", () => {
    fragment.id = section.meta.title.value;
    rerender();
  });
  section.meta.deleteSection.addEventListener("click", () => {
    fragment.remove();
    rerender();
  });
  section.meta.image.addEventListener("change", () => updateImage(section));
  section.addPoint.addEventListener("click", () => createPoint(section));
  section.meta.addEventListener("submit", () => event.preventDefault());

  sections.appendChild(fragment);
  rerender();
}

function updateImage(section) {
  for (const file of section.meta.image.files) {
    section.image.src = URL.createObjectURL(file);
  }
}

function createPoint(section) {
  const point = pointTemplate.cloneNode(true).children[0];
  point.id = crypto.randomUUID();

  point.elements.delete.addEventListener("click", () => point.remove());
  point.elements.move.addEventListener("click", () =>
    movePoint(section, point),
  );
  point.addEventListener("change", () => updatePointPreview(point.id));
  point.addEventListener("submit", () => event.preventDefault());

  if (!movePoint(section, point)) {
    return;
  }

  section.points.appendChild(point);
  rerender();
}

function movePoint(section, pointForm) {
  function handleImageClick({ clientX, clientY }) {
    const img = section.image.getBoundingClientRect();

    pointForm.elements.x.value = clientX - img.x;
    pointForm.elements.y.value = clientY - img.y;

    updatePointPreview(pointForm.id);

    Object.values(pointForm).forEach((element) => (element.disabled = false));
    section.image.style.cursor = null;
    section.image.removeEventListener("click", handleImageClick);
  }

  if (!confirm("Click on the image to set the point's position")) {
    return false;
  }

  Array.from(section.imageCaption.children)
    .find((element) => element.dataset.formId === pointForm.id)
    ?.remove();
  Object.values(pointForm).forEach((element) => (element.disabled = true));
  section.image.style.cursor = "crosshair";
  section.image.addEventListener("click", handleImageClick);

  return true;
}

function updatePointPreview(formId, sectionOverwrite, linkOverwrite) {
  const pointForm = document.getElementById(formId);
  const section =
    sectionOverwrite || parseSection(pointForm.parentElement.parentElement);
  let pointPreview = Array.from(section.imageCaption.children).find(
    (element) => element.dataset.formId === pointForm.id,
  );

  if (!pointPreview) {
    pointPreview = document.createElement("a");
    section.imageCaption.appendChild(pointPreview);
  }

  const size = pointForm.elements.size.value;
  pointPreview.classList = [pointForm.elements.type.value];
  pointPreview.href =
    linkOverwrite || "#" + pointForm.elements.sectionLink.value;
  pointPreview.style.left = pointForm.elements.x.value - size / 2 + "px";
  pointPreview.style.top = pointForm.elements.y.value - size / 2 + "px";
  pointPreview.style.width = size + "px";
  pointPreview.style.height = size + "px";
  pointPreview.dataset.formId = pointForm.id;
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

function generateViewer(section) {
  const viewer = document.createElement("viewer");

  const title = document.createElement("h2");
  title.innerText = section.meta.elements.title.value;
  viewer.appendChild(title);

  if (section.meta.elements.description.value) {
    const description = document.createElement("div");
    section.meta.description.value
      .split("\n")
      .filter(Boolean)
      .forEach((paragraph) => {
        const p = document.createElement("p");
        p.innerText = paragraph;
        description.appendChild(p);
      });
    viewer.appendChild(description);
  }

  if (section.meta.elements.source.value) {
    const source = document.createElement("a");
    source.href = section.meta.elements.source.value;
    source.innerText = "source";
    viewer.appendChild(source);
  }

  const figure = document.createElement("figure");
  figure.style.position = "relative";
  viewer.appendChild(figure);

  const image = document.createElement("img");
  for (const file of section.meta.image.files) {
    image.src = file.name;
  }
  figure.appendChild(image);

  const points = document.createElement("figcaption");
  figure.appendChild(points);
  Array.from(section.points.children).map((form) =>
    updatePointPreview(
      form.id,
      parseSection(viewer),
      "#" + section.meta.elements.title.value,
    ),
  );

  return viewer;
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
    imageCaption: domSection.querySelector("figcaption"),
    points: domSection.children[2],
    addPoint: domSection.children[3],
  };
}
