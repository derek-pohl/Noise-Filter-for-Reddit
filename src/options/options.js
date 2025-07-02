const apiKeyInput = document.getElementById('apiKey');
const baseUrlInput = document.getElementById('baseUrl');
const modelInput = document.getElementById('model');
const rateLimitInput = document.getElementById('rateLimit');
const whitelistedSubsInput = document.getElementById('whitelistedSubs');
const saveButton = document.getElementById('saveButton');
const saveButton2 = document.getElementById('saveButton2');
const saveButton3 = document.getElementById('saveButton3');
const statusEl = document.getElementById('status');
const statusEl2 = document.getElementById('status2');
const statusEl3 = document.getElementById('status3');
const logContainer = document.getElementById('logContainer');
const refreshLogButton = document.getElementById('refreshLogButton');
const clearLogButton = document.getElementById('clearLogButton');

// Content filter elements
const filterToggles = document.querySelectorAll('.toggle-switch');
const filterOptions = document.querySelectorAll('.filter-option');

// Initialize filter toggles
filterToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
        const filterId = toggle.dataset.toggle;
        const isEnabled = toggle.classList.contains('enabled');
        const filterOption = document.querySelector(`.filter-option[data-filter="${filterId}"]`);
        
        if (isEnabled) {
            toggle.classList.remove('enabled');
            filterOption.classList.remove('enabled');
        } else {
            toggle.classList.add('enabled');
            filterOption.classList.add('enabled');
        }
    });
});

function saveOptions() {
    const apiKey = apiKeyInput.value;
    const baseUrl = baseUrlInput.value;
    const model = modelInput.value;
    const rateLimit = parseInt(rateLimitInput.value) || 60;
    
    // Get whitelisted subreddits
    const whitelistedSubs = whitelistedSubsInput.value
        .split('\n')
        .map(sub => sub.trim().toLowerCase())
        .filter(sub => sub.length > 0);
    
    // Get enabled filters (including extension enabled state)
    const enabledFilters = {};
    filterToggles.forEach(toggle => {
        const filterId = toggle.dataset.toggle;
        enabledFilters[filterId] = toggle.classList.contains('enabled');
    });
    
    // Validate required fields
    if (!apiKey || !baseUrl || !model) {
        showStatus('API Key, Base URL, and Model are required!', 'error', statusEl);
        if (statusEl2) showStatus('API Key, Base URL, and Model are required!', 'error', statusEl2);
        if (statusEl3) showStatus('API Key, Base URL, and Model are required!', 'error', statusEl3);
        return;
    }
    
    // Validate rate limit
    if (rateLimit < 1 || rateLimit > 600) {
        showStatus('Rate limit must be between 1 and 600 requests per minute!', 'error', statusEl);
        if (statusEl2) showStatus('Rate limit must be between 1 and 600 requests per minute!', 'error', statusEl2);
        if (statusEl3) showStatus('Rate limit must be between 1 and 600 requests per minute!', 'error', statusEl3);
        return;
    }
    
    browser.storage.sync.set({ apiKey, baseUrl, model, rateLimit, enabledFilters, whitelistedSubs }).then(() => {
        showStatus('Settings saved successfully!', 'success', statusEl);
        if (statusEl2) showStatus('Settings saved successfully!', 'success', statusEl2);
        if (statusEl3) showStatus('Settings saved successfully!', 'success', statusEl3);
    });
}

function showStatus(message, type, statusElement = statusEl) {
    statusElement.textContent = message;
    statusElement.className = `status-message show ${type}`;
    setTimeout(() => {
        statusElement.className = 'status-message';
    }, 3000);
}

function restoreOptions() {
    browser.storage.sync.get(['apiKey', 'baseUrl', 'model', 'rateLimit', 'enabledFilters', 'whitelistedSubs']).then((result) => {
        apiKeyInput.value = result.apiKey || '';
        baseUrlInput.value = result.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai';
        modelInput.value = result.model || 'gemma-3-27b-it';
        rateLimitInput.value = result.rateLimit || 60;
        
        // Restore whitelisted subreddits
        const whitelistedSubs = result.whitelistedSubs || [];
        whitelistedSubsInput.value = whitelistedSubs.join('\n');
        
        // Restore filter states (default all content filters to enabled, circlejerk to enabled, extension enabled for first-time users)
        const enabledFilters = result.enabledFilters || {
            'extension-enabled': true,
            unfunny: true,
            politics: true,
            ragebait: true,
            loweffort: true,
            advertisement: true,
            circlejerk: true
        };
        
        filterToggles.forEach(toggle => {
            const filterId = toggle.dataset.toggle;
            const filterOption = document.querySelector(`.filter-option[data-filter="${filterId}"]`);
            
            if (enabledFilters[filterId]) {
                toggle.classList.add('enabled');
                filterOption.classList.add('enabled');
            } else {
                toggle.classList.remove('enabled');
                filterOption.classList.remove('enabled');
            }
        });
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
            showStatus('Activity logs cleared!', 'success');
        });
    }
}

function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.addEventListener('DOMContentLoaded', renderLogs);
saveButton.addEventListener('click', saveOptions);
if (saveButton2) saveButton2.addEventListener('click', saveOptions);
if (saveButton3) saveButton3.addEventListener('click', saveOptions);
refreshLogButton.addEventListener('click', renderLogs);
clearLogButton.addEventListener('click', clearLogs);