import requests
import base64

def generate_summaries(images, api_key):
    url = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    summaries = []

    for i in range(1, 5):  # Loop through image1 to image4
        image_file = images.get(f"image{i}")
        
        if not image_file:
            summaries.append(f"Image {i}: No image uploaded.")
            continue

        # Encode image to base64
        encoded_image = base64.b64encode(image_file.read()).decode('utf-8')

        # Construct the correct JSON payload
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "inlineData": {
                                "mimeType": image_file.mimetype,  # Correct MIME type
                                "data": encoded_image
                            }
                        }
                    ]
                }
            ]
        }

        # Make the API request
        response = requests.post(url, headers=headers, json=payload)
        result = response.json()

        # Extract the summary text from API response
        if response.status_code == 200 and "candidates" in result:
            summary_text = result["candidates"][0]["content"]["parts"][0]["text"]  # Extract clean summary
            summaries.append(summary_text)
        else:
            error_message = result.get("error", {}).get("message", "Unknown error")
            summaries.append(f"Error: {response.status_code} - {error_message}")

    return {"summaries": summaries}
