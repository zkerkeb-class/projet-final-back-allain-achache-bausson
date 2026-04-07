from fastapi import FastAPI, File, UploadFile
from fastapi.responses import Response, JSONResponse
from rembg import remove

app = FastAPI()

@app.get('/health')
def health():
    return {'status': 'ok'}

@app.post('/remove-bg')
async def remove_bg(image: UploadFile = File(...)):
    try:
        data = await image.read()
        if not data:
            return JSONResponse({'error': 'Empty file'}, status_code=400)
        result = remove(data)
        return Response(content=result, media_type='image/png')
    except Exception as exc:
        return JSONResponse({'error': str(exc)}, status_code=500)
