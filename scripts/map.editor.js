let sectionTemplate = document.getElementById("section-template").content;
let pointTemplate = document.getElementById("point-template").content;
let sections = document.getElementById("section-container");

document.getElementById("add-section").addEventListener("click", createSection);

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

  section.points.appendChild(point);
  rerender();
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
    points: domSection.children[2],
    addPoint: domSection.children[3],
  };
}
