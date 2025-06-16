from transformers import BlipProcessor, BlipForConditionalGeneration
from PIL import Image
import torch
import os

# Global model instances (loaded only once)
_processor = None
_model = None

def get_blip_model():
    """
    Returns singleton instances of the BLIP model and processor.
    This ensures we only load the model once.
    """
    global _processor, _model
    
    if _processor is None or _model is None:
        print("🔄 Loading BLIP model (this may take a moment)...")
        _processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
        _model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
        print("✅ BLIP model loaded successfully!")
    
    return _processor, _model

def summarize_image(image_path: str) -> str:
    """
    Generates a caption/summary for the given image using BLIP.
    :param image_path: Path to the image file.
    :return: Generated caption as a string.
    """
    try:
        # Get singleton model instances
        processor, model = get_blip_model()
        
        # Check if file exists
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image file not found: {image_path}")
        
        # Load and process the image
        image = Image.open(image_path).convert("RGB")
        inputs = processor(images=image, return_tensors="pt")
        
        # Generate caption
        with torch.no_grad():
            output = model.generate(**inputs)
        caption = processor.decode(output[0], skip_special_tokens=True)
        
        return caption
    except Exception as e:
        print(f"❌ Error in BLIP summarization: {str(e)}")
        raise Exception(f"BLIP summarization failed: {str(e)}")

# Example usage
if __name__ == "__main__":
    image_path = "sample.jpg"  # Replace with actual image path
    summary = summarize_image(image_path)
    print("Generated Summary:", summary)