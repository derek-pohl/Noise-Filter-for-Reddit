const apiKeyInput = document.getElementById('apiKey');
const baseUrlInput = document.getElementById('baseUrl');
const modelInput = document.getElementById('model');
const saveButton = document.getElementById('saveButton');
const statusEl = document.getElementById('status');
const logContainer = document.getElementById('logContainer');
const refreshLogButton = document.getElementById('refreshLogButton');
const clearLogButton = document.getElementById('clearLogButton');

function saveOptions() {
    const apiKey = apiKeyInput.value;
    const baseUrl = baseUrlInput.value;
    const model = modelInput.value;
    
    // Validate required fields
    if (!apiKey || !baseUrl || !model) {
        statusEl.textContent = 'All fields are required!';
        statusEl.style.color = 'red';
        setTimeout(() => { statusEl.textContent = ''; }, 3000);
        return;
    }
    
    browser.storage.sync.set({ apiKey, baseUrl, model }).then(() => {
        statusEl.textContent = 'Settings saved!';
        statusEl.style.color = 'green';
        setTimeout(() => { statusEl.textContent = ''; }, 2000);
    });
}

function restoreOptions() {
    browser.storage.sync.get(['apiKey', 'baseUrl', 'model']).then((result) => {
        apiKeyInput.value = result.apiKey || '';
        baseUrlInput.value = result.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai';
        modelInput.value = result.model || 'gemma-3-27b-it';
    });
}

async function renderLogs() {
    logContainer.innerHTML = 'Loading...';
    const { activityLog = [] } = await browser.storage.local.get('activityLog');

    if (activityLog.length === 0) {
        logContainer.innerHTML = 'No activity recorded yet.';
        return;
    }

    logContainer.innerHTML = ''; // Clear previous logs

    for (const entry of activityLog) {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'log-entry';

        const timestamp = new Date(entry.timestamp).toLocaleString();

        entryDiv.innerHTML = `
            <p><strong>Timestamp:</strong> ${timestamp}</p>
            <p><strong>Post:</strong> "${entry.post.title}" in ${entry.post.subreddit}</p>
            <p><strong>Action:</strong> ${entry.action}</p>
            <p><strong>Reason:</strong> ${entry.reason}</p>
            <details>
                <summary>View API Request & Response</summary>
                <h4>Request Prompt:</h4>
                <pre>${escapeHtml(entry.apiData?.prompt || 'N/A')}</pre>
                <h4>Full API Response:</h4>
                <pre>${escapeHtml(JSON.stringify(entry.apiData?.responseData || {note: "No response data"}, null, 2))}</pre>
            </details>
        `;
        logContainer.appendChild(entryDiv);
    }
}

function clearLogs() {
    if (confirm('Are you sure you want to clear all activity logs?')) {
        browser.storage.local.remove('activityLog').then(() => {
            renderLogs();
            statusEl.textContent = 'Logs cleared!';
            statusEl.style.color = 'orange';
            setTimeout(() => { statusEl.textContent = ''; }, 2000);
        });
    }
}

function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.addEventListener('DOMContentLoaded', renderLogs);
saveButton.addEventListener('click', saveOptions);
refreshLogButton.addEventListener('click', renderLogs);
clearLogButton.addEventListener('click', clearLogs);