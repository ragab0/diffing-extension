from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
import os
import ngrok
import shutil
import io
import time
import tempfile

# Set matplotlib backend to avoid GUI issues
os.environ['MPLBACKEND'] = 'Agg'

from magic_pdf.data.data_reader_writer import FileBasedDataReader
from magic_pdf.data.dataset import PymuDocDataset
from magic_pdf.model.doc_analyze_by_custom_model import doc_analyze
from magic_pdf.config.enums import SupportedPdfParseMethod

app = FastAPI(title="Magic PDF API", description="API for PDF analysis and processing")

# Configure Ngrok
NGROK_AUTHTOKEN = "2tJdlZT3Kev2sR5GtGcUTqMyflP_5pG2Te1hVNPt1esfDsTbh"  # Replace with your actual token
ngrok.set_auth_token(NGROK_AUTHTOKEN)

@app.on_event("startup")
async def startup_event():
    # Start ngrok tunnel
    public_url = ngrok.connect(8000, "http")
    print(f"Ngrok tunnel established: {public_url}")

@app.on_event("shutdown")
async def shutdown_event():
    # Close ngrok tunnel
    ngrok.disconnect()
    print("Ngrok tunnel closed")

@app.post("/analyze-pdf")
async def analyze_pdf(file: UploadFile = File(...)):
    """
    Analyze a PDF file and return the layout visualization directly.
    """
    start_time = time.time()
    
    # Read the uploaded file into memory
    pdf_bytes = await file.read()
    
    # Create a temporary directory for processing
    temp_dir = tempfile.mkdtemp()
    try:
        # Create Dataset Instance
        ds = PymuDocDataset(pdf_bytes)
        
        # Create temporary paths for output
        temp_output_path = os.path.join(temp_dir, "output_layout.pdf")
        
        # Process based on PDF type
        if ds.classify() == SupportedPdfParseMethod.OCR:
            infer_result = ds.apply(doc_analyze, ocr=True)
            pipe_result = infer_result.pipe_txt_mode(FileBasedDataReader(temp_dir))
        else:
            infer_result = ds.apply(doc_analyze, ocr=False)
            pipe_result = infer_result.pipe_txt_mode(FileBasedDataReader(temp_dir))
        
        # Generate layout visualization to file
        pipe_result.draw_layout(temp_output_path)
        
        processing_time = time.time() - start_time
        print(f"PDF processing completed in {processing_time:.2f} seconds")
        
        # Define file streaming function
        def iterfile():
            with open(temp_output_path, "rb") as f:
                while chunk := f.read(8192):  # Stream in 8KB chunks
                    yield chunk
            # Clean up temporary directory after streaming is complete
            shutil.rmtree(temp_dir)
        
        # Return the layout visualization as a streaming response
        return StreamingResponse(
            content=iterfile(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={file.filename}_layout.pdf"}
        )
    except Exception as e:
        # Clean up on error
        shutil.rmtree(temp_dir)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)