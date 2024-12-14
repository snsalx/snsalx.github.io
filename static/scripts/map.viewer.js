function getRef(url) {
  const [site, ref] = url.split("#");

  return decodeURIComponent(ref);
}

function getSection(ref) {
  if (!ref || ref === "undefined") {
    return document.querySelector("section");
  }

  return document.getElementById(ref).parentElement.parentElement;
}

addEventListener("hashchange", ({oldURL, newURL}) => {
  const from = getSection(getRef(oldURL));
  const to = getSection(getRef(newURL));

  if (!to) {
    history.back();
    throw new Error("invalid ref: " + getRef(oldURL) + " -> " + getRef(newURL));
  }

  from.classList.remove("visible");
  to.classList.add("visible");
})

location.href = "#";
addEventListener("load", () => {
  document.querySelector("section").classList.add("visible");
})
