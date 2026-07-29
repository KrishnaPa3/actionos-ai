# Slack Task Sync — Implementation TODO

## Phase 1 — Backend

### 1a. Slack Service (`backend/integrations/slack/service.py`)
- [x] Create `SlackService` class with:
  - `list_channels()` — calls `client.conversations_list()`, filters archived
  - `send_task_message()` — formats task as Slack message blocks, posts to channel

### 1b. Slack Router (`backend/integrations/slack/router.py`)
- [ ] Add `GET /integrations/slack/channels` — list available channels
- [ ] Add `POST /integrations/slack/default-channel` — save default channel in config
- [ ] Add `POST /integrations/slack/sync-task` — full sync flow (mirror Google)

### 1c. Slack Client (`backend/integrations/slack/client.py`)
- [ ] Update `get_client()` to also return config data if needed (or just use from router)

## Phase 2 — Frontend

### 2a. Integrations Page (`frontend/src/pages/Integrations.jsx`)
- [ ] Fetch Slack channels when connected
- [ ] Add channel dropdown selector (like Notion's database selector)
- [ ] Save default channel
- [ ] Show current channel selection

### 2b. Action Buttons (`frontend/src/components/results/ActionButtons.jsx`)
- [ ] Add Slack sync option in the dropdown
- [ ] Add Slack synced state icon + "Open in Slack" link

### 2c. Task Section (`frontend/src/components/Results/TaskSection.jsx`)
- [ ] Pass `slackSynced`, `slackChannelId`, `slackMessageTs` props

### 2d. Results Page (`frontend/src/pages/ResultsPage.jsx`)
- [ ] Add Slack sync handler — POST to `/integrations/slack/sync-task`
- [ ] Update local state with sync metadata

## Phase 3 — Database Migration
- [ ] Add columns: `slack_synced`, `slack_message_ts`, `slack_channel_id`, `slack_last_synced`

