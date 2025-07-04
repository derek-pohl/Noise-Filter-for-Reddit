// Use a unique attribute to mark posts that have been processed
const PROCESSED_ATTRIBUTE = 'data-noise-filter-processed';
let postCounter = 0;
let extensionSettings = null;

// Function to detect what type of Reddit page we're on
function detectPageType() {
    const url = window.location.href;
    const pathname = window.location.pathname;
    
    // Individual post pages - always disable on these
    if (pathname.match(/^\/r\/[^\/]+\/comments\/[^\/]+/)) {
        return 'post';
    }
    
    // Home page
    if (url === 'https://www.reddit.com/' || url.includes('reddit.com/?feed=home') || pathname === '/') {
        return 'home';
    }
    
    // Popular page
    if (pathname === '/r/popular/' || pathname === '/r/popular') {
        return 'popular';
    }
    
    // All page
    if (pathname === '/r/all/' || pathname === '/r/all') {
        return 'all';
    }
    
    // Individual subreddit pages
    if (pathname.match(/^\/r\/[^\/]+\/?$/)) {
        return 'subreddit';
    }
    
    // Other pages (search, user profiles, etc.)
    return 'other';
}

// Function to check if filtering should be enabled on current page
async function shouldFilterOnCurrentPage() {
    if (!extensionSettings) {
        const result = await browser.storage.sync.get(['enabledFilters']);
        extensionSettings = result.enabledFilters || {};
    }
    
    // Check if extension is globally enabled
    if (!extensionSettings['extension-enabled']) {
        return false;
    }
    
    const pageType = detectPageType();
    
    // Never filter on individual post pages
    if (pageType === 'post') {
        return false;
    }
    
    // Check page-specific settings
    switch (pageType) {
        case 'home':
            return extensionSettings['home-page'] !== false;
        case 'popular':
            return extensionSettings['popular-page'] !== false;
        case 'all':
            return extensionSettings['all-page'] !== false;
        case 'subreddit':
            return extensionSettings['subreddit-page'] !== false;
        default:
            // For other pages (search, user profiles, etc.), allow filtering by default
            return true;
    }
}

function getPostData(postElement) {
    // Promoted posts have a `promoted` attribute on the shreddit-post element.
    if (postElement.hasAttribute('promoted')) {
        return {
            id: `noise-filter-post-${postCounter++}`,
            title: "Promoted Post",
            body: postElement.innerText.substring(0, 500), // Get some text for context
            subreddit: "r/advertisement"
        };
    }

    // Extract data directly from the shreddit-post element's attributes for reliability.
    const title = postElement.getAttribute('post-title');
    const subreddit = postElement.getAttribute('subreddit-name');

    if (!title || !subreddit) {
        return null; // Not a valid post container
    }

    // The body text is in a slotted element.
    const bodyElement = postElement.querySelector('[slot="text-body"]');

    return {
        id: `noise-filter-post-${postCounter++}`,
        title: title,
        body: bodyElement ? bodyElement.innerText : "",
        subreddit: `r/${subreddit}`
    };
}

async function processPosts() {
    // Check if filtering should be enabled on current page
    if (!(await shouldFilterOnCurrentPage())) {
        return;
    }
    
    // This selector targets individual post containers in Reddit's feed.
    // Reddit has updated its structure to use the <shreddit-post> custom element,
    // which is a more stable selector than the old `data-testid`.
    const postContainers = document.querySelectorAll(`shreddit-post:not([${PROCESSED_ATTRIBUTE}])`);

    for (const container of postContainers) {
        container.setAttribute(PROCESSED_ATTRIBUTE, 'true');

        const postData = getPostData(container);
        if (postData) {
            container.setAttribute('id', postData.id); // Assign the unique ID to the element
            // Send to the background script for analysis
            browser.runtime.sendMessage({ action: "analyzePost", post: postData });
        }
    }
}

// Listen for messages from the background script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "hidePost") {
        const postElement = document.getElementById(message.postId);
        if (postElement) {
            console.log(`Noise Filter: Removing post (${message.topic}). Reason: ${message.reason}`);
            postElement.remove();
        }
    } else if (message.action === "settingsChanged") {
        // Reload settings when they change
        extensionSettings = null;
    }
});

// Listen for storage changes to update settings
browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes.enabledFilters) {
        extensionSettings = null;
    }
});

// Use a MutationObserver to detect when new posts are loaded (infinite scroll)
const observer = new MutationObserver(async (mutations) => {
    // We can debounce this if it becomes too noisy
    await processPosts();
});

// Start observing the main container where posts are loaded
const targetNode = document.body;
const config = { childList: true, subtree: true };
observer.observe(targetNode, config);

// Initial run
(async () => {
    await processPosts();
})();

// Handle URL changes (for single-page app navigation)
let currentUrl = window.location.href;
setInterval(async () => {
    if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        // Clear extension settings cache when URL changes
        extensionSettings = null;
        // Process posts on the new page
        await processPosts();
    }
}, 1000);

// Notify background script when the page is unloading to cancel pending requests
window.addEventListener('beforeunload', () => {
    // Use try-catch as this can sometimes fail if the extension context is being invalidated.
    try {
        browser.runtime.sendMessage({ action: "tabUnloading" });
    } catch (e) {
        console.log("Noise Filter: Could not send unloading message, context likely invalidated.", e);
    }
});