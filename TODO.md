# Sync Button Dropdown Fix - Implementation Plan

## Step 1: ActionButtons.jsx ✅
- [x] Add Google Calendar sync option to dropdown menu
- [x] Make post-sync state a dropdown with "Open in Notion"/"Open in Google Calendar" links
- [x] Add props: `notionSynced`, `notionPageUrl`, `googleSynced`, `googleEventUrl`
- [x] Show ExternalLink icon for already-synced apps in dropdown

## Step 2: TaskRow.jsx ✅  
- [x] Replace simple "Sync to Notion" button with dropdown menu
- [x] Add Notion and Google Calendar options in dropdown
- [x] Add Google sync props (`googleSynced`, `googleEventUrl`)
- [x] On sync: call appropriate API; on already-synced: open URL

## Step 3: TaskTable.jsx ✅
- [x] Pass Google sync data alongside Notion data

## Step 4: TaskList.jsx ✅
- [x] Pass Google sync from action fields to TaskTable
- [x] Update onSyncComplete to handle both Notion and Google

## Step 5: ResultsPage.jsx ✅
- [x] Update onSyncTask to accept app parameter and call appropriate endpoint
- [x] Maintain Google sync state alongside Notion sync state

## Step 6: TaskSection.jsx ✅
- [x] Pass Google sync props and onSyncTask with app identifier to ActionButtons

