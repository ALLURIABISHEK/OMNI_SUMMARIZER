document.addEventListener("DOMContentLoaded", function () {
    const fileInput = document.getElementById("fileInput");
    const uploadBox = document.getElementById("uploadBox");
    const previewContainer = document.getElementById("imagePreviewContainer");
    const previewImage = document.getElementById("previewImage");
    const summarizeBtn = document.getElementById("summarizeBtn");
    const captionBtn = document.getElementById("captionBtn");
    const askQuestionBtn = document.getElementById("askQuestionBtn");
    const questionInput = document.getElementById("questionInput");
    const summaryContainer = document.getElementById("summaryContainer");

    let uploadedImageFile = null;

    // Handle File Upload (Click + Drag & Drop)
    uploadBox.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", function () {
        handleFileUpload(fileInput.files[0]);
    });

    uploadBox.addEventListener("dragover", (event) => {
        event.preventDefault();
        uploadBox.style.border = "2px solid #007bff";
    });

    uploadBox.addEventListener("dragleave", () => {
        uploadBox.style.border = "2px dashed #555";
    });

    uploadBox.addEventListener("drop", (event) => {
        event.preventDefault();
        uploadBox.style.border = "2px dashed #555";
        handleFileUpload(event.dataTransfer.files[0]);
    });

    function handleFileUpload(file) {
        if (!file) return;

        uploadedImageFile = file;
        const reader = new FileReader();
        reader.onload = function (e) {
            previewImage.src = e.target.result;
            previewContainer.classList.remove("hidden");
        };
        reader.readAsDataURL(file);
    }

    /*LIVE CAM */
    //live cam summary 
    const liveCamBtn = document.getElementById('livecamBtn');
    const video = document.getElementById('cameraStream');
    const canvas = document.getElementById('cameraCanvas');
    const captureBtn = document.getElementById('captureBtn');
    const previewText = document.getElementById('previewText'); 
   
    let stream;

    liveCamBtn.addEventListener('click', async () => {
        try {
            // Hide preview text and clear any previous image
            if (previewText) previewText.style.display = 'none';
            previewImage.src = '';
            
            // Start camera
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            video.classList.remove('hidden');
            captureBtn.classList.remove('hidden');
        } catch (error) {
            alert('Error accessing camera: ' + error.message);
        }
    });
    
    captureBtn.addEventListener('click', () => {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to canvas
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
        // Stop the camera and hide video/capture button
        stream.getTracks().forEach(track => track.stop());
        video.classList.add('hidden');
        captureBtn.classList.add('hidden');
    
        // Get image as base64
        const imageData = canvas.toDataURL('image/png');
        
        // Display in preview box
        previewImage.src = imageData;
        previewContainer.classList.remove('hidden');
    
        // Convert to File object
        function dataURLtoFile(dataurl, filename) {
            let arr = dataurl.split(','), 
                mime = arr[0].match(/:(.*?);/)[1],
                bstr = atob(arr[1]), 
                n = bstr.length, 
                u8arr = new Uint8Array(n);
                
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new File([u8arr], filename, { type: mime });
        }
    
        uploadedImageFile = dataURLtoFile(imageData, 'captured_image.png');
    
        // Optional: Send to backend
        fetch('/summarize-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: imageData }),
        })
        .then(response => response.json())
        .then(data => {
            console.log("Summary:", data.summary);
            // Display summary somewhere on the page
        })
        .catch(err => console.error('Error:', err));
    });

    //live cam end

    // Event Listeners for Buttons
    summarizeBtn.addEventListener("click", function () {
        fetchResult("/summarize");
    });

    captionBtn.addEventListener("click", function () {
        fetchResult("/generate_caption");
    });

    askQuestionBtn.addEventListener("click", function () {
        if (!uploadedImageFile) {
            alert("Please upload an image first.");
            return;
        }
        questionInput.classList.remove("hidden");
        questionInput.focus();
    });

    questionInput.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            fetchResult("/ask_question", questionInput.value);
            questionInput.value = ""; // Clear input after asking
        }
    });

    function fetchResult(endpoint, question = "") {
        if (!uploadedImageFile) {
            alert("Please upload an image first.");
            return;
        }

        const formData = new FormData();
        formData.append("file", uploadedImageFile);
        if (question) formData.append("question", question);

        fetch(endpoint, { method: "POST", body: formData })
            .then(response => response.json())
            .then(data => {
                if (data.result) {
                    let newResult = document.createElement("div");

                    if (endpoint === "/summarize") {
                        newResult.innerHTML = `<strong>📄 Summary:</strong> <br>${data.result}`;
                    } else if (endpoint === "/generate_caption") {
                        newResult.innerHTML = `<strong>🖼️ Captions:</strong>`;
                        let captionsList = document.createElement("ul");

                        let captions = data.result.split("\n") // Split by new lines
                            .map(caption => caption.trim()) // Remove extra spaces
                            .filter(caption => caption && !caption.toLowerCase().includes("choose the caption")); // Remove empty lines & unwanted phrases

                        // Limit captions to 5-10
                        captions = captions.slice(0, 10);

                        captions.forEach((caption, index) => {
                            let listItem = document.createElement("li");
                            listItem.innerText = `Option ${index + 1}: ${caption}`;
                            captionsList.appendChild(listItem);
                        });

                        newResult.appendChild(captionsList);
                    } else if (endpoint === "/ask_question") {
                        newResult.innerHTML = `<strong>❓ Q:</strong> ${question} <br> <strong>💡 A:</strong> ${data.result}`;
                    }

                    summaryContainer.appendChild(newResult);
                    summaryContainer.style.display = "flex";
                } else {
                    let errorMsg = document.createElement("p");
                    errorMsg.innerText = "❌ Failed to generate response.";
                    summaryContainer.appendChild(errorMsg);
                }
            })
            .catch(error => {
                console.error("Error:", error);
                let errorMsg = document.createElement("p");
                errorMsg.innerText = "⚠️ Error fetching response.";
                summaryContainer.appendChild(errorMsg);
            });
    }
});

