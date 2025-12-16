require('dotenv').config();
const https = require('https');

const CLIENT_KEY = process.env.NFL_CLIENT_KEY || 'VhcsgwovwvCiN3xrl5UPippxjaMBOwqk';
const CLIENT_SECRET = process.env.NFL_CLIENT_SECRET || '9giQIDN3gmlaKjbL';
const TOKEN_URL = 'api.nfl.com';
const API_URL = 'api.nfl.com';

let cachedToken = null;
let tokenExpiry = null;

// Get OAuth token from NFL Identity API
function getToken() {
    // Return cached token if still valid
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
        return Promise.resolve(cachedToken);
    }

    const postData = JSON.stringify({
        clientKey: CLIENT_KEY,
        clientSecret: CLIENT_SECRET
    });

    const options = {
        hostname: TOKEN_URL,
        path: '/identity/v3/token',
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Authorization': CLIENT_KEY,
            'Content-Type': 'application/json',
            'Content-Length': postData.length
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const parsed = JSON.parse(data);
                        cachedToken = parsed.accessToken;
                        tokenExpiry = parsed.expiresIn * 1000; // Convert to milliseconds
                        resolve(cachedToken);
                    } catch (error) {
                        reject(new Error('Failed to parse token response'));
                    }
                } else {
                    reject(new Error(`Token request failed with status ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Fetch injuries from NFL API
async function fetchInjuries(season = 2024, seasonType = 'REG') {
    const token = await getToken();
    
    const options = {
        hostname: API_URL,
        path: `/football/v2/injuries?season=${season}&seasonType=${seasonType}`,
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
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
                        reject(new Error('Failed to parse injuries'));
                    }
                } else {
                    reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
                }
            });
        }).on('error', reject);
    });
}

// Fetch all injuries across the league
async function fetchAllInjuries() {
    console.log('Fetching NFL injury data...');
    const data = await fetchInjuries();
    
    const injuries = [];
    
    if (data.injuries && Array.isArray(data.injuries)) {
        data.injuries.forEach(injury => {
            // Only include if there's an actual injury status
            if (injury.injuryStatus || (injury.injuries && injury.injuries.length > 0)) {
                injuries.push({
                    team: injury.team?.fullName || 'Unknown',
                    teamAlias: injury.team?.fullName?.split(' ').pop() || 'UNK',
                    player: injury.person?.displayName || 'Unknown',
                    position: injury.position,
                    status: injury.injuryStatus || 'N/A',
                    injuries: injury.injuries?.join(', ') || 'N/A',
                    practiceStatus: injury.practiceStatus
                });
            }
        });
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
            console.log(`  • ${inj.player} - ${inj.position}`);
            console.log(`    Injury: ${inj.injuries}`);
            console.log(`    Status: ${inj.status}`);
            if (inj.practiceStatus) {
                console.log(`    Practice: ${inj.practiceStatus}`);
            }
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
        console.log(`Team: ${inj.team}`);
        console.log(`Position: ${inj.position}`);
        console.log(`Injury: ${inj.injuries}`);
        console.log(`Status: ${inj.status}`);
        if (inj.practiceStatus) {
            console.log(`Practice: ${inj.practiceStatus}`);
        }
        console.log('');
    });
}

// Main function
async function main() {
    const args = process.argv.slice(2);
    const playerSearch = args.join(' ');

    try {
        console.log('Fetching NFL injury data from NFL.com API...\n');
        const injuries = await fetchAllInjuries();

        if (playerSearch) {
            searchPlayer(injuries, playerSearch);
        } else {
            displayInjuries(injuries);
        }
    } catch (error) {
        console.error('Error:', error.message);
        console.error('\nTip: Make sure your NFL API credentials are set correctly');
        console.error('Set NFL_CLIENT_KEY and NFL_CLIENT_SECRET in your .env file');
        process.exit(1);
    }
}

// Run the tracker
main();
