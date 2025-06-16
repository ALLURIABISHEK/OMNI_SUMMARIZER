import warnings
import logging
import os
from transformers import VisionEncoderDecoderModel, ViTImageProcessor, AutoTokenizer
import torch
from PIL import Image

# Suppress specific warnings related to use_fast
warnings.filterwarnings("ignore", category=UserWarning, message=".*use_fast=True.*")

# Suppress logs from transformers
logging.getLogger("transformers").setLevel(logging.ERROR)

# Suppress specific warnings related to missing attention mask and token configurations
warnings.filterwarnings("ignore", category=UserWarning, message=".*attention mask is not set.*")
warnings.filterwarnings("ignore", category=UserWarning, message=".*Config of the encoder:.*")
warnings.filterwarnings("ignore", category=UserWarning, message=".*Config of the decoder:.*")

# Global model instances (loaded only once)
_model = None
_feature_extractor = None
_tokenizer = None

def get_vit_model():
    """
    Returns singleton instances of the ViT-GPT2 model components.
    This ensures we only load the model once.
    """
    global _model, _feature_extractor, _tokenizer
    
    if _model is None or _feature_extractor is None or _tokenizer is None:
        print("🔄 Loading ViT-GPT2 model (this may take a moment)...")
        model_name = "nlpconnect/vit-gpt2-image-captioning"
        _model = VisionEncoderDecoderModel.from_pretrained(model_name)
        _feature_extractor = ViTImageProcessor.from_pretrained(model_name)
        _tokenizer = AutoTokenizer.from_pretrained(model_name)
        print("✅ ViT-GPT2 model loaded successfully!")
    
    return _model, _feature_extractor, _tokenizer

def vit_summarize(image_path):
    """Generate a summary for an image using ViT-GPT2."""
    try:
        # Check if file exists
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image file not found: {image_path}")
            
        # Get singleton model instances
        model, feature_extractor, tokenizer = get_vit_model()
        
        # Load and preprocess the image
        image = Image.open(image_path).convert("RGB")
        pixel_values = feature_extractor(images=image, return_tensors="pt").pixel_values
        
        # Generate the summary
        with torch.no_grad():
            output_ids = model.generate(pixel_values, max_length=50, num_beams=4)
        
        summary = tokenizer.decode(output_ids[0], skip_special_tokens=True)
        return summary
        
    except Exception as e:
        print(f"❌ Error in ViT-GPT2 summarization: {str(e)}")
        raise Exception(f"ViT-GPT2 summarization failed: {str(e)}")

if __name__ == "__main__":
    test_image = "test.jpg"  # Replace with an actual image path for testing
    print(vit_summarize(test_image))