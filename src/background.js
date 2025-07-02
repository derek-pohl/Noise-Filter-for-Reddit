import "./lib/webextension-polyfill.js";

const MAX_LOG_ENTRIES = 50;

browser.runtime.onMessage.addListener(async (message, sender) => {
    if (message.action === "analyzePost") {
        const { post } = message;

        const { apiKey, baseUrl, model } = await browser.storage.sync.get(['apiKey', 'baseUrl', 'model']);
        if (!apiKey) {
            console.warn("Noise Filter: API key not set. Please set it in the extension options.");
            return; // Don't proceed without an API key
        }
        if (!baseUrl) {
            console.warn("Noise Filter: Base URL not set. Please set it in the extension options.");
            return; // Don't proceed without a base URL
        }
        if (!model) {
            console.warn("Noise Filter: Model not set. Please set it in the extension options.");
            return; // Don't proceed without a model
        }

        let apiResponse = null;
        let actionTaken = 'safe';
        let reason = 'Post was deemed safe.';

        try {
            const { prompt, responseData, parsedResponse } = await callOpenAIApi(post, apiKey, baseUrl, model);
            apiResponse = { prompt, responseData, parsedResponse };

            if (parsedResponse && parsedResponse.blocked_topic !== "safe") {
                // Send a message back to the content script to update the post's UI
                browser.tabs.sendMessage(sender.tab.id, {
                    action: "hidePost",
                    postId: post.id,
                    reason: parsedResponse.blocked_reason,
                    topic: parsedResponse.blocked_topic
                });
                actionTaken = `hide (${parsedResponse.blocked_topic})`;
                reason = parsedResponse.blocked_reason;
            }
        } catch (error) {
            console.error("Noise Filter: Error analyzing post.", error);
            actionTaken = 'error';
            reason = error.message;
            apiResponse = apiResponse || { error: error.message };
        } finally {
            await logActivity(post, apiResponse, actionTaken, reason);
        }
    }
});

async function logActivity(post, apiData, action, reason) {
    const { activityLog = [] } = await browser.storage.local.get('activityLog');

    const logEntry = {
        timestamp: new Date().toISOString(),
        post,
        apiData,
        action,
        reason,
    };

    const newLog = [logEntry, ...activityLog].slice(0, MAX_LOG_ENTRIES);
    await browser.storage.local.set({ activityLog: newLog });
}

async function callOpenAIApi(post, apiKey, baseUrl, model) {
    const prompt = `You are a content detector. You block content on reddit which is of NO intrinsic value to the user.

The user has determined that these type of posts are of no value to them:

unfunny jokes, such as those that are cringe. Normal jokes are OK.
politics which criticise a poltitical figure, or a political party, or simply mention a political figure.
rage-bait
low-effort content, this can mean a post that the writer of the post could have EASILY used google. If a hard google search would need to be used, it's not low effort. Some posts may ask a question that's more open ended which doesn't always make them low effort. low effort content can also be unrelated to asking questions,
advertisement

Remember, if the post doesn't resemble any of these, put "safe" for the "blocked_reason" and "blocked_topic" otherwise use the tags "unfunny" "politics" "ragebait" "loweffort"  or "advertisement" along with a reason why in the "blocked_reason"

Remember, the sub name is also important. Eg, r/shittymoviedetails is designed to have shitty posts with shitty titles!

Based on this and the post at the top, respond ONLY in JSON format, such as in the example below:

{
  "post_description": "News article about Donald Trump's Political Actions.",
  "blocked_reason": "Focuses on a United States political figure, which is politics",
  "blocked_topic": "politics"
}

Sub Name: ${post.subreddit}
Post:

Title: ${post.title}
Body Text: ${post.body}
`;

    // Use the base URL as provided by the user
    let apiUrl = baseUrl;
    // Remove trailing slash if present
    if (apiUrl.endsWith('/')) {
        apiUrl = apiUrl.slice(0, -1);
    }
    // Append the chat completions endpoint
    apiUrl = `${apiUrl}/chat/completions`;
    
    const fetchOptions = {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1
        })
    };

    const response = await fetch(apiUrl, fetchOptions);

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Noise Filter: API Error Body:", errorBody);
        throw new Error(`API call failed with status: ${response.status}`);
    }
    
    const responseData = await response.json();
    
    // Safely access the response text to prevent crashes on unexpected API responses
    const responseText = responseData.choices?.[0]?.message?.content;
    if (!responseText) {
        console.error("Noise Filter: Unexpected API response structure.", responseData);
        throw new Error("Invalid response structure from OpenAI API.");
    }

    // The API response is a stringified JSON, so it needs to be parsed.
    const parsedResponse = JSON.parse(responseText);
    return {
        prompt,
        responseData,
        parsedResponse
    };
}