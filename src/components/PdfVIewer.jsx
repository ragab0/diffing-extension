import { Document, Page, pdfjs } from "react-pdf";
import { useState } from "react";
import { RotatingLines } from "react-loader-spinner";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "./PdfViewer.css";

pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL(
  "/assets/pdf.worker.min.js"
);

function PdfViewer({ pdfUrl }) {
  const [numPages, setNumPages] = useState(null);
  const [currentPages, setCurrentPages] = useState(1);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  function parseGoogleDriveUrl(url) {
    try {
      const fileId = url.match(/[-\w]{25,}/);
      return fileId
        ? `https://drive.google.com/uc?export=download&id=${fileId[0]}`
        : url;
    } catch (err) {
      setError("Invalid PDF URL", err);
      return null;
    }
  }

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function onDocumentLoadError(err) {
    setError("Failed to load PDF");
    console.log(err);
    setLoading(false);
  }

  function handleShowMore() {
    setCurrentPages((prev) => Math.min(prev + 10, numPages));
  }

  return (
    <div className="pdf-viewer-container">
      <h1 className="pdf-welcome">Welcome to Diffing</h1>
      <div className="pdf-document">
        <Document
          file={parseGoogleDriveUrl(pdfUrl)}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="pdf-loading">
              <RotatingLines
                visible={true}
                height="96"
                width="96"
                color="grey"
                strokeWidth="5"
                animationDuration="0.75"
                ariaLabel="rotating-lines-loading"
              />
            </div>
          }
          error={
            <div className="pdf-error">{error || "Error loading PDF!"}</div>
          }
        >
          {Array.from(new Array(currentPages), (_, index) => (
            <Page
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              className="pdf-page"
            />
          ))}
        </Document>

        {!loading && !error && currentPages < numPages && (
          <button onClick={handleShowMore} className="show-more-btn">
            Show More Pages
          </button>
        )}
      </div>
    </div>
  );
}

export default PdfViewer;
