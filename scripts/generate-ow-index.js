const fs = require('fs');
const path = require('path');

const OWsDir = path.join(__dirname, '../OWs');

function parseDateFromName(filename, filepath) {
    // Check for standard format: M-D-YY or M.D.YY
    let match = filename.match(/^(\d{1,2})[-.](\d{1,2})[-.](\d{2,4})/);
    if (match) {
        let month = parseInt(match[1], 10);
        let day = parseInt(match[2], 10);
        let year = parseInt(match[3], 10);
        if (year > 1000) year = year % 100;
        return {
            key: `${month}-${day}-${year}`,
            display_date: `${month}/${day}/${year}`,
            is_xmas: false
        };
    }

    // Check for XMAS format: XMAS 8pm
    let xmasMatch = filename.match(/xmas/i);
    if (xmasMatch) {
        let yearStrMatch = filename.match(/\b(20\d{2})\b/);
        let year;
        if (yearStrMatch) {
            year = parseInt(yearStrMatch[1], 10) % 100;
        } else {
            // infer year from git history to avoid issues in CI
            try {
                const { execSync } = require('child_process');
                let output = execSync(`git log --diff-filter=A --format=%aI -1 -- "${filepath}"`, { encoding: 'utf8' }).trim();
                if (output) {
                    year = new Date(output).getFullYear() % 100;
                } else {
                    let stats = fs.statSync(filepath);
                    year = new Date(stats.birthtimeMs || stats.mtimeMs).getFullYear() % 100;
                }
            } catch (e) {
                year = new Date().getFullYear() % 100;
            }
        }

        let month = 12;
        let day = 24;

        let timeMatch = filename.match(/(\d{1,2})\s*(am|pm)/i);
        let timeStr = "";
        let displayTime = "";
        if (timeMatch) {
            let hour = parseInt(timeMatch[1], 10);
            let isPm = timeMatch[2].toLowerCase() === 'pm';
            if (isPm && hour < 12) hour += 12;
            if (!isPm && hour === 12) hour = 0;

            let hourStr = hour.toString().padStart(2, '0');
            timeStr = `-${hourStr}00`;
            displayTime = ` ${timeMatch[1]}${timeMatch[2].toLowerCase()}`;
        }

        return {
            key: `${month}-${day}-${year}${timeStr}`,
            display_date: `${month}/${day}/${year}${displayTime}`,
            is_xmas: true
        };
    }

    return null;
}

function generateIndex() {
    console.log("Scanning files inside the /OWs directory...");

    let index = {};
    let files = fs.readdirSync(OWsDir);

    for (let filename of files) {
        if (!filename.toLowerCase().endsWith('.pdf')) continue;

        let filepath = path.join(OWsDir, filename);
        let parsed = parseDateFromName(filename, filepath);

        if (parsed) {
            index[parsed.key] = {
                filename: filename,
                url: `https://cju-media.github.io/OW/OWs/${encodeURIComponent(filename)}`,
                display_date: parsed.display_date
            };
        }
    }

    let outputPath = path.join(OWsDir, 'index.json');
    fs.writeFileSync(outputPath, JSON.stringify(index, null, 2));

    console.log("Master dynamic database map compiled successfully:");
    console.log(JSON.stringify(index, null, 2));
}

generateIndex();
