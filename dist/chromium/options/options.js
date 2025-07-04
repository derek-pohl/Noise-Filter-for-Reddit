const apiKeyInput = document.getElementById('apiKey');
const baseUrlInput = document.getElementById('baseUrl');
const modelInput = document.getElementById('model');
const rateLimitInput = document.getElementById('rateLimit');
const whitelistedSubsInput = document.getElementById('whitelistedSubs');
const saveButton = document.getElementById('saveButton');
const statusEl = document.getElementById('status');
const logContainer = document.getElementById('logContainer');
const refreshLogButton = document.getElementById('refreshLogButton');
const clearLogButton = document.getElementById('clearLogButton');
const saveBar = document.getElementById('savebar');

// Tab and content filter elements
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const filterToggles = document.querySelectorAll('.toggle-switch');

// Initialize tab functionality
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetTab = button.dataset.tab;
        
        // Update tab buttons
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Update tab content
        tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById(`${targetTab}-tab`).classList.add('active');
        
        // Hide save bar on activity log tab
        if (targetTab === 'activity') {
            saveBar.classList.remove('show');
        }
    });
});

// Initialize filter toggles
filterToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
        const isEnabled = toggle.classList.contains('enabled');
        
        if (isEnabled) {
            toggle.classList.remove('enabled');
        } else {
            toggle.classList.add('enabled');
        }
        
        // Show save bar when changes are made
        if (document.querySelector('.tab-button.active').dataset.tab === 'settings') {
            saveBar.classList.add('show');
        }
    });
});

// Show save bar when form inputs change
[apiKeyInput, baseUrlInput, modelInput, rateLimitInput, whitelistedSubsInput].forEach(input => {
    if (input) {
        input.addEventListener('input', () => {
            if (document.querySelector('.tab-button.active').dataset.tab === 'settings') {
                saveBar.classList.add('show');
            }
        });
    }
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
    
    // Get enabled filters
    const enabledFilters = {};
    filterToggles.forEach(toggle => {
        const filterId = toggle.dataset.toggle;
        enabledFilters[filterId] = toggle.classList.contains('enabled');
    });
    
    // Validate required fields
    if (!apiKey || !baseUrl || !model) {
        showStatus('API Key, Base URL, and Model are required!', 'error');
        return;
    }
    
    // Validate rate limit
    if (rateLimit < 1 || rateLimit > 600) {
        showStatus('Rate limit must be between 1 and 600 requests per minute!', 'error');
        return;
    }
    
    browser.storage.sync.set({ apiKey, baseUrl, model, rateLimit, enabledFilters, whitelistedSubs }).then(() => {
        showStatus('Settings saved successfully!', 'success');
        // Hide save bar after successful save
        setTimeout(() => {
            saveBar.classList.remove('show');
        }, 2000);
    }).catch(error => {
        showStatus('Failed to save settings: ' + error.message, 'error');
    });
}

function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `status-message show ${type}`;
    setTimeout(() => {
        statusEl.className = 'status-message';
    }, 3000);
}

function restoreOptions() {
    browser.storage.sync.get(['apiKey', 'baseUrl', 'model', 'rateLimit', 'enabledFilters', 'whitelistedSubs']).then((result) => {
        apiKeyInput.value = result.apiKey || '';
        baseUrlInput.value = result.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai';
        modelInput.value = result.model || 'gemma-3-27b-it';
        rateLimitInput.value = result.rateLimit || 30;
        
        // Restore whitelisted subreddits
        const whitelistedSubs = result.whitelistedSubs || [];
        whitelistedSubsInput.value = whitelistedSubs.join('\n');
        
        // Restore filter states (default all content filters to enabled, circlejerk to enabled, extension enabled, json-output enabled for first-time users)
        const enabledFilters = result.enabledFilters || {
            'extension-enabled': true,
            'json-output': false,
            unfunny: false,
            politics: false,
            ragebait: false,
            loweffort: false,
            advertisement: false,
            circlejerk: false,
            'home-page': true,
            'popular-page': true,
            'all-page': true,
            'subreddit-page': true
        };
        
        filterToggles.forEach(toggle => {
            const filterId = toggle.dataset.toggle;
            
            if (enabledFilters[filterId]) {
                toggle.classList.add('enabled');
            } else {
                toggle.classList.remove('enabled');
            }
        });
    });
}

async function renderLogs() {
    logContainer.innerHTML = 'Loading...';
    
    try {
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
                <p><strong>Post:</strong> "${escapeHtml(entry.post.title)}" in ${escapeHtml(entry.post.subreddit)}</p>
                <p><strong>Action:</strong> ${escapeHtml(entry.action)}</p>
                <p><strong>Reason:</strong> ${escapeHtml(entry.reason)}</p>
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
    } catch (error) {
        logContainer.innerHTML = `Error loading logs: ${escapeHtml(error.message)}`;
    }
}

function clearLogs() {
    if (confirm('Are you sure you want to clear all activity logs?')) {
        browser.storage.local.remove('activityLog').then(() => {
            renderLogs();
            showStatus('Activity logs cleared!', 'success');
        }).catch(error => {
            showStatus('Failed to clear logs: ' + error.message, 'error');
        });
    }
}

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
        return String(unsafe);
    }
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    restoreOptions();
    renderLogs();
});

// Event listeners
saveButton.addEventListener('click', saveOptions);
refreshLogButton.addEventListener('click', renderLogs);
clearLogButton.addEventListener('click', clearLogs);