# Noise Filter for Reddit

A browser extension that blocks content that is of no intrinsic value to the user. Can block posts with unfunny jokes, politics, rage-bait, and other low-effort content that clutters your feed. Leaves only the content that's funny, educational, or just generally useful.

[See it in action on Youtube!](https://www.youtube.com/watch?v=BHRG-Ev8RvI)

## Features!

- **AI-Based Filtering:** Utilizes an AI model to analyze post content and filter out the "noise". This can be any AI model accessible with the OpenAI API. It's recomended to use the Gemini API as it is free. Guide below!
- **Customizable Filtering:** You have granular control over what gets filtered. Block content based on categories like:
    - **Politics:** Hide posts about political figures and parties.
    - **Unfunny Jokes:** Filter out cringe-worthy or unfunny humor.
    - **Rage Bait:** Block content designed to provoke anger.
    - **Low-Effort Content:** Remove easily Google-able questions.
    - **Advertisements:** Hide promotional user posts.
- **Score-Based Filtering:**
    - **Conditional Filtering:** Apply filters only to low-scoring posts.
    - **Hide by Threshold:** Automatically hide posts below a certain score.
    - **Always Check:** Apply filters to all posts, regardless of score.
- **Page-Specific Filtering:** Enable or disable filtering on the Home page, r/popular, r/all, and individual subreddits.
- **Subreddit Whitelisting:** Exclude your favorite subreddits from filtering.
- **Appearance Customization:**
    - **Dark Mode:** Reduce eye strain with a sleek dark theme. (options menu)
    - **Blocked Post Display:** Choose how to display blocked posts: dim, blur, or completely remove them.
- **Import/Export Settings:** Easily back up and restore your configuration.
- **Activity Log:** See a history of the extension's actions.

## Installation

1.  **Download the Extension:**
    *   [Download for Chromium-based browsers (Chrome, Edge, etc.)](https://chromewebstore.google.com/detail/noise-filter-for-reddit/adddebckckijpfbbggfjbohakfifaicf)
    *   [Download for Firefox](https://addons.mozilla.org/en-US/firefox/addon/noise-filter-for-reddit/)

## Configuration

1.  **API Setup:** This extension requires an API key from a generative language model service. For a free and recommended setup, follow the [API Configuration Guide](https://raw.githubusercontent.com/derek-pohl/Noise-Filter-for-Reddit/main/APIConfigGuide.md).
2.  **Extension Options:**
    *   After installation, open the extension's options page.
    *   Enter your API key, base URL, and model name.
    *   Customize the filtering settings to your liking.

## Building from Source

If you'd like to build the extension yourself, follow these steps:

1.  **Clone the Repository: (or download)**
    ```bash
    git clone https://github.com/derek-pohl/Noise-Filter-for-Reddit.git
    cd Noise-Filter-for-Reddit
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Build the Extension:**
    *   **For Chromium:**
        ```bash
        npm run build:chromium
        ```
    *   **For Firefox:**
        ```bash
        npm run build:firefox
        ```
    The built extension will be in the `dist` folder.