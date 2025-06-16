import torch
from PIL import Image
from transformers import CLIPProcessor, CLIPModel

def generate_summary_from_clip_gpt2(image_path: str) -> str:
    """
    Generates a simple but accurate summary of an image using CLIP.
    """
    # Load CLIP model
    clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
    clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    
    # Move to GPU if available
    device = "cuda" if torch.cuda.is_available() else "cpu"
    clip_model = clip_model.to(device)
    
    # Load and process image
    image = Image.open(image_path).convert("RGB")
    
    # Process the image with CLIP
    inputs = clip_processor(images=image, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}
    
    # Basic content categories - small, focused set
    content_categories = [
        "person", "people", "car", "vehicle", "animal", "building", 
        "landscape", "food", "indoor scene", "outdoor scene"
    ]
    
    # Context categories
    context_categories = [
        "at daytime", "at night", "in a city", "in nature",
        "in a formal setting", "in a casual setting"
    ]
    
    # Run multiple classifications for more accuracy
    all_results = []
    
    # Check for main content
    with torch.no_grad():
        # Main content detection
        content_texts = [f"a photo of {item}" for item in content_categories]
        text_inputs = clip_processor(text=content_texts, return_tensors="pt", padding=True).to(device)
        
        image_features = clip_model.get_image_features(**inputs)
        text_features = clip_model.get_text_features(**text_inputs)
        
        image_features = image_features / image_features.norm(dim=-1, keepdim=True)
        text_features = text_features / text_features.norm(dim=-1, keepdim=True)
        
        similarity = (100.0 * image_features @ text_features.T).softmax(dim=-1)
        values, indices = similarity[0].topk(3)
        
        main_content = [content_categories[idx] for idx in indices if values[list(indices).index(idx)] > 0.1]
        
        # Context detection
        context_texts = [f"a photo {item}" for item in context_categories]
        text_inputs = clip_processor(text=context_texts, return_tensors="pt", padding=True).to(device)
        
        text_features = clip_model.get_text_features(**text_inputs)
        text_features = text_features / text_features.norm(dim=-1, keepdim=True)
        
        similarity = (100.0 * image_features @ text_features.T).softmax(dim=-1)
        values, indices = similarity[0].topk(2)
        
        contexts = [context_categories[idx] for idx in indices if values[list(indices).index(idx)] > 0.15]
    
    # Generate a simplified, accurate summary
    summary = "This image shows "
    
    if not main_content:
        summary += "a scene"
    elif len(main_content) == 1:
        summary += f"a {main_content[0]}"
    else:
        summary += f"a {main_content[0]} and a {main_content[1]}"
    
    if contexts:
        summary += f" {contexts[0]}"
    
    summary += "."
    
    return summary