# NFL Injury Tracker

A straightforward JavaScript tracker that monitors and displays NFL player injury statuses using the SportsData.io API.

## Features

- View all current NFL player injuries
- Search for specific player injury status
- Organized display by team
- Real-time injury updates

## Setup

1. Install dependencies:
```bash
npm install
```

2. (Optional) Create a `.env` file with your API key:
```bash
cp .env.example .env
```

Then edit `.env` and add your API key:
```
NFL_API_KEY=your_api_key_here
```

Note: The API key is already embedded in the code, so the `.env` file is optional.

## Usage

### View all injuries:
```bash
npm start
```

or

```bash
node injury-tracker.js
```

### Search for a specific player:
```bash
npm start player_name
```

For example:
```bash
npm start Patrick Mahomes
```

or

```bash
node injury-tracker.js Patrick Mahomes
```

## Output

The tracker displays:
- Player name and position
- Team
- Injury location (body part)
- Current status
- Last update timestamp

Injuries are organized by team for easy viewing.

## API

This tracker uses the SportsData.io NFL API to fetch current injury data.