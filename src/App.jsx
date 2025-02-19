import GatwayApp from "./components/Gatway";
import PdfViewer from "./components/PdfVIewer";

function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const pdfUrl = urlParams.get("pdf");
  if (!pdfUrl) {
    return <GatwayApp />;
  }

  return <PdfViewer pdfUrl={pdfUrl} />;
}

export default App;
