# iOS Shortcut Setup: "Share to IE Inbox"

This guide explains how to set up an iOS Shortcut on your iPhone 17 or iPad Pro to ingest articles directly from Flipboard (or any other app) into the Creative Liberation Engine.

## How it works
This shortcut triggers from the standard iOS Share Sheet. It takes the URL of the article you are reading and `POST`s it directly to the engine's `mobile-bridge` service `(/mobile/inbox)`. The engine then dispatches a background task (`Process Inbox Item`) to `VAULT` or your designated agent to parse, summarize, and commit it to memory.

## Prerequisites
- You must be on the same local network as the NAS (or have your Zero Day public domain set up for the Gateway).
- The `mobile-bridge` service must be running.

## Step-by-Step Instructions

1. **Open the Shortcuts app** on your iOS device.
2. **Create a New Shortcut** (tap the `+` icon).
3. Tap the **Info (i)** button at the bottom and enable **Show in Share Sheet**.
4. Set it to **Receive [URLs, Articles] inputs from Share Sheet**.
5. Add the action: **Get URLs from Input**.
6. Add the action: **Get Contents of URL**.
7. Configure the **Get Contents of URL** action as follows:
   - **URL:** `http://localhost/mobile/inbox` (Replace IP with your public URL if remote, otherwise use the NAS IP).
   - **Method:** `POST`
   - **Headers:** Add a `Content-Type` header set to `application/json`.
   - **Request Body:** Choose `JSON`.
   - Add a key `url` and set its value to the **URL** variable provided from Step 5.
   - Add a key `source` and set its value to `iOS Share Sheet (Flipboard)`.
8. Enable **Show Result** at the end so you get confirmation the article was ingested.

## Usage
When reading an article in Flipboard:
1. Tap the Share icon.
2. Select **Share to IE Inbox** from your Share Sheet.
3. The engine instantly receives the dispatch. You'll see the notification stream locally and your widgets will update!
