API Setup Guide using the Free Google Gemini API.

The Google Gemini API works best with this project, although any other OpenAI Compatible API can be used. To use the Google Gemini API, for free (no credit card!), follow the guide below.

1. Use a browser which is logged in to a personal google account.

2. Go to https://aistudio.google.com/apikey

3. Follow instructions, accept terms, etc.

4. Click "+ Create an API key"

5. Click "Search Google Cloud projects" and click the project called "Gemini API"

6. Click "Create API key in existing project"

7. The API key has been generated. Click "Copy" and paste it into the extension options menu in the "API Key" field, in the API Configuration section.

8. Verify that the "Plan" in the 'API Keys" section is NOT listed as "Paid," note that this would only occur if you have used google cloud services in the past. If you have no idea what "google cloud" is, then don't worry and move on.

9. In the API Configuration section (in the Options menu of the extension), set the "Base URL" to https://generativelanguage.googleapis.com/v1beta/openai

10. For the model, enter: gemma-3-27b-it

11. For the Rate Limit, enter: 30

12. Make sure Force JSON Output is OFF, although it should be already.

13. That's it! Now, adjust settings as needed below. Have fun!