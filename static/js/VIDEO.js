document.addEventListener("DOMContentLoaded", function () {
    // UI Elements
    const fileInput = document.getElementById("fileInput");
    const uploadBox = document.getElementById("uploadBox");
    const videoPreviewContainer = document.getElementById("videoPreviewContainer");
    const previewVideo = document.getElementById("videoPreview");
    const historyContainer = document.getElementById("history");
    const summarizeButton = document.getElementById("summarize-btn");
    const notesButton = document.getElementById("notes-btn");
    
    // Tab Elements
    const summaryTab = document.getElementById("summary-tab");
    const notesTab = document.getElementById("notes-tab");
    const framesTab = document.getElementById("frames-tab");
    const summaryContent = document.getElementById("summary-content");
    const notesContent = document.getElementById("notes-content");
    const framesContent = document.getElementById("frames-content");
    
    // Content Containers
    const chatMessages = document.getElementById("chat-messages");
    const notesMessages = document.getElementById("notes-messages");
    const keyFramesContainer = document.getElementById("key-frames-container");
    
    // State variables
    let selectedFile = null;
    let currentVideoData = {
        fileName: "",
        summary: "",
        notes: "",
        keyframes: []
    };

    // Smooth scroll to element
    function scrollToElement(el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // Click upload
    uploadBox.addEventListener("click", () => fileInput.click());

    // Handle file input
    fileInput.addEventListener("change", function (event) {
        selectedFile = event.target.files[0];
        if (selectedFile) {
            uploadBox.innerHTML = `<i class="fas fa-check-circle"></i><p>${selectedFile.name} ready for analysis</p>`;
            previewVideo.src = URL.createObjectURL(selectedFile);
            videoPreviewContainer.classList.remove("hidden");
            scrollToElement(videoPreviewContainer);
            
            // Reset any previous results
            chatMessages.innerHTML = '';
            notesMessages.innerHTML = '';
            keyFramesContainer.innerHTML = '';
            
            // Set active tab to summary by default
            setActiveTab('summary');
        }
    });
    
    // Drag and Drop handling
    uploadBox.addEventListener("dragover", (event) => {
        event.preventDefault();
        uploadBox.style.backgroundColor = "rgba(0, 255, 255, 0.1)";
    });

    uploadBox.addEventListener("dragleave", () => {
        uploadBox.style.backgroundColor = "transparent";
    });

    uploadBox.addEventListener("drop", (event) => {
        event.preventDefault();
        uploadBox.style.backgroundColor = "transparent";
        selectedFile = event.dataTransfer.files[0];
        if (selectedFile) {
            uploadBox.innerHTML = `<i class="fas fa-check-circle"></i><p>${selectedFile.name} ready for analysis</p>`;
            previewVideo.src = URL.createObjectURL(selectedFile);
            videoPreviewContainer.classList.remove("hidden");
            scrollToElement(videoPreviewContainer);
            
            // Reset any previous results
            chatMessages.innerHTML = '';
            notesMessages.innerHTML = '';
            keyFramesContainer.innerHTML = '';
            
            // Set active tab to summary by default
            setActiveTab('summary');
        }
    });

    // Tab handling
    summaryTab.addEventListener("click", () => setActiveTab('summary'));
    notesTab.addEventListener("click", () => setActiveTab('notes'));
    framesTab.addEventListener("click", () => setActiveTab('frames'));
    
    function setActiveTab(tabName) {
        // Remove active class from all tabs and content
        [summaryTab, notesTab, framesTab].forEach(tab => tab.classList.remove('active'));
        [summaryContent, notesContent, framesContent].forEach(content => content.classList.remove('active'));
        
        // Set active class based on selected tab
        if (tabName === 'summary') {
            summaryTab.classList.add('active');
            summaryContent.classList.add('active');
        } else if (tabName === 'notes') {
            notesTab.classList.add('active');
            notesContent.classList.add('active');
        } else if (tabName === 'frames') {
            framesTab.classList.add('active');
            framesContent.classList.add('active');
        }
    }

    // Summarize video on button click
    summarizeButton.addEventListener("click", function () {
        if (!selectedFile) {
            alert("Please upload a video first!");
            return;
        }
        
        // Set to summary tab when generating summary
        setActiveTab('summary');
        
        // Process the video for summary
        processVideo(selectedFile, 'summarize_video');
    });
    
    // Generate notes on button click
    notesButton.addEventListener("click", function () {
        if (!selectedFile) {
            alert("Please upload a video first!");
            return;
        }
        
        // Set to notes tab when generating notes
        setActiveTab('notes');
        
        // Process the video for notes
        processVideo(selectedFile, 'notes');
    });

    function processVideo(file, mode) {
        const formData = new FormData();
        formData.append("file", file);
        
        // Determine which container to show loading in
        const targetContainer = mode === 'notes' ? notesMessages : chatMessages;
        
        // Create and show loading message
        const loadingMsg = document.createElement("div");
        loadingMsg.className = "message";
        loadingMsg.innerHTML = `
            <div class="message-title">
                <i class="fas fa-spinner fa-spin"></i>
                Processing with Gemini AI...
            </div>
            <div class="message-content">
                Please wait while we analyze your video...
            </div>
        `;
        targetContainer.appendChild(loadingMsg);
        
        // Scroll to see the loading message
        scrollToElement(loadingMsg);

        fetch(`/${mode}`, {
            method: "POST",
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { 
                    throw new Error(`Server error: ${response.status} ${text}`); 
                });
            }
            
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            } else {
                return response.text().then(text => {
                    throw new Error(`Expected JSON but got: ${text.substring(0, 100)}...`);
                });
            }
        })
        .then(data => {
            targetContainer.removeChild(loadingMsg);
            
            if (mode === 'summarize_video' && data.summary) {
                currentVideoData.summary = data.summary;
                displaySummary(data.summary, file.name);
                
                // Only add to history when generating summary
                addToHistory(file.name, data.summary, currentVideoData.notes || "");
                
                // Display keyframes if available
                if (data.keyframes) {
                    currentVideoData.keyframes = data.keyframes;
                    displayKeyFrames(data.keyframes);
                }
            } else if (mode === 'notes' && data.notes) {
                currentVideoData.notes = data.notes;
                displayNotes(data.notes, file.name);
                
                // Update existing history item with notes
                updateHistoryWithNotes(file.name, data.notes);
            } else {
                // Handle error case
                const errorMessage = mode === 'notes' ? 
                    "Failed to generate notes." : 
                    "Failed to generate summary.";
                
                displayError(errorMessage, targetContainer);
            }
        })
        .catch(error => {
            if (targetContainer.contains(loadingMsg)) {
                targetContainer.removeChild(loadingMsg);
            }
            displayError(`Error processing video: ${error.message}`, targetContainer);
            console.error("Error:", error);
        });
    }

    function displaySummary(summary, fileName) {
        chatMessages.innerHTML = ''; // Clear previous messages
        
        const summaryMsg = document.createElement("div");
        summaryMsg.className = "message";
        summaryMsg.innerHTML = `
            <div class="message-title">
                <i class="fas fa-align-left"></i>
                Video Summary
            </div>
            <div class="message-content">
                ${summary}
            </div>
        `;
        chatMessages.appendChild(summaryMsg);
        scrollToElement(summaryMsg);
        
        // Store current video data
        currentVideoData.fileName = fileName;
        currentVideoData.summary = summary;
    }
    
    function displayNotes(notes, fileName) {
        notesMessages.innerHTML = ''; // Clear previous messages
        
        // Process the notes to create bullet points
        const notesList = notes.split('\n').filter(line => line.trim() !== '');
        
        const notesMsg = document.createElement("div");
        notesMsg.className = "message";
        
        let notesHTML = `
            <div class="message-title">
                <i class="fas fa-list-ul"></i>
                Key Notes
            </div>
            <div class="message-content">
        `;
        
        // Add each point with a bullet icon
        notesList.forEach(point => {
            notesHTML += `
                <div class="note-point">
                    <i class="fas fa-circle"></i>
                    <div>${point}</div>
                </div>
            `;
        });
        
        notesHTML += '</div>';
        notesMsg.innerHTML = notesHTML;
        
        notesMessages.appendChild(notesMsg);
        scrollToElement(notesMsg);
        
        // Update current video data
        currentVideoData.fileName = fileName;
        currentVideoData.notes = notes;
    }

    function displayKeyFrames(frames) {
        keyFramesContainer.innerHTML = ''; // Clear previous frames
        
        frames.forEach((frame, index) => {
            const img = document.createElement("img");
            img.src = `data:image/jpeg;base64,${frame}`;
            img.className = "key-frame";
            img.alt = `Frame ${index + 1}`;
            keyFramesContainer.appendChild(img);
        });
    }
    
    function displayError(errorMessage, container) {
        const errorMsg = document.createElement("div");
        errorMsg.className = "message";
        errorMsg.innerHTML = `
            <div class="message-title">
                <i class="fas fa-exclamation-triangle"></i>
                Error
            </div>
            <div class="message-content">
                ${errorMessage}
            </div>
        `;
        container.appendChild(errorMsg);
    }

    function addToHistory(fileName, summary, notes = "") {
        const historyItemId = `history-${Date.now()}`;
        const historyItem = document.createElement("div");
        historyItem.className = "history-item";
        historyItem.id = historyItemId;
        historyItem.innerHTML = `
            <i class="fas fa-film"></i> ${fileName.length > 20 ? fileName.substring(0, 20) + '...' : fileName}
        `;
        
        // Create a data attribute to store the info
        historyItem.dataset.fileName = fileName;
        historyItem.dataset.summary = summary;
        historyItem.dataset.notes = notes;
        
        // Add event listener to restore this video's data
        historyItem.addEventListener('click', function() {
            displaySummary(this.dataset.summary, this.dataset.fileName);
            
            if (this.dataset.notes) {
                displayNotes(this.dataset.notes, this.dataset.fileName);
            } else {
                notesMessages.innerHTML = '';
            }
            
            // Set active tab to summary when clicking history item
            setActiveTab('summary');
        });
        
        // Add as first item in history (newest first)
        if (historyContainer.firstChild) {
            historyContainer.insertBefore(historyItem, historyContainer.firstChild);
        } else {
            historyContainer.appendChild(historyItem);
        }
    }
    
    function updateHistoryWithNotes(fileName, notes) {
        // Find the history item with matching filename
        const historyItems = document.querySelectorAll('.history-item');
        
        for (let item of historyItems) {
            if (item.dataset.fileName === fileName) {
                item.dataset.notes = notes;
                break;
            }
        }
    }
});