function copySummary() {
    const text = document.getElementById("summaryText").innerText;
    navigator.clipboard.writeText(text);
    alert("Summary copied to clipboard!");
}

//DRAG BOXES CODE ==========================================================================//
// Object to store selected images
const selectedImages = {};

// Select all upload boxes
document.querySelectorAll('.story-upload-box').forEach((box, index) => {
    const fileInput = document.getElementById(`fileInput${index + 1}`);

    // Handle click to trigger file input
    box.addEventListener('click', () => fileInput.click());

    // Handle dragover effect (highlight border)
    box.addEventListener('dragover', (e) => {
        e.preventDefault();
        box.style.borderColor = "#00FFFF";
    });

    // Reset style when drag leaves
    box.addEventListener('dragleave', () => {
        box.style.borderColor = "#555";
    });

    // Handle file drop
    box.addEventListener('drop', (e) => {
        e.preventDefault();
        fileInput.files = e.dataTransfer.files;
        handleFileUpload(fileInput, box, index + 1);
        box.style.borderColor = "#555";
    });

    // Handle file input change (when clicked)
    fileInput.addEventListener('change', () => handleFileUpload(fileInput, box, index + 1));
});

// Function to display image preview and store image
function handleFileUpload(input, box, index) {
    const file = input.files[0];

    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();

        reader.onload = function (e) {
            // Clear the box and set the image preview
            box.innerHTML = "";

            const img = document.createElement("img");
            img.src = e.target.result;
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "cover";
            img.style.borderRadius = "10px";

            box.appendChild(img);

            // Store the file
            selectedImages[index] = file;
        };

        reader.readAsDataURL(file);
    } else {
        box.innerHTML = "Drag & Drop File";
    }
}

