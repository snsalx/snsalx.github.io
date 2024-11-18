let sectionTemplate = document.getElementById("section-template").content;
let pointTemplate = document.getElementById("point-template").content;
let sections = document.getElementById("section-container");

document.getElementById("add-section").addEventListener("click", createSection);

function createSection() {
  const [section] = sectionTemplate.cloneNode(true).children;
  const [{ elements: form }, spacer] = section.children;

  form.deleteSection.addEventListener("click", () => section.remove());
  form.appendPoint.addEventListener("click", () => createPoint(section));
  form.title.addEventListener("input", rerender);

  sections.appendChild(section);

  rerender();
}

function createPoint(section) {
  const [point] = pointTemplate.cloneNode(true).children;

  point.elements.delete.addEventListener("click", () => point.remove());

  getInputs(section).points.appendChild(point);

  rerender();
}

function rerender() {
  const sectionTitles = Array.from(sections.children)
    .map(getInputs)
    .map((form) => form.title.value)
    .filter(Boolean);

  const options = sectionTitles.map((title) => {
    const text = document.createTextNode(title);
    const option = document.createElement("option");
    option.appendChild(text);
    option.value = title;
    return option;
  });

  document.querySelectorAll("select[name='sectionLink']").forEach((select) => {
    const value = select.value;
    const empty = select.children[0];
    const opts = options.map((option) => option.cloneNode(true));

    select.replaceChildren(...[empty, ...opts]);
    select.value = value;
  });
}

function getInputs(section) {
  const form = section.children[0];
  return form.elements;
}
