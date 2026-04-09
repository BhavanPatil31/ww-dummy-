const fs = require('fs');
const pathStr = 'c:/Users/bhava/OneDrive/Desktop/ww(dummy)/frontend/src/pages/AddInvestment.jsx';
let lines = fs.readFileSync(pathStr, 'utf8').replace(/\r\n/g, '\n').split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i] === "    }, [formData.fund_id, formData.amount, formData.startDate]);") {
        lines[i] = ""; // remove the duplicate closing
    }
    if (lines[i] === "        }).format(val || 0);") {
        lines.splice(i + 1, 0, "    };"); // close the formatCurrency arrow function cleanly
        break;
    }
}

let cutOffIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('{/* ── SIP Frequency ── */}')) {
        cutOffIndex = i;
        break;
    }
}

if (cutOffIndex !== -1) {
    let topHalf = lines.slice(0, cutOffIndex).join('\n');
    let bottomHalf = fs.readFileSync('c:/Users/bhava/OneDrive/Desktop/ww(dummy)/frontend/bottomHalf.txt', 'utf8');
    fs.writeFileSync(pathStr, topHalf + '\n' + bottomHalf);
    console.log("File fixed successfully!");
} else {
    console.log("Could not find the cutoff string!");
}