// Handle button click to send images to backend
document.getElementById("generatesumm").addEventListener("click", () => {
    // Ensure all 4 images are uploaded
    if (Object.keys(selectedImages).length !== 4) {
        alert("Please upload all 4 images before generating a story.");
        return;
    }

    // Create FormData to send images
    const formData = new FormData();
    let count = 1; // Start from 1 to match Flask keys (image1, image2, etc.)
    Object.keys(selectedImages).forEach(index => {
        formData.append(`image${count}`, selectedImages[index]);
        count++;
    });

    // FIX: Updated port to 5001
    // Send request to backend
    fetch("/generate_summaries", {
        method: "POST",
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("Server error: " + response.status);
        }
        return response.json();
    })
    .then(data => {
        console.log("API Response:", data); // Debugging output
        
        if (!data.summaries || typeof data.summaries !== 'object') {
            throw new Error("Invalid response format.");
        }

        const summariesArray = [];
        Object.values(data.summaries).forEach(summary => {
            if (typeof summary === 'object') {
                summary = JSON.stringify(summary, null, 2); // Convert object to readable string
            }
            summariesArray.push(summary);
        });

        // FIX: Updated port to 5001
        // Send summaries to backend to generate story
        return fetch("/generate_story", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ summaries: summariesArray })
        });
    })
    .then(response => response.json())
    .then(storyData => {
        if (storyData.error) {
            throw new Error(storyData.error);
        }
        
        const textContainer = document.getElementById("Text");
        textContainer.innerHTML = `<h3>Generated Story:</h3><p>${storyData.story}</p>`;
    })
    .catch(error => {
        console.error("Error:", error);
        alert("An error occurred while generating the story: " + error.message);
    });
});

//==============================================================================================================//

//MULTI-MODEL COMPARISON
document.addEventListener("DOMContentLoaded", function () {
    console.log("JS Loaded!");

    // Safely get elements with error checking
    const fileInput = document.getElementById("fileInput5");
    const blipButton = document.getElementById("blip");
    const resultContainer = document.getElementById("multi-Container");
    
    // Only proceed if all elements exist
    if (fileInput && blipButton && resultContainer) {
        blipButton.addEventListener("click", function () {
            console.log("BLIP Button Clicked!");

            const file = fileInput.files[0];
            if (!file) {
                alert("Please upload an image first.");
                return;
            }

            const formData = new FormData();
            formData.append("file", file);

            console.log("Sending request to Flask...");
            
            // Add loading indicator
            const loadingDiv = document.createElement("div");
            loadingDiv.classList.add("summary-box");
            loadingDiv.innerHTML = "<strong>BLIP Model:</strong> Processing...";
            resultContainer.appendChild(loadingDiv);

            fetch("/blip_summarize", {
                method: "POST",
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Response received:", data);
                
                // Remove loading indicator
                resultContainer.removeChild(loadingDiv);
                
                const summaryDiv = document.createElement("div");
                summaryDiv.classList.add("summary-box");
                summaryDiv.innerHTML = `<strong>BLIP Model:</strong> ${data.result || "Failed to generate summary."}`;

                resultContainer.appendChild(summaryDiv);
                resultContainer.scrollTop = resultContainer.scrollHeight;
            })
            .catch(error => {
                console.error("Error:", error);
                
                // Handle the error case properly
                try {
                    // Try to remove loading indicator if it exists
                    resultContainer.removeChild(loadingDiv);
                } catch (e) {
                    // Ignore if not found
                }
                
                const errorDiv = document.createElement("div");
                errorDiv.classList.add("summary-box");
                errorDiv.style.color = "red";
                errorDiv.innerHTML = `<strong>BLIP Model Error:</strong> ${error.message}`;
                resultContainer.appendChild(errorDiv);
            });
        });
    } else {
        // Log which elements are missing for debugging
        if (!fileInput) console.error("Missing element: fileInput5");
        if (!blipButton) console.error("Missing element: blip");
        if (!resultContainer) console.error("Missing element: multi-Container");
    }
});
//=================================multi-model in GEMINI ================================
document.addEventListener("DOMContentLoaded", function () {
    console.log("Gemini JS Loaded!");

    const fileInput = document.getElementById("fileInput5");
    const multigemini = document.getElementById("gemini");
    const resultContainer = document.getElementById("multi-Container");

    if (!fileInput || !multigemini || !resultContainer) {
        console.error("Error: Missing HTML elements for Gemini. Check IDs.");
        return;
    }

    multigemini.addEventListener("click", async function () {
        if (fileInput.files.length === 0) {
            alert("Please upload an image first.");
            return;
        }

        const formData = new FormData();
        formData.append("file", fileInput.files[0]);

        console.log("Sending request to /summarize...");

        try {
            // FIX: Removed hardcoded URL/port
            const response = await fetch("/summarize", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                console.log("Summary:", data.result);

                const summaryDiv = document.createElement("div");
                summaryDiv.classList.add("summary-box");
                summaryDiv.innerHTML = `<strong>Gemini Model:</strong> ${data.result || "Summary not available."}`;

                resultContainer.appendChild(summaryDiv);
                resultContainer.scrollTop = resultContainer.scrollHeight;
            } else {
                console.error("Server Error:", data.error);
                alert("Server Error: " + (data.error || "Unknown error"));
            }
        } catch (error) {
            console.error("Request Failed:", error);
            alert("Request Failed: " + error);
        }
    });
});

