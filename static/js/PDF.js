// PDF summarizer and uploading file
document.addEventListener("DOMContentLoaded", function () {
    console.log("PDF Summarizer Loaded!");
});

document.getElementById("uploadForm").onsubmit = async function (event) {
    event.preventDefault();
    
    let formData = new FormData();
    let fileInput = document.getElementById("pdfFile").files[0];

    if (!fileInput) {
        alert("Please select a PDF file!");
        return;
    }

    formData.append("pdf", fileInput);

    document.getElementById("summary_output").innerHTML = "<p>Summarizing... Please wait.</p>";

    try {
        let response = await fetch("/summarize_pdf", {  // Corrected endpoint to /summarize_pdf
            method: "POST",
            body: formData
        });

        let data = await response.json();

        if (data.summary) {
            document.getElementById("summary_output").innerHTML = `<p>${data.summary}</p>`;
        } else {
            document.getElementById("summary_output").innerHTML = `<p>Error: ${data.error}</p>`;
        }
    } catch (error) {
        console.error("Error:", error);
        document.getElementById("summary_output").innerHTML = "<p>Something went wrong.</p>";
    }
};
document.getElementById("askQuestion").addEventListener("click", async function() {
    const question = document.getElementById("questionInput").value.trim();
    const answerDiv = document.getElementById("answer_output");
    
    if (!question) {
        alert("Please enter a question.");
        return;
    }
    
    answerDiv.innerHTML = "<p>Processing your question...</p>";
    
    try {
        const response = await fetch("/ask_question", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ question: question }),
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Server response:", errorText);
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        answerDiv.innerHTML = `<p>${result.answer}</p>`;
        
    } catch (error) {
        console.error("Error details:", error);
        answerDiv.innerHTML = `<p>Error: ${error.message}</p>`;
    }
});
// Creating PDF and downloading
document.getElementById("createPDF").addEventListener("click", async function () {
    let textContent = document.getElementById("textInput").value.trim();

    if (!textContent) {
        alert("Please enter text to create a PDF.");
        return;
    }

    let response = await fetch("/create_pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textContent })
    });

    let result = await response.json();

    if (result.pdf_url) {
        let downloadLink = document.createElement("a");
        downloadLink.href = result.pdf_url;
        downloadLink.download = "Created_Document.pdf";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    } else {
        alert("Error creating PDF.");
    }
});

// Text-to-speech function
let playPauseBtn = document.getElementById("playPauseBtn");
let progressBar = document.getElementById("progressBar");
let currentTimeDisplay = document.getElementById("currentTime");
let totalTimeDisplay = document.getElementById("totalTime");
let stopBtn = document.getElementById("stopBtn");

let isPlaying = false;
let startTime = 0;
let pauseTime = 0;
let elapsedBeforePause = 0;
let duration = 0;
let timerInterval;
let currentUtterance = null;
let speechText = "";

function playSpeech() {
    speechText = document.getElementById("summary_output").innerText.trim();
    if (!speechText) {
        alert("No summary available to read.");
        return;
    }

    if (isPlaying) {
        window.speechSynthesis.pause();
        pauseTime = Date.now();
        elapsedBeforePause += (pauseTime - startTime);
        isPlaying = false;
        playPauseBtn.textContent = "▶️";
        clearInterval(timerInterval);
        return;
    }

    if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        startTime = Date.now();
        isPlaying = true;
        playPauseBtn.textContent = "⏸";
        updateProgress();
        return;
    }

    startNewPlayback();
}

function startNewPlayback() {
    window.speechSynthesis.cancel();
    startTime = Date.now();
    elapsedBeforePause = 0;
    isPlaying = true;
    playPauseBtn.textContent = "⏸";

    const wordCount = speechText.split(/\s+/).length;
    duration = wordCount * 0.4;
    totalTimeDisplay.textContent = formatTime(duration);

    currentUtterance = new SpeechSynthesisUtterance(speechText);
    currentUtterance.lang = "en-US";
    currentUtterance.rate = 1.0;
    currentUtterance.pitch = 1.0;

    currentUtterance.onstart = () => {
        startTime = Date.now();
        updateProgress();
    };

    currentUtterance.onend = () => {
        isPlaying = false;
        playPauseBtn.textContent = "▶️";
        clearInterval(timerInterval);
        progressBar.value = 100;
        currentTimeDisplay.textContent = formatTime(duration);
    };

    currentUtterance.onerror = (event) => {
        console.error("SpeechSynthesis error:", event);
        isPlaying = false;
        playPauseBtn.textContent = "▶️";
        clearInterval(timerInterval);
    };

    window.speechSynthesis.speak(currentUtterance);
    updateProgress();
}

function updateProgress() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!isPlaying) return;

        const currentElapsed = elapsedBeforePause + (Date.now() - startTime);
        const progressPercent = Math.min(100, (currentElapsed / (duration * 1000)) * 100);

        progressBar.value = progressPercent;
        currentTimeDisplay.textContent = formatTime(currentElapsed / 1000);

        if (progressPercent >= 100) {
            clearInterval(timerInterval);
        }
    }, 200);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

stopBtn.addEventListener("click", function() {
    window.speechSynthesis.cancel();
    isPlaying = false;
    playPauseBtn.textContent = "▶️";
    clearInterval(timerInterval);
    progressBar.value = 0;
    currentTimeDisplay.textContent = "0:00";
    elapsedBeforePause = 0;
});

progressBar.addEventListener("input", function() {
    const seekPercent = progressBar.value;
    const seekTime = (seekPercent / 100) * duration;

    currentTimeDisplay.textContent = formatTime(seekTime);

    if (isPlaying) {
        elapsedBeforePause = seekTime * 1000;
        startTime = Date.now();
        window.speechSynthesis.cancel();
        startNewPlayback();
    }
});

playPauseBtn.addEventListener("click", playSpeech);
