from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import io
from PIL import Image, ImageDraw, ImageFont
import tensorflow as tf
from tensorflow.keras.applications.imagenet_utils import preprocess_input
from fastapi.responses import JSONResponse
import os
from pathlib import Path
import logging
from functools import lru_cache
import torch
from torchvision import models, transforms
# Updated imports for torchcam
from torchcam.methods import CAM, GradCAMpp  # Using GradCAMpp instead of GradCAMPlusPlus
from fastapi.responses import Response
import matplotlib.pyplot as plt
import cv2

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get the directory containing the current file
BASE_DIR = Path(__file__).resolve().parent

# Load environment variables - use os.environ directly instead of dotenv for production
PORT = int(os.environ.get("PORT", "4000"))
APP_URL = os.environ.get("APP_URL", "")
ENV = os.environ.get("ENV", "development")

logger.info(f"PORT: {PORT}")
logger.info(f"APP_URL: {APP_URL}")
logger.info(f"Environment: {ENV}")

app = FastAPI()

# Configure CORS - simplified since both environments use the same config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for models
mobilenet_model = None
yolo_model = None
pytorch_mobilenet = None
gradcam = None

# Image size for model input
IMG_SIZE = 224

# Class indices
class_names = {
    0: 'Brown_Spot',
    1: 'Bacterial_Blight',
    2: 'Leaf_Blight',
    3: 'Sheath_Blight',
    4: 'Tungro'
}

# Colors for different classes
COLORS = {
    'Brown_Spot': (255, 0, 0),        # Red
    'Bacterial_Blight': (0, 255, 0),  # Green
    'Leaf_Blight': (0, 0, 255),        # Blue
    'Sheath_Blight': (255, 255, 0),   # Yellow
    'Tungro': (255, 0, 255)           # Magenta
}

# Load models only once using LRU cache
@lru_cache(maxsize=1)
def get_mobilenet_model():
    model_path = BASE_DIR / "models" / "ResNet50.keras"
    logger.info(f"Loading MobileNet model from: {model_path}")
    
    if not model_path.exists():
        raise FileNotFoundError(f"MobileNet model not found at {model_path}")
    
    try:
        # Set memory growth to avoid OOM errors
        physical_devices = tf.config.list_physical_devices('GPU')
        if physical_devices:
            for device in physical_devices:
                tf.config.experimental.set_memory_growth(device, True)
        
        # Load model with optimization flags
        model = tf.keras.models.load_model(
            str(model_path),
            compile=False  # Faster loading when not training
        )
        # Optimize for inference
        model = tf.function(model, jit_compile=True)
        logger.info("MobileNet model loaded successfully")
        return model
    except Exception as e:
        logger.error(f"Error loading MobileNet model: {str(e)}")
        raise


@lru_cache(maxsize=1)
def get_pytorch_mobilenet():
    logger.info("Loading PyTorch MobileNetV2 model")
    try:
        # Load pre-trained MobileNetV2 model from torchvision
        model = models.mobilenet_v2(weights='DEFAULT')
        model.eval()  # Set model to evaluation mode
        
        # Ensure the model's parameters have requires_grad=True
        for param in model.parameters():
            param.requires_grad = True
            
        logger.info("PyTorch MobileNetV2 model loaded successfully")
        return model
    except Exception as e:
        logger.error(f"Error loading PyTorch MobileNetV2 model: {str(e)}")
        raise


@lru_cache(maxsize=1)
def get_gradcam():
    model = get_pytorch_mobilenet()
    # Updated to use GradCAMpp instead of GradCAMPlusPlus
    # Get the last convolutional layer
    target_layer = 'features.18.0'  # This is the last conv layer in MobileNetV2
    return GradCAMpp(model, target_layer=target_layer)