//=====================================vit-gpt4=============================
document.addEventListener('DOMContentLoaded', function() {
    // Check if the vit button exists before adding event listener
    const vitButton = document.getElementById("vit");
    const fileInput = document.getElementById("fileInput5");
    const resultContainer = document.getElementById("multi-Container");
    
    if (vitButton && fileInput && resultContainer) {
        vitButton.addEventListener("click", function () {
            console.log("VIT-GPT Button Clicked!");
            
            if (!fileInput.files[0]) {
                alert("Please upload an image first.");
                return;
            }
            
            // Add loading indicator
            const loadingDiv = document.createElement("div");
            loadingDiv.classList.add("summary-box");
            loadingDiv.innerHTML = "<strong>ViT-GPT Model:</strong> Processing... (this may take a moment)";
            resultContainer.appendChild(loadingDiv);
            
            // Create form data
            let formData = new FormData();
            formData.append("file", fileInput.files[0]);
            
            console.log("Sending request to /vit_summarize...");
            
            // Send to backend with better error handling
            fetch("/vit_summarize", {
                method: "POST",
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("VIT-GPT Response received:", data);
                
                // Remove loading indicator
                resultContainer.removeChild(loadingDiv);
                
                // Create and add result
                let summaryDiv = document.createElement("div");
                summaryDiv.classList.add("summary-box");
                summaryDiv.innerHTML = `<strong>ViT-GPT Summary:</strong> ${data.result || "No summary generated."}`;
                resultContainer.appendChild(summaryDiv);
                resultContainer.scrollTop = resultContainer.scrollHeight;
            })
            .catch(error => {
                console.error("Error with VIT-GPT:", error);
                
                // Try to remove loading indicator
                try {
                    resultContainer.removeChild(loadingDiv);
                } catch (e) {
                    // Ignore if already removed
                }
                
                // Show error message
                let errorDiv = document.createElement("div");
                errorDiv.classList.add("summary-box");
                errorDiv.style.color = "red";
                errorDiv.innerHTML = `<strong>ViT-GPT Error:</strong> ${error.message}`;
                resultContainer.appendChild(errorDiv);
            });
        });
        
        console.log("VIT-GPT handler initialized successfully");
    } else {
        // Log which elements are missing
        if (!vitButton) console.error("Missing element: vit button");
        if (!fileInput) console.error("Missing element: fileInput5");
        if (!resultContainer) console.error("Missing element: multi-Container");
    }
});
// Make sure this code is inside a DOMContentLoaded event handler
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
document.addEventListener('DOMContentLoaded', function() {
    // Check if the clip_gpt2 button exists before adding event listener
    const clipGpt2Button = document.getElementById("t5"); // Reusing the llava button ID
    const fileInput = document.getElementById("fileInput5");
    const resultContainer = document.getElementById("multi-Container");
    
    if (clipGpt2Button && fileInput && resultContainer) {
        clipGpt2Button.addEventListener("click", function () {
            console.log("CLIP+GPT2 Model Button Clicked!");
            
            if (!fileInput.files[0]) {
                alert("Please upload an image first.");
                return;
            }
            
            // Add loading indicator
            const loadingDiv = document.createElement("div");
            loadingDiv.classList.add("summary-box");
            loadingDiv.innerHTML = "<strong>CLIP+GPT2 Model:</strong> Processing... (this may take a moment)";
            resultContainer.appendChild(loadingDiv);
            
            // Create form data
            let formData = new FormData();
            formData.append("file", fileInput.files[0]);
            
            console.log("Sending request to /generate_summary_from_clip_gpt2...");
            
            // Send to backend with better error handling
            fetch("/generate_summary_from_clip_gpt2", {
                method: "POST",
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("CLIP+GPT2 Model Response received:", data);
                
                // Remove loading indicator
                resultContainer.removeChild(loadingDiv);
                
                // Create and add result
                let summaryDiv = document.createElement("div");
                summaryDiv.classList.add("summary-box");
                summaryDiv.innerHTML = `<strong>CLIP+GPT2 Summary:</strong> ${data.result || "No summary generated."}`;
                resultContainer.appendChild(summaryDiv);
                resultContainer.scrollTop = resultContainer.scrollHeight;
            })
            .catch(error => {
                console.error("Error with CLIP+GPT2 Model:", error);
                
                // Try to remove loading indicator
                try {
                    resultContainer.removeChild(loadingDiv);
                } catch (e) {
                    // Ignore if already removed
                }
                
                // Show error message
                let errorDiv = document.createElement("div");
                errorDiv.classList.add("summary-box");
                errorDiv.style.color = "red";
                errorDiv.innerHTML = `<strong>CLIP+GPT2 Model Error:</strong> ${error.message}`;
                resultContainer.appendChild(errorDiv);
            });
        });
        
        console.log("CLIP+GPT2 Model handler initialized successfully");
    } else {
        // Log which elements are missing
        if (!clipGpt2Button) console.error("Missing element: llava button (for CLIP+GPT2)");
        if (!fileInput) console.error("Missing element: fileInput5");
        if (!resultContainer) console.error("Missing element: multi-Container");
    }
});
//=====================================All-in-One Summary=============================
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("allin").addEventListener("click", function () {

        const fileInputElement = document.getElementById("fileInput");  // Get file input by ID

        if (!fileInputElement) {
            console.error("File input with ID 'fileInput5' not found");
            alert("Error: Upload box not found");
            return;
        }

        if (!fileInputElement.files || fileInputElement.files.length === 0) {
            alert("Please upload an image first.");
            return;
        }

        const fileInput = fileInputElement.files[0];
        const resultContainer = document.getElementById("multi-Container");

        if (!resultContainer) {
            console.error("Result container with ID 'multi-Container' not found");
            alert("Error: Result container not found");
            return;
        }

        resultContainer.innerHTML = "";

        const endpoints = [
            { url: "/blip_summarize", name: "BLIP" },
            { url: "/summarize", name: "Gemini" },
            { url: "/vit_summarize", name: "ViT-GPT" },
            { url: "/git_summarize", name: "GIT" },
            { url: "/generate_summary_from_clip_gpt2", name: "CLIP+GPT2" }
        ];

        endpoints.forEach(endpoint => {
            let loadingDiv = document.createElement("div");
            loadingDiv.classList.add("summary-box", "loading-" + endpoint.name.toLowerCase().replace(/\+/g, "plus"));
            loadingDiv.innerHTML = `<strong>${endpoint.name} Model:</strong> Processing... (this may take a moment)`;
            resultContainer.appendChild(loadingDiv);
        });

        endpoints.forEach(endpoint => {
            const startTime = performance.now();
            const clonedFormData = new FormData();
            clonedFormData.append("file", fileInput);

            fetch(endpoint.url, {
                method: "POST",
                body: clonedFormData
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`${endpoint.name} request failed with status ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    const endTime = performance.now();
                    const processingTime = ((endTime - startTime) / 1000).toFixed(2);

                    const loadingDiv = document.querySelector(`.loading-${endpoint.name.toLowerCase().replace(/\+/g, "plus")}`);
                    if (loadingDiv) {
                        let summaryDiv = document.createElement("div");
                        summaryDiv.classList.add("summary-box");
                        summaryDiv.innerHTML = `<strong>${endpoint.name} Model:</strong> ${data.result || "No summary generated."} <span style="color: #666; font-size: 0.85em;">(${processingTime} seconds)</span>`;
                        resultContainer.replaceChild(summaryDiv, loadingDiv);
                    }
                })
                .catch(error => {
                    console.error(`Error with ${endpoint.name}:`, error);
                    const endTime = performance.now();
                    const processingTime = ((endTime - startTime) / 1000).toFixed(2);

                    const loadingDiv = document.querySelector(`.loading-${endpoint.name.toLowerCase().replace(/\+/g, "plus")}`);
                    if (loadingDiv) {
                        let errorDiv = document.createElement("div");
                        errorDiv.classList.add("summary-box");
                        errorDiv.style.color = "red";
                        errorDiv.innerHTML = `<strong>${endpoint.name} Model Error:</strong> ${error.message} <span style="color: #666; font-size: 0.85em;">(${processingTime} seconds)</span>`;
                        resultContainer.replaceChild(errorDiv, loadingDiv);
                    }
                });
        });
    });
});


// Function to copy the summary (merge this if a copy function already exists)
function copySummary() {
    let container = document.getElementById("multi-Container");
    let text = container.innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert("Summaries copied!");
    }).catch(err => {
        console.error("Copy failed:", err);
    });
}



/////////////////////////git model -=========================

document.addEventListener('DOMContentLoaded', function() {
    // Check if the git button exists before adding event listener
    const gitButton = document.getElementById("git");
    const fileInput = document.getElementById("fileInput5");
    const resultContainer = document.getElementById("multi-Container");
    
    if (gitButton && fileInput && resultContainer) {
        gitButton.addEventListener("click", function () {
            console.log("GIT Model Button Clicked!");
            
            if (!fileInput.files[0]) {
                alert("Please upload an image first.");
                return;
            }
            
            // Add loading indicator
            const loadingDiv = document.createElement("div");
            loadingDiv.classList.add("summary-box");
            loadingDiv.innerHTML = "<strong>GIT Model:</strong> Processing... (this may take a moment)";
            resultContainer.appendChild(loadingDiv);
            
            // Create form data
            let formData = new FormData();
            formData.append("file", fileInput.files[0]);
            
            console.log("Sending request to /git_summarize...");
            
            // Send to backend with better error handling
            fetch("/git_summarize", {
                method: "POST",
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("GIT Model Response received:", data);
                
                // Remove loading indicator
                resultContainer.removeChild(loadingDiv);
                
                // Create and add result
                let summaryDiv = document.createElement("div");
                summaryDiv.classList.add("summary-box");
                summaryDiv.innerHTML = `<strong>GIT Summary:</strong> ${data.result || "No summary generated."}`;
                resultContainer.appendChild(summaryDiv);
                resultContainer.scrollTop = resultContainer.scrollHeight;
            })
            .catch(error => {
                console.error("Error with GIT Model:", error);
                
                // Try to remove loading indicator
                try {
                    resultContainer.removeChild(loadingDiv);
                } catch (e) {
                    // Ignore if already removed
                }
                
                // Show error message
                let errorDiv = document.createElement("div");
                errorDiv.classList.add("summary-box");
                errorDiv.style.color = "red";
                errorDiv.innerHTML = `<strong>GIT Model Error:</strong> ${error.message}`;
                resultContainer.appendChild(errorDiv);
            });
        });
        
        console.log("GIT Model handler initialized successfully");
    } else {
        // Log which elements are missing
        if (!gitButton) console.error("Missing element: git button");
        if (!fileInput) console.error("Missing element: fileInput5");
        if (!resultContainer) console.error("Missing element: multi-Container");
    }
});




