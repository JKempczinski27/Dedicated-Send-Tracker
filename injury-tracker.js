require('dotenv').config();
const https = require('https');

const API_KEY = process.env.NFL_API_KEY || 'XgHqalcBNSjLzQBUkRVL1PJ0iJIFgcfNWFeHEvHk';
const BASE_URL = 'api.sportsdata.io';

// Fetch NFL injuries
function fetchInjuries() {
    const options = {
        hostname: BASE_URL,
        path: `/v3/nfl/scores/json/Injuries/2024`,
        headers: {
            'Ocp-Apim-Subscription-Key': API_KEY
        }
    };

    return new Promise((resolve, reject) => {
        https.get(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(new Error('Failed to parse response'));
                    }
                } else {
                    reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

// Display injuries in a formatted way
function displayInjuries(injuries) {
    if (!injuries || injuries.length === 0) {
        console.log('No injuries reported at this time.');
        return;
    }

    console.log('\n=== NFL INJURY TRACKER ===\n');
    console.log(`Total injuries: ${injuries.length}\n`);

    // Group injuries by team
    const injuriesByTeam = {};
    injuries.forEach(injury => {
        const team = injury.Team || 'Unknown';
        if (!injuriesByTeam[team]) {
            injuriesByTeam[team] = [];
        }
        injuriesByTeam[team].push(injury);
    });

    // Display by team
    Object.keys(injuriesByTeam).sort().forEach(team => {
        console.log(`\n--- ${team} ---`);
        injuriesByTeam[team].forEach(injury => {
            const status = injury.Status || 'Unknown';
            const bodyPart = injury.BodyPart || 'N/A';
            const player = injury.Name || 'Unknown Player';
            const position = injury.Position || 'N/A';

            console.log(`  • ${player} (${position})`);
            console.log(`    Injury: ${bodyPart}`);
            console.log(`    Status: ${status}`);
            if (injury.Updated) {
                console.log(`    Last Updated: ${injury.Updated}`);
            }
            console.log('');
        });
    });
}

// Search for specific player
function searchPlayer(injuries, playerName) {
    const results = injuries.filter(injury =>
        injury.Name && injury.Name.toLowerCase().includes(playerName.toLowerCase())
    );

    if (results.length === 0) {
        console.log(`\nNo injuries found for player: ${playerName}`);
        return;
    }

    console.log(`\n=== Injury Status for "${playerName}" ===\n`);
    results.forEach(injury => {
        console.log(`Player: ${injury.Name}`);
        console.log(`Team: ${injury.Team}`);
        console.log(`Position: ${injury.Position}`);
        console.log(`Injury: ${injury.BodyPart || 'N/A'}`);
        console.log(`Status: ${injury.Status || 'Unknown'}`);
        if (injury.Updated) {
            console.log(`Last Updated: ${injury.Updated}`);
        }
        console.log('');
    });
}

// Main function
async function main() {
    const args = process.argv.slice(2);
    const playerSearch = args.join(' ');

    try {
        console.log('Fetching NFL injury data...\n');
        const injuries = await fetchInjuries();

        if (playerSearch) {
            searchPlayer(injuries, playerSearch);
        } else {
            displayInjuries(injuries);
        }
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Run the tracker
main();
