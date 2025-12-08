require('dotenv').config();
const https = require('https');

const API_KEY = process.env.NFL_API_KEY || 'XgHqalcBNSjLzQBUkRVL1PJ0iJIFgcfNWFeHEvHk';
const BASE_URL = 'api.sportradar.com';
const ACCESS_LEVEL = process.env.SPORTRADAR_ACCESS_LEVEL || 'trial';

// List of all NFL team IDs (you can get this from the hierarchy endpoint)
const NFL_TEAMS = [
    { id: 'c5a59daa-53a7-4de0-851f-fb12be893e9e', name: 'Detroit Lions', alias: 'DET' },
    { id: 'a20471b4-a8d9-40c7-95ad-90eb1e', name: 'Green Bay Packers', alias: 'GB' },
    // Add more teams as needed - for now we'll use the hierarchy endpoint
];

// Fetch all NFL teams
function fetchTeams() {
    const options = {
        hostname: BASE_URL,
        path: `/nfl/official/${ACCESS_LEVEL}/v7/en/league/hierarchy.json`,
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
                        const parsed = JSON.parse(data);
                        const teams = [];
                        parsed.conferences?.forEach(conf => {
                            conf.divisions?.forEach(div => {
                                div.teams?.forEach(team => {
                                    teams.push({ id: team.id, name: team.name, alias: team.alias });
                                });
                            });
                        });
                        resolve(teams);
                    } catch (error) {
                        reject(new Error('Failed to parse teams'));
                    }
                } else {
                    reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
                }
            });
        }).on('error', reject);
    });
}

// Fetch team roster with injury info
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

// Fetch all injuries across the league
async function fetchAllInjuries() {
    console.log('Fetching NFL teams...');
    const teams = await fetchTeams();
    console.log(`Found ${teams.length} teams. Fetching rosters...\n`);
    
    const injuries = [];
    
    for (const team of teams) {
        try {
            const roster = await fetchTeamRoster(team.id);
            if (roster.players) {
                roster.players.forEach(player => {
                    // Check if player has injury status that's not active
                    if (player.status && player.status !== 'ACT' && player.status !== 'Active') {
                        injuries.push({
                            team: team.name,
                            teamAlias: team.alias,
                            player: player.name || `${player.first_name} ${player.last_name}`,
                            position: player.position,
                            status: player.status,
                            jersey: player.jersey
                        });
                    }
                });
            }
            // Rate limiting - wait 1 second between requests for trial account
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`Error fetching ${team.name}: ${error.message}`);
        }
    }
    
    return injuries;
}

// Display injuries
function displayInjuries(injuries) {
    if (!injuries || injuries.length === 0) {
        console.log('No injuries reported at this time (all players showing as Active).');
        return;
    }

    console.log('\n=== NFL INJURY TRACKER ===\n');
    console.log(`Total injuries: ${injuries.length}\n`);

    // Group by team
    const byTeam = {};
    injuries.forEach(inj => {
        if (!byTeam[inj.team]) byTeam[inj.team] = [];
        byTeam[inj.team].push(inj);
    });

    Object.keys(byTeam).sort().forEach(team => {
        console.log(`\n--- ${team} ---`);
        byTeam[team].forEach(inj => {
            console.log(`  • ${inj.player} (#${inj.jersey || 'N/A'}) - ${inj.position}`);
            console.log(`    Status: ${inj.status}`);
            console.log('');
        });
    });
}

// Search for specific player
function searchPlayer(injuries, playerName) {
    const results = injuries.filter(inj =>
        inj.player && inj.player.toLowerCase().includes(playerName.toLowerCase())
    );

    if (results.length === 0) {
        console.log(`\nNo injury data found for player: ${playerName}`);
        console.log('Note: Only non-active players are shown (INJ, OUT, SUSP, etc.)');
        return;
    }

    console.log(`\n=== Injury Status for "${playerName}" ===\n`);
    results.forEach(inj => {
        console.log(`Player: ${inj.player}`);
        console.log(`Team: ${inj.team} (${inj.teamAlias})`);
        console.log(`Position: ${inj.position}`);
        console.log(`Jersey: #${inj.jersey || 'N/A'}`);
        console.log(`Status: ${inj.status}`);
        console.log('');
    });
}

// Main function
async function main() {
    const args = process.argv.slice(2);
    const playerSearch = args.join(' ');

    try {
        console.log('Fetching NFL injury data from Sportradar...\n');
        const injuries = await fetchAllInjuries();

        if (playerSearch) {
            searchPlayer(injuries, playerSearch);
        } else {
            displayInjuries(injuries);
        }
    } catch (error) {
        console.error('Error:', error.message);
        console.error('\nTip: Make sure your Sportradar API key is set correctly');
        console.error('Set NFL_API_KEY in your .env file');
        process.exit(1);
    }
}

// Run the tracker
main();