@lru_cache(maxsize=1)
def get_yolo_model():
    yolo_path = BASE_DIR / "models" / "best.pt"
    logger.info(f"Loading YOLO model from: {yolo_path}")
    
    if not yolo_path.exists():
        raise FileNotFoundError(f"YOLO model not found at {yolo_path}")
    
    try:
        # Import here to avoid loading if not needed
        from ultralytics import YOLO
        model = YOLO(str(yolo_path))
        logger.info("YOLO model loaded successfully")
        return model
    except Exception as e:
        logger.error(f"Error loading YOLO model: {str(e)}")
        raise


# Preprocess function for PyTorch model
preprocess = transforms.Compose([
    transforms.Resize(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

def apply_gradcam(image: Image.Image):
    # Ensure image is in RGB format
    if image.mode == 'RGBA':
        image = image.convert('RGB')
        
    # Preprocess the image
    input_tensor = preprocess(image).unsqueeze(0)  # Add batch dimension
    
    # Enable gradients for the input tensor
    input_tensor.requires_grad = True
    
    # Get the model
    model = get_pytorch_mobilenet()
    
    # Create a simpler implementation of Grad-CAM
    # Get the last convolutional layer
    last_conv_layer = model.features[-1][0]  # Last conv layer in MobileNetV2
    
    # Forward pass
    model.eval()
    
    # Register hooks for the gradients
    activations = None
    gradients = None
    
    def save_activation(module, input, output):
        nonlocal activations
        activations = output
    
    def save_gradient(grad):
        nonlocal gradients
        gradients = grad
    
    # Register forward hook to get activations
    handle = last_conv_layer.register_forward_hook(save_activation)
    
    # Forward pass
    output = model(input_tensor)
    
    # Get the predicted class
    pred_class = output.argmax(dim=1).item()
    
    # Clear any previous gradients
    model.zero_grad()
    
    # Create a one-hot encoding for the predicted class
    one_hot = torch.zeros_like(output)
    one_hot[0, pred_class] = 1
    
    # Register backward hook to get gradients
    if activations is not None:
        activations.register_hook(save_gradient)
    
    # Backward pass
    output.backward(gradient=one_hot)
    
    # Remove the hook
    handle.remove()
    
    # Get the gradients and activations
    if gradients is None or activations is None:
        # Fallback if hooks didn't work
        logger.warning("Gradients or activations are None, returning original image")
        return image
    
    # Calculate weights (global average pooling of gradients)
    weights = gradients.mean(dim=(2, 3), keepdim=True)
    
    # Apply weights to activations
    cam = torch.sum(weights * activations, dim=1, keepdim=True)
    
    # Apply ReLU to the CAM
    cam = torch.relu(cam)
    
    # Normalize the CAM
    if torch.max(cam) > 0:
        cam = cam / torch.max(cam)
    
    # Resize CAM to match input image size
    cam = cam.squeeze().detach().cpu().numpy()
    cam = np.uint8(255 * cam)
    
    # Resize to match original image dimensions
    cam_pil = Image.fromarray(cam).resize((image.width, image.height), Image.BICUBIC)
    cam_np = np.array(cam_pil)
    
    # Apply colormap
    cmap = plt.get_cmap('jet')
    cam_colored = cmap(cam_np)[:, :, :3]  # Remove alpha channel
    cam_colored = np.uint8(255 * cam_colored)
    
    # Convert original image to numpy array
    img_np = np.array(image)
    
    # Ensure dimensions match for overlay
    if img_np.ndim > 2 and img_np.shape[2] == 4:  # If image has alpha channel
        img_np = img_np[:, :, :3]  # Remove alpha channel
    
    # Resize cam_colored if dimensions don't match
    if img_np.shape[:2] != cam_colored.shape[:2]:
        cam_colored = np.array(Image.fromarray(cam_colored).resize((img_np.shape[1], img_np.shape[0])))
    
    # Overlay heatmap on original image
    overlay = 0.7 * img_np + 0.3 * cam_colored
    overlay = np.uint8(overlay)
    
    # Convert back to PIL Image
    result_image = Image.fromarray(overlay)
    
    return result_image
# Preload models on startup
@app.on_event("startup")
async def startup_event():
    try:
        # Preload models in background
        get_mobilenet_model()
        get_yolo_model()
        get_pytorch_mobilenet()
        get_gradcam()
        logger.info("Models preloaded successfully")
    except Exception as e:
        logger.error(f"Failed to preload models: {str(e)}")


@app.get("/")
async def root():
    return {"message": "Image Detection API"}


@app.post("/detect")
async def detect_image(file: UploadFile = File(...)):
    try:
        # Read image data
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # Ensure image is in RGB format (convert from RGBA if needed)
        if image.mode == 'RGBA':
            image = image.convert('RGB')
        
        # Get models (cached)
        yolo_model = get_yolo_model()
        mobilenet_model = get_mobilenet_model()
        
        # Process with YOLO model for object detection
        # Use lower resolution for faster processing
        yolo_results = yolo_model(image, verbose=False)
        
        # Extract YOLO detections more efficiently
        yolo_detections = []
        for result in yolo_results:
            boxes = result.boxes
            for i in range(len(boxes)):
                x1, y1, x2, y2 = boxes.xyxy[i].tolist()
                conf = boxes.conf[i].item()
                cls = boxes.cls[i].item()
                class_name = result.names[int(cls)]
                
                yolo_detections.append({
                    "box": [float(x1), float(y1), float(x2), float(y2)],
                    "confidence": float(conf),
                    "class": int(cls),
                    "class_name": class_name
                })
        
        # Process with MobileNet model for disease classification
        # Resize image to match training size
        mobilenet_img = image.resize((IMG_SIZE, IMG_SIZE))
        
        # Convert to array and preprocess more efficiently
        mobilenet_img = np.array(mobilenet_img, dtype=np.float32)
        
        # Ensure we have only 3 channels (RGB)
        if mobilenet_img.shape[-1] == 4:  # If RGBA
            mobilenet_img = mobilenet_img[:, :, :3]  # Take only RGB channels
        
        mobilenet_img = np.expand_dims(mobilenet_img, axis=0)
        mobilenet_img = preprocess_input(mobilenet_img)
        
        # Get MobileNet predictions with optimized batch size
        mobilenet_predictions = mobilenet_model(mobilenet_img, training=False).numpy()[0]
        
        # Get the predicted class index and confidence
        mobilenet_class_id = np.argmax(mobilenet_predictions)
        mobilenet_confidence = float(mobilenet_predictions[mobilenet_class_id])
        
        # Get class name from index
        mobilenet_class_name = class_names.get(
            mobilenet_class_id, 
            f"Unknown class index: {mobilenet_class_id}"
        )
        
        # Prepare result
        combined_result = {
            "yolo_detections": yolo_detections,
            "mobilenet_classification": {
                "class_id": int(mobilenet_class_id),
                "class_name": mobilenet_class_name,
                "confidence": mobilenet_confidence
            }
        }
        
        return JSONResponse(content=combined_result)
    
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing image: {str(e)}"
        )  # Add this import at the top of your file

@app.post("/detect_with_gradcam")
async def detect_image_with_gradcam(file: UploadFile = File(...)):
    try:
        # Read image data
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # Ensure image is in RGB format
        if image.mode == 'RGBA':
            image = image.convert('RGB')
        
        # Apply Grad-CAM++ to the image
        result_image = apply_gradcam(image)
        
        # Convert result to bytes to return
        buffered = io.BytesIO()
        result_image.save(buffered, format="JPEG")
        result_image_data = buffered.getvalue()

        # Return the image with Grad-CAM++ overlay
        return Response(
            content=result_image_data,
            media_type="image/jpeg"
        )
    
    except Exception as e:
        logger.error(f"Error processing image with Grad-CAM++: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error processing image with Grad-CAM++: {str(e)}"
        )

@app.post("/detect_with_boxes")
async def detect_image_with_boxes(file: UploadFile = File(...)):
    try:
        # Read image data
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # Ensure image is in RGB format
        if image.mode == 'RGBA':
            image = image.convert('RGB')
        
        # Get the YOLO model and perform detection
        yolo_model = get_yolo_model()
        yolo_results = yolo_model(image, verbose=False)
        
        # Draw the bounding boxes directly on the image
        annotated_image = yolo_results[0].plot()
        
        # Convert the annotated image to bytes
        buffered = io.BytesIO()
        # Convert numpy array to PIL Image first
        Image.fromarray(annotated_image).save(buffered, format="JPEG")
        annotated_image_data = buffered.getvalue()
        
        # Return the image with YOLO detection boxes
        return Response(
            content=annotated_image_data,
            media_type="image/jpeg"
        )
    
    except Exception as e:
        logger.error(f"Error processing image with YOLO boxes: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error processing image with YOLO boxes: {str(e)}"
        )

@app.post("/detect_with_combined_heatmap")
async def detect_with_combined_heatmap(file: UploadFile = File(...)):
    try:
        # Read image data
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        
        # Get models
        yolo_model = get_yolo_model()
        mobilenet_model = get_mobilenet_model()  # Assuming this is your ResNet50 model
        
        # Process with YOLO model for object detection
        yolo_results = yolo_model(image, verbose=False)
        
        # Extract bounding boxes
        detected_boxes = []
        for result in yolo_results:
            boxes = result.boxes
            for i in range(len(boxes)):
                x1, y1, x2, y2 = boxes.xyxy[i].tolist()
                detected_boxes.append([int(x1), int(y1), int(x2), int(y2)])
        
        # Check if any boxes were detected
        if not detected_boxes:
            return JSONResponse(content={"message": "No disease detected, heatmap not generated."}, status_code=400)

        # Create a blank image for the heatmap
        heatmap = np.zeros((image.height, image.width), dtype=np.float32)

        # Apply ResNet50 to each detected box to generate heatmaps
        for box in detected_boxes:
            x1, y1, x2, y2 = box
            # Crop region
            region = image.crop((x1, y1, x2, y2))
            # Preprocess the region for ResNet50
            region_resized = region.resize((IMG_SIZE, IMG_SIZE))
            input_tensor = preprocess(np.array(region_resized)).unsqueeze(0)  # Add batch dimension
            
            # Get the model
            model = get_mobilenet_model()
            model.eval()
            
            # Forward pass to get features
            with torch.no_grad():
                features = model(input_tensor)
            
            # Generate heatmap from features (you can implement your own logic here)
            # For example, using Grad-CAM or similar methods
            region_heatmap = apply_gradcam(region)  # Assuming apply_gradcam is defined to use ResNet50
            
            # Resize heatmap to match the bounding box size
            region_heatmap_resized = np.array(
                Image.fromarray(region_heatmap).resize((x2 - x1, y2 - y1))
            )

            # Add the region heatmap to the overall heatmap
            heatmap[y1:y2, x1:x2] += region_heatmap_resized

        # Normalize the heatmap
        heatmap = np.clip(heatmap, 0, 255)
        heatmap = (heatmap / np.max(heatmap) * 255).astype(np.uint8)

        # Convert heatmap to PIL Image
        heatmap_image = Image.fromarray(heatmap)

        # Overlay the heatmap on the original image
        overlay = Image.blend(image, heatmap_image.convert("RGB"), alpha=0.5)  # Adjust alpha for blending

        # Convert result to bytes
        buffered = io.BytesIO()
        overlay.save(buffered, format="JPEG")
        overlay_image_data = buffered.getvalue()
        
        # Return the overlay image
        return Response(
            content=overlay_image_data,
            media_type="image/jpeg"
        )
    
    except Exception as e:
        logger.error(f"Error creating combined detection and heatmap: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error creating combined detection and heatmap: {str(e)}"
        )