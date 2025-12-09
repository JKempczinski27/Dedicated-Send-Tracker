require('dotenv').config();
const https = require('https');

const API_KEY = process.env.NFL_API_KEY || 'XgHqalcBNSjLzQBUkRVL1PJ0iJIFgcfNWFeHEvHk';
const BASE_URL = 'api.sportradar.com';
const ACCESS_LEVEL = process.env.SPORTRADAR_ACCESS_LEVEL || 'trial';

// Map of team abbreviations to team IDs
const TEAM_MAP = {
    'IND': 'c5a59daa-53a7-4de0-851f-fb12be893e9e', // Colts - corrected
    'NYG': 'e5174c3e-1dca-4d61-8b66-7bb183d6c2c3',
    'KC': 'a20471b4-a8d9-40c7-95ad-90eb1e639c6f',
    'BUF': 'dc7f5c0e-b15e-4df0-a1af-9c75a1e5a11d',
    // Add more as needed
};

// Fetch team roster
function fetchTeamRoster(teamId) {
    const options = {
        hostname: BASE_URL,
        path: `/nfl/official/${ACCESS_LEVEL}/v7/en/teams/${teamId}/full_roster.json`,
        headers: {
            'Accept': 'application/json',
            'x-api-key': API_KEY
        }
    };

    return new Promise((resolve, reject) => {
        https.get(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(new Error('Failed to parse roster'));
                    }
                } else {
                    reject(new Error(`API request failed with status ${res.statusCode}`));
                }
            });
        }).on('error', reject);
    });
}

// Search for player in specific team
async function searchPlayerInTeam(playerName, teamAbbr) {
    const teamId = TEAM_MAP[teamAbbr.toUpperCase()];
    if (!teamId) {
        console.log(`Unknown team abbreviation: ${teamAbbr}`);
        console.log(`Available teams: ${Object.keys(TEAM_MAP).join(', ')}`);
        return;
    }

    console.log(`Searching for ${playerName} in ${teamAbbr}...\n`);

    try {
        const roster = await fetchTeamRoster(teamId);
        
        if (!roster.players) {
            console.log('No roster data available');
            return;
        }

        const player = roster.players.find(p => {
            const fullName = p.name || `${p.first_name} ${p.last_name}`;
            return fullName.toLowerCase().includes(playerName.toLowerCase());
        });

        if (!player) {
            console.log(`Player not found: ${playerName}`);
            return;
        }

        // Display player info
        console.log(`=== ${player.name || `${player.first_name} ${player.last_name}`} ===\n`);
        console.log(`Team: ${roster.market} ${roster.name}`);
        console.log(`Position: ${player.position}`);
        console.log(`Jersey: #${player.jersey || 'N/A'}`);
        
        // Status display
        const statusMap = {
            'ACT': '✅ Active (Healthy)',
            'IR': '🚑 Injured Reserve',
            'PRA': '📋 Practice Squad',
            'PUP': '⚕️ Physically Unable to Perform',
            'IRD': '🔄 IR - Designated for Return',
            'SUS': '⛔ Suspended',
            'PRA_IR': '📋 Practice Squad - Injured',
            'NON': '❌ Non-Football Injury List'
        };
        
        const statusDisplay = statusMap[player.status] || player.status || 'Unknown';
        console.log(`Status: ${statusDisplay}`);
        
        if (player.birth_date) {
            console.log(`Birth Date: ${player.birth_date}`);
        }
        if (player.height) {
            console.log(`Height: ${Math.floor(player.height / 12)}' ${player.height % 12}"`);
        }
        if (player.weight) {
            console.log(`Weight: ${player.weight} lbs`);
        }
        if (player.college) {
            console.log(`College: ${player.college}`);
        }
        console.log('');
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Main
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('Usage: node quick-player-lookup.js <player-name> <team-abbr>');
    console.log('Example: node quick-player-lookup.js "Daniel Jones" IND');
    console.log(`\nAvailable teams: ${Object.keys(TEAM_MAP).join(', ')}`);
    process.exit(1);
}

const playerName = args[0];
const teamAbbr = args[1];

searchPlayerInTeam(playerName, teamAbbr);
