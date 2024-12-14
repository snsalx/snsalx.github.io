function getRef(url) {
  return decodeURIComponent(url.split('#').at(-1));
}

function getSection(ref) {
  if (!ref) {
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
