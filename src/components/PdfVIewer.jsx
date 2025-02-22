import axios from "axios";
import Loader from "./Loader";
// import { apiDummyData2 } from "../../public/assets/apiDummyData2";
import { Document, Page, pdfjs } from "react-pdf";
import { useState, useEffect } from "react";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "./PdfViewer.css";

pdfjs.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL(
  "/assets/pdf.worker.min.js"
);

const api = "https://ad58-34-105-111-148.ngrok-free.app";

function PdfViewer({ pdfUrl }) {
  const [numPages, setNumPages] = useState(null);
  const [currentPages, setCurrentPages] = useState(() =>
    numPages < 10 ? numPages : 10
  );
  const [error, setError] = useState(null);
  const [errorAnalyze, setAError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResultUrl, setAnalysisResultUrl] = useState(null);

  // Cleanup URLs when component unmounts
  useEffect(() => {
    return () => {
      if (analysisResultUrl) {
        URL.revokeObjectURL(analysisResultUrl);
      }
    };
  }, [analysisResultUrl]);

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
    setLoading(false);
    setError("Failed to load PDF");
    console.log("Failed to load PDF", err);
  }

  function handleShowMore() {
    setCurrentPages((prev) => Math.min(prev + 10, numPages));
  }

  async function sendPdfToApi() {
    try {
      setAnalyzing(true);
      setError(null);
      setAError(null);

      // Download the PDF first - again :DD
      const pdfResponse = await axios.get(parseGoogleDriveUrl(pdfUrl), {
        responseType: "blob",
      });

      // Create FormData with the downloaded PDF
      const formData = new FormData();
      const pdfFile = new File([pdfResponse.data], "document.pdf", {
        type: "application/pdf",
      });
      formData.append("file", pdfFile);

      const response = await axios.post(api + "/analyze-pdf", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        responseType: "blob",
      });

      // Clean up previous analysis URL if it exists
      if (analysisResultUrl) {
        URL.revokeObjectURL(analysisResultUrl);
      }

      const analyzedPdfUrl = URL.createObjectURL(response.data);
      setAnalysisResultUrl(analyzedPdfUrl);
    } catch (err) {
      console.error("Error analyzing PDF:", err);
      setAError("Failed to analyze PDF");
    } finally {
      setAnalyzing(false);
    }
  }
  // async function sendPdfToApi() {
  //   setAnalysisResultUrl(apiDummyData2);
  //   console.log(apiDummyData2);
  // }

  return (
    <div className="pdf-viewer-container">
      <h1 className="pdf-welcome">Welcome to Diffing</h1>
      <div className="pdf-document">
        <Document
          file={analysisResultUrl || parseGoogleDriveUrl(pdfUrl)}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="pdf-loading">
              <Loader />
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
              scale={1.5}
            />
          ))}
        </Document>

        {!loading && !error && (
          <div className="btns-wrappers">
            {!analyzing && currentPages < numPages && numPages > 10 && (
              <button onClick={handleShowMore} className="analyze-btn">
                Show More 10 Pages
              </button>
            )}
            {analyzing ? (
              <Loader />
            ) : (
              <>
                <button
                  onClick={sendPdfToApi}
                  className="analyze-btn"
                  disabled={analyzing}
                >
                  Analyze PDF
                </button>
                <p className="pdf-error">{errorAnalyze}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PdfViewer;
