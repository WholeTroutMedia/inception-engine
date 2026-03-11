const fs = require('fs');
const path = require('path');

const repoPath = path.resolve(__dirname);
const ignoreDirs = new Set(['.git', 'node_modules', '.turbo', 'dist', 'out']);
const ignoreExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.webm', '.pdf', '.zip', '.tar', '.gz']);

const rules = [
    { search: /wholetroutmedia\.com/gi, replace: "creative-liberation-engine.io" },
    { search: /WholeTroutMedia\/brainchild-v5/gi, replace: "Creative-Liberation-Engine/creative-liberation-engine" },
    { search: /WholeTroutMedia/gi, replace: "Creative-Liberation-Engine" },
    { search: /wholetroutmedia/gi, replace: "creative-liberation-engine" },
    { search: /WholeTrout\s*Media\s*Inc\.?/gi, replace: "CLE Community" },
    { search: /WholeTrout/gi, replace: "CLE" },
    { search: /759644855630-lbqb213qdpnf4knsq9m89qfp0jvd43qd\.apps\.googleusercontent\.com/gi, replace: "YOUR_GOOGLE_CLIENT_ID" },
    { search: /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/g, replace: "YOUR_GOOGLE_CLIENT_SECRET" },
    { search: /averi-wtm/gi, replace: "cle-mobile" },
    { search: /zerday\.io/gi, replace: "creative-liberation-engine.io" },
    { search: /192\.168\.\d+\.\d+(:\d+)?/g, replace: "localhost" },
    { search: /scciwucwca/g, replace: "[hash]" },
    { search: /Justin Aharoni/gi, replace: "The Operator" },
    { search: /justin-aharoni/gi, replace: "operator" },
    { search: /Jaymee/gi, replace: "the creator" },
    { search: /jaharoni|@jahar\b/gi, replace: "operator" },
    { search: /Creative Liberation Engine/g, replace: "Creative Liberation Engine" }, // Safe no-op
    { search: /inception-engine/gi, replace: "creative-liberation-engine" },
    { search: /InceptionEngine/gi, replace: "CreativeLiberationEngine" },
    { search: /creative_liberation_engine/g, replace: "creative_liberation_engine" },
    { search: /\bSTRATA\b|\bstratad\b/gi, replace: "kstratd" },
    { search: /\bLOGD\b|\blogd\b/gi, replace: "kmemd" },
    { search: /\bPRISM\b|\bprismd\b/gi, replace: "kexecd" },
    { search: /\bNORTHSTAR\b|\bnorthstard\b/gi, replace: "kvalidd" },
    { search: /\bSPECTRE\b|\bspectred\b/gi, replace: "ktestd" },
    { search: /\bRAM CREW\b|\bRAM_CREW\b|\bramcrewd\b/gi, replace: "krecd" },
    { search: /\bAURORA\b|\baurorad\b/gi, replace: "kuid" },
    { search: /\bLEX\b|\blexd\b/gi, replace: "kdocsd" },
    { search: /\bBOLT\b|\bboltd\b/gi, replace: "kbuildd" },
    { search: /\bKEEPER\b|\bkeeperd\b/gi, replace: "kstated" },
    { search: /\bNAVD\b/gi, replace: "knetd" },
    { search: /\bVAULT\b/gi, replace: "kstored" },
    { search: /\bSCRIBE\b/gi, replace: "klogd" },
    { search: /\bARCHAEON\b/gi, replace: "klorad" },
    { search: /\bCORTEX\b/gi, replace: "CORE" },
    { search: /\bMUXD\b/gi, replace: "krecd" },
    { search: /\bCORTEX Trinity\b/gi, replace: "CORE Trinity" },
    { search: /\bVERA\b|\bkverad\b/gi, replace: "kstrigd" },
    { search: /\bIRIS\b|\bkirisd\b/gi, replace: "ksignd" },
    { search: /\bATHENA\b|\bkathenad\b/gi, replace: "kruled" },
    { search: /\bkcortexd\b/gi, replace: "kcored" },
    { search: /\bkmuxd\b/gi, replace: "krecd" },
    { search: /\bkramcrew\b/gi, replace: "krecd" },
    { search: /Inception Engine/gi, replace: "Creative Liberation Engine" },
    { search: /\binception\b/g, replace: "cle" },
    { search: /\bINCEPTION\b/g, replace: "CLE" },
    { search: /\bInception\b/g, replace: "CLE" }
];

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (ignoreDirs.has(file)) continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            walk(fullPath);
        } else {
            const ext = path.extname(fullPath).toLowerCase();
            if (ignoreExts.has(ext)) continue;
            
            // Avoid modifying the script itself
            if(file === 'NUKE_LORE.js') continue;

            try {
                let content = fs.readFileSync(fullPath, 'utf8');
                let original = content;
                
                for (const rule of rules) {
                    content = content.replace(rule.search, rule.replace);
                }

                if (content !== original) {
                    fs.writeFileSync(fullPath, content, 'utf8');
                    console.log(`Nuked lore in: ${fullPath.replace(repoPath, '')}`);
                }
            } catch(e) {
                // likely binary file or permission denied
            }
        }
    }
}

walk(repoPath);
console.log("Lore eradication complete.");
