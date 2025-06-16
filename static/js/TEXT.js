document.addEventListener("DOMContentLoaded", function () {
    const textInput = document.getElementById("textInput");
    const chatMessages = document.getElementById("chat-messages");
    const historyContainer = document.getElementById("history");

    document.getElementById("pointsSummary").addEventListener("click", () => processText("points"));
    document.getElementById("shortSummary").addEventListener("click", () => processText("short"));

    document.getElementById("clear-summary").addEventListener("click", function () {
        chatMessages.innerHTML = "";
    });

    function displaySummary(summary, type) {
        const summaryMsg = document.createElement("div");
        summaryMsg.className = "chat-message";

        if (type === "points") {
            let points = summary.split("\n").filter(line => line.trim() !== "");
            summaryMsg.innerHTML = `<strong>POINTS Summary:</strong><br><ul>` +
                points.map(line => `<li>${line.replace(/^[-*]\s*/, "").trim()}</li>`).join("") +
                `</ul>`;
        } else {
            summaryMsg.innerHTML = `<strong>${type.toUpperCase()} Summary:</strong> ${summary}`;
        }

        chatMessages.appendChild(summaryMsg);
    }

    function addToHistory(text, summary, type) {
        const historyItem = document.createElement("div");
        historyItem.className = "history-item";
        historyItem.innerText = `📝 ${type.toUpperCase()} Summary - ${new Date().toLocaleTimeString()}`;
        historyItem.onclick = () => displaySummary(summary, type);
        historyContainer.appendChild(historyItem);
    }

    async function loadHistory() {
        try {
            const res = await fetch("/get_text_summary_history");
            const historyItems = await res.json();

            historyContainer.innerHTML = "";

            historyItems.forEach(item => {
                const historyItem = document.createElement("div");
                historyItem.className = "history-item";
                historyItem.dataset.shortSummary = item.short_summary;
                historyItem.dataset.pointsSummary = item.points_summary;
                historyItem.dataset.id = item.id;

                historyItem.innerHTML = `
                    📝 Summary from ${new Date(item.timestamp).toLocaleString()}
                    <button class="show-short">Short</button>
                    <button class="show-points">Points</button>
                    <button class="delete-history">Delete</button>
                `;

                historyItem.querySelector(".show-short").onclick = () => {
                    displaySummary(item.short_summary, "short");
                };
                historyItem.querySelector(".show-points").onclick = () => {
                    displaySummary(item.points_summary, "points");
                };
                historyItem.querySelector(".delete-history").onclick = async () => {
                    const id = historyItem.dataset.id;
                    await fetch(`/delete_text_summary/${id}`, { method: "DELETE" });
                    historyItem.remove();
                };

                historyContainer.appendChild(historyItem);
            });
        } catch (err) {
            console.error("Failed to load history", err);
        }
    }

    function processText(summaryType) {
        const text = textInput.value.trim();
        if (!text) {
            alert("Please enter text to summarize.");
            return;
        }

        const requestData = {
            text: text,
            type: summaryType
        };

        const loadingMsg = document.createElement("div");
        loadingMsg.className = "chat-message";
        loadingMsg.innerText = "Generating summary...";
        chatMessages.appendChild(loadingMsg);

        fetch("/summarize", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestData)
        })
            .then(response => response.json())
            .then(data => {
                chatMessages.removeChild(loadingMsg);
                if (data.summary) {
                    displaySummary(data.summary, summaryType);
                    addToHistory(text, data.summary, summaryType);
                    loadHistory(); // reload from DB
                } else {
                    displaySummary("Failed to generate summary.", summaryType);
                }
            })
            .catch(error => {
                chatMessages.removeChild(loadingMsg);
                displaySummary("Error processing text.", summaryType);
                console.error("Error:", error);
            });
    }

// Load history from backend
// Variables to hold summaries from the clicked history


async function loadHistory() {
    try {
        const res = await fetch("/get_text_summary_history");
        const historyItems = await res.json();

        historyContainer.innerHTML = "";

        historyItems.forEach(item => {
            const historyItemDiv = document.createElement("div");
            historyItemDiv.className = "history-item";
            historyItemDiv.innerHTML = `
                <h4>${new Date(item.timestamp).toLocaleString()}</h4>
                <p>${item.text.slice(0, 100)}...</p>
                <button class="delete-history" data-id="${item.id}">🗑️ Delete</button>
            `;

            // When clicked (not on delete button), load original text & summaries
            historyItemDiv.addEventListener("click", (e) => {
                if (e.target.classList.contains("delete-history")) return;

                // Set original text
                document.getElementById("textInput").value = item.text;

                // Store summaries in variables for buttons to use later
                currentPointsSummary = item.points_summary || "No points summary available.";
                currentShortSummary = item.short_summary || "No short summary available.";

                // Clear chat messages area
                document.getElementById("chat-messages").innerHTML = "";

                // Scroll to chat/messages area if needed
                document.getElementById("chat-messages").scrollIntoView({ behavior: "smooth" });
            });

            // Delete button listener (as in previous code)
            const deleteButton = historyItemDiv.querySelector(".delete-history");
            deleteButton.addEventListener("click", async (e) => {
                e.stopPropagation();
                const id = e.target.getAttribute("data-id");
                if (!id) return;

                try {
                    const res = await fetch(`/delete_text_summary/${id}`, { method: "DELETE" });
                    if (res.ok) {
                        alert("Deleted successfully");
                        loadHistory();
                    } else {
                        alert("Failed to delete");
                    }
                } catch (err) {
                    console.error("Delete error:", err);
                }
            });

            historyContainer.appendChild(historyItemDiv);
        });

    } catch (err) {
        console.error("Failed to load history", err);
    }
}

// Add event listeners for summary buttons
document.getElementById("pointsSummary").addEventListener("click", () => {
    document.getElementById("chat-messages").innerText = currentPointsSummary;
});

document.getElementById("shortSummary").addEventListener("click", () => {
    document.getElementById("chat-messages").innerText = currentShortSummary;
});

// Call loadHistory on page load
loadHistory();





});