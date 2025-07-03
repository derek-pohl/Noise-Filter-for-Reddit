// Use a unique attribute to mark posts that have been processed
const PROCESSED_ATTRIBUTE = 'data-noise-filter-processed';
let postCounter = 0;

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

function processPosts() {
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
    }
});

// Use a MutationObserver to detect when new posts are loaded (infinite scroll)
const observer = new MutationObserver((mutations) => {
    // We can debounce this if it becomes too noisy
    processPosts();
});

// Start observing the main container where posts are loaded
const targetNode = document.body;
const config = { childList: true, subtree: true };
observer.observe(targetNode, config);

// Initial run
processPosts();

// Notify background script when the page is unloading to cancel pending requests
window.addEventListener('beforeunload', () => {
    // Use try-catch as this can sometimes fail if the extension context is being invalidated.
    try {
        browser.runtime.sendMessage({ action: "tabUnloading" });
    } catch (e) {
        console.log("Noise Filter: Could not send unloading message, context likely invalidated.", e);
    }
});