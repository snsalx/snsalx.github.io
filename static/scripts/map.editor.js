// Initialization
let sectionTemplate = document.getElementById("section-template").content;
let pointTemplate = document.getElementById("point-template").content;
let sections = document.getElementById("section-container");
let uploadZipButton = document.getElementById("upload-zip");
let downloadZipButton = document.getElementById("download-zip");

document.getElementById("add-section").addEventListener("click", createSection);
downloadZipButton.addEventListener("click", buildZip);
addEventListener("resize", recalculatePoints);
uploadZipButton.addEventListener("change", parseZip);

// Functions
function createSection() {
  const fragment = sectionTemplate.cloneNode(true).children[0];
  const section = parseSection(fragment);

  section.meta.title.addEventListener("input", () => {
    fragment.id = section.meta.title.value.trim();
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

  return section;
}

function updateImage(section) {
  for (const file of section.meta.image.files) {
    section.image.src = URL.createObjectURL(file);
  }
}

function createPoint(section, empty) {
  if (!empty) {
    if (!section.image.src) {
      alert("Error: No image")
      return;
    }
  }

  const point = pointTemplate.cloneNode(true).children[0];
  point.id = crypto.randomUUID();

  point.elements.delete.addEventListener("click", () => {
    Array.from(section.imageCaption.children)
      .find((element) => element.dataset.formId === point.id)
      .remove();
    point.remove();
  });
  point.elements.move.addEventListener("click", () =>
    movePoint(section, point),
  );
  point.addEventListener("change", () => updatePointPreview(point.id));
  point.addEventListener("submit", () => event.preventDefault());

  if (!empty) {
    if (!movePoint(section, point)) {
      return;
    }
  }

  section.points.appendChild(point);
  rerender();

  return point;
}

function movePoint(section, pointForm) {
  function handleImageClick({ clientX, clientY }) {
    const img = section.image.getBoundingClientRect();

    pointForm.elements.x.value = ((clientX - img.x) / img.width) * 100;
    pointForm.elements.y.value = ((clientY - img.y) / img.height) * 100;

    updatePointPreview(pointForm.id);

    Object.values(pointForm).forEach((element) => (element.disabled = false));
    section.image.style.cursor = null;
    section.image.removeEventListener("click", handleImageClick);
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
  pointPreview.classList = ["point"];
  pointPreview.href =
    linkOverwrite || "#" + pointForm.elements.sectionLink.value;
  pointPreview.style.left = pointForm.elements.x.value + "%";
  pointPreview.style.top = pointForm.elements.y.value + "%";
  pointPreview.style.width = size + "px";
  pointPreview.style.height = size + "px";
  pointPreview.dataset.formId = pointForm.id;
}

function recalculatePoints() {
  listSections().map((section) => {
    Array.from(section.points.children).map((point) =>
      updatePointPreview(point.id, section),
    );
  });
}

function buildZip() {
  const jsonSections = listSections()
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
  const json = {
    sections: jsonSections,
    version: "2.0",
  };

  const sections = listSections();
  const viewers = sections
    .map(generateViewer)
    .map((section) => section.outerHTML)
    .join("\n");
  const site = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <link rel="stylesheet" href="https://snsalx.github.io/common.css" />
        <link rel="stylesheet" href="https://snsalx.github.io/map.layout.css" />
        <script src="https://snsalx.github.io/scripts/map.viewer.js">
        </script>
        <title>Map</title>
        <!-- generated using https://snsalx.github.io/map -->
      </head>
      <body>
        ${viewers}
      </body>
    </html>
  `;

  const images = sections
    .map((section) => {
      // I know I've used this a thousand times, I'll fix it later (hopefully)
      // Also I didn't take any breaks so I no longer think properly
      // Deal with it
      for (const file of section.meta.image.files) {
        return [file.name, file, { base64: true }];
      }
    })
    .filter(Boolean);

  const zip = new JSZip();
  zip.file("data.json", JSON.stringify(json));
  zip.file("index.html", site);
  images.forEach((args) => zip.file(...args));

  zip.generateAsync({ type: "blob" }).then((blob) => saveAs(blob, "map.zip"));
}

async function parseZip() {
  let blob;
  for (const file of uploadZipButton.files) {
    blob = file;
  }

  const zip = new JSZip();
  await zip.loadAsync(blob);

  const json = JSON.parse(await zip.file("data.json").async("string"));
  const images = await Promise.all(
    Object.keys(zip.files)
      .filter((name) => name !== "index.html" && name !== "data.json")
      .map(async (name) => {
        const data = await zip.file(name).async("blob");
        return { name, data };
      }),
  );

  json.sections.map((data) => {
    const section = createSection();

    const title = data.meta.title.trim();
    section.meta.title.value = title;
    section.fragment.id = title;
    section.meta.description.value = data.meta.description;
    section.meta.source.value = data.meta.source;
    section.meta.layout.value = data.meta.layout || "auto";

    const imageName = data.meta.image;
    if (imageName) {
      const imageData = images.find((image) => image.name === imageName);
      const file = new File([imageData.data], imageName);
      const list = new DataTransfer();
      list.items.add(file);
      section.meta.image.files = list.files;
      if (json.version === "1") {
        section.image.style.width = "auto"; // to let it apply the scaling later
      }
      updateImage(section);
    }

    section.image.onload = () => {
      data.points.map((pointData) => {
        const point = createPoint(section, true);
        point.elements.sectionLink.value = pointData.sectionLink.trim();
        point.elements.size.value = pointData.size;

        if (json.version === "1") {
          const { width, height } = section.image.getBoundingClientRect();

          point.elements.x.value = (pointData.x / width) * 100;
          point.elements.y.value = (pointData.y / height) * 100;
        } else {
          point.elements.x.value = pointData.x;
          point.elements.y.value = pointData.y;
        }

        updatePointPreview(point.id);
      });

      if (json.version === "1") {
        section.image.style.width = null; // we can scale it now
      }
    };

    rerender();
  });
}

function generateViewer(section) {
  const viewer = document.createElement("section");
  viewer.classList = ["layout-" + section.meta.elements.layout.value];

  const gallery = document.createElement("figure");
  gallery.classList = ["gallery"];
  viewer.appendChild(gallery);

  const map = document.createElement("figcaption");
  map.classList = ["map"];
  let src = "";
  for (const file of section.meta.image.files) {
    src = file.name;
  }
  map.style.backgroundImage = "url(\"" + encodeURIComponent(src) + "\")";
  map.style.aspectRatio = `${section.image.naturalWidth} / ${section.image.naturalHeight}`;
  gallery.appendChild(map);

  Array.from(section.points.children).map((form) =>
    updatePointPreview(
      form.id,
      parseSection(viewer),
      "#" + form.elements.sectionLink.value,
    ),
  );

  const meta = document.createElement("div");
  meta.classList = ["meta"];
  viewer.appendChild(meta);
  if (!section.meta.elements.description.value) {
    viewer.classList = ["layout-notext"];
  }
  if (!section.meta.elements.title.value) {
    viewer.classList = ["layout-imageonly"];
  }

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
    meta.appendChild(description);
  }

  if (section.meta.elements.source.value) {
    const source = document.createElement("a");
    source.href = section.meta.elements.source.value;
    source.innerText = "source";
    meta.appendChild(source);
  }

  const nav = document.createElement("div");
  nav.classList = ["nav row"];
  viewer.appendChild(nav);

  const title = document.createElement("h2");
  title.innerText = section.meta.elements.title.value;
  title.id = section.meta.elements.title.value;
  nav.appendChild(title);

  const buttons = document.createElement("div");
  buttons.classList = ["row"];
  buttons.innerHTML = `
    <button href="#" class="button" onclick="history.back()">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="3"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
        />
      </svg>
    </button>
    <a href="#" class="button danger">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="3"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M6 18 18 6M6 6l12 12"
        />
      </svg>
    </a>
  `;
  nav.appendChild(buttons);

  return viewer;
}

function rerender() {
  const sections = listSections();

  const sectionTitles = sections
    .map((section) => section.meta.elements.title.value.trim())
    .filter(Boolean);

  const options = sectionTitles.map((title) => {
    const text = document.createTextNode(title);
    const option = document.createElement("option");
    option.appendChild(text);
    option.value = title;
    return option;
  });

  downloadZipButton.style.display = sections.length > 0 ? "block" : "none";

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
    fragment: domSection,
  };
}
