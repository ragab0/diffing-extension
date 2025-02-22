from fastapi import FastAPI, File, UploadFile, Query
from fastapi.responses import JSONResponse, FileResponse
import os
import ngrok
import shutil
from typing import Optional

# Set non-interactive matplotlib backend
os.environ['MPLBACKEND'] = 'Agg'

from magic_pdf.data.data_reader_writer import FileBasedDataWriter, FileBasedDataReader
from magic_pdf.data.dataset import PymuDocDataset
from magic_pdf.model.doc_analyze_by_custom_model import doc_analyze
from magic_pdf.config.enums import SupportedPdfParseMethod

print("Starting app")

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
    # Save the uploaded file temporarily
    temp_pdf_path = f"temp_{file.filename}"
    name_without_suff = file.filename.split(".")[0]
    
    with open(temp_pdf_path, "wb") as buffer:
        buffer.write(await file.read())
    
    # Prepare environment
    local_image_dir, local_md_dir = "output/images", "output"
    image_dir = str(os.path.basename(local_image_dir))
    os.makedirs(local_image_dir, exist_ok=True)
    
    image_writer = FileBasedDataWriter(local_image_dir)
    md_writer = FileBasedDataWriter(local_md_dir)
    
    # Read PDF bytes
    reader = FileBasedDataReader("")
    pdf_bytes = reader.read(temp_pdf_path)
    
    # Process PDF
    # 1. Create Dataset Instance
    ds = PymuDocDataset(pdf_bytes)
    
    # 2. Inference
    pdf_type = ds.classify()
    
    # 3. Process based on PDF type
    if pdf_type == SupportedPdfParseMethod.OCR:
        infer_result = ds.apply(doc_analyze, ocr=True)
        pipe_result = infer_result.pipe_ocr_mode(image_writer)
    else:
        infer_result = ds.apply(doc_analyze, ocr=False)
        pipe_result = infer_result.pipe_txt_mode(image_writer)
    
    # 4. Draw model result on each page
    model_pdf_path = os.path.join(local_md_dir, f"{name_without_suff}_model.pdf")
    infer_result.draw_model(model_pdf_path)
    
    # 5. Get model inference result
    model_inference_result = infer_result.get_infer_res()
    
    # 6. Draw layout result on each page
    layout_pdf_path = os.path.join(local_md_dir, f"{name_without_suff}_layout.pdf")
    pipe_result.draw_layout(layout_pdf_path)
    
    # 7. Draw spans result on each page
    spans_pdf_path = os.path.join(local_md_dir, f"{name_without_suff}_spans.pdf")
    pipe_result.draw_span(spans_pdf_path)
    
    # 8. Get markdown content
    md_content = pipe_result.get_markdown(image_dir)
    
    # 9. Dump markdown
    md_file_path = f"{name_without_suff}.md"
    pipe_result.dump_md(md_writer, md_file_path, image_dir)
    
    # 10. Get content list
    content_list_content = pipe_result.get_content_list(image_dir)
    
    # 11. Dump content list
    content_list_file_path = f"{name_without_suff}_content_list.json"
    pipe_result.dump_content_list(md_writer, content_list_file_path, image_dir)
    
    # 12. Get middle json
    middle_json_content = pipe_result.get_middle_json()
    
    # 13. Dump middle json
    middle_json_file_path = f"{name_without_suff}_middle.json"
    pipe_result.dump_middle_json(md_writer, middle_json_file_path)
    
    # Clean up the temporary file
    os.remove(temp_pdf_path)
    
    # Return organized results
    return JSONResponse(content={
        # Result data
        "data": {
            "pdf_type": "OCR" if pdf_type == SupportedPdfParseMethod.OCR else "Text"
        },
        # File references for accessing generated files
        "relative_paths": {
            "model_pdf": f"/download/{model_pdf_path}",
            "layout_pdf": f"/download/{layout_pdf_path}",
            "spans_pdf": f"/download/{spans_pdf_path}",
            "markdown": f"/download/{os.path.join(local_md_dir, md_file_path)}",
            "content_list": f"/download/{os.path.join(local_md_dir, content_list_file_path)}",
            "middle_json": f"/download/{os.path.join(local_md_dir, middle_json_file_path)}"
        },
    })

@app.get("/download/{file_path:path}")
async def download_file(file_path: str):
    """
    Download a generated file by path.
    """
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(
            path=file_path, 
            filename=os.path.basename(file_path),
            media_type="application/octet-stream"
        )
    return JSONResponse(
        status_code=404, 
        content={"message": f"File not found: {file_path}"}
    )

@app.get("/cleanup/{request_id}")
async def cleanup_files(request_id: str):
    """
    Clean up all files generated for a specific request ID.
    """
    image_dir = f"output/images/{request_id}"
    md_dir = f"output/{request_id}"
    
    files_removed = 0
    
    if os.path.exists(image_dir):
        shutil.rmtree(image_dir)
        files_removed += 1
        
    if os.path.exists(md_dir):
        shutil.rmtree(md_dir)
        files_removed += 1
    
    return JSONResponse(content={"message": f"Cleaned up {files_removed} directories"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)