const btn = document.createElement("button");
btn.textContent = "Open in PDF Viewer";
btn.classList.add("custom-pdf-viewer-btn");
btn.addEventListener("click", () => {
  const link = window.location.href;
  // eslint-disable-next-line no-undef
  chrome.runtime.sendMessage({ action: "openPdfTab", link });
});

window.onload = function () {
  const doc = document.querySelector("[role=document]");
  if (doc) {
    doc.insertAdjacentElement("afterbegin", btn);
  } else {
    console.log("Document not found");
  }
};
