from transformers import GitProcessor, GitForCausalLM
from PIL import Image
import torch

def load_git_model():
    """Load the GIT model and processor."""
    processor = GitProcessor.from_pretrained("microsoft/git-large-coco")
    model = GitForCausalLM.from_pretrained("microsoft/git-large-coco")
    return processor, model

def summarize_with_git(image_path):
    """Generate an image summary using GIT."""
    processor, model = load_git_model()
    image = Image.open(image_path).convert("RGB")
    
    inputs = processor(images=image, return_tensors="pt")
    generated_ids = model.generate(pixel_values=inputs.pixel_values, max_length=50)
    summary = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
    
    return summary
