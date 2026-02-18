import { readFile, writeFile } from "fs/promises";
import { inflateSync, inflateRawSync } from "zlib";

async function extractStyles() {
    let output = "export const GRAFFOO_STYLES = {\n";
    let outputXml = "export const GRAFFOO_STYLE_XML = {\n";

    try {
        console.log("Starting extraction...");
        const content = await readFile("styles/Graffoo.xml", "utf-8");
        console.log(`File read. Length: ${content.length}`);

        // Remove wrapper
        const jsonStr = content.replace("<mxlibrary>", "").replace("</mxlibrary>", "");
        let items;
        try {
            items = JSON.parse(jsonStr);
            console.log(`Parsed JSON. Items: ${items.length}`);
        } catch (e) {
            console.log("JSON Parse Error: " + e.message);
            return;
        }



        for (const item of items) {
            const title = item.title;
            const b64 = item.xml;
            console.log(`Processing: ${title}`);

            // 1. Base64 decode
            const buffer = Buffer.from(b64, 'base64');

            // 2. Inflate
            let decompressed;
            try {
                // Try standard inflate first
                decompressed = inflateSync(buffer).toString();
            } catch (e) {
                try {
                    decompressed = inflateRawSync(buffer).toString();
                } catch (e2) {
                    console.log(`Inflate failed for ${title}: ${e2.message}`);
                    continue;
                }
            }

            // 3. URL Decode
            let xmlStr;
            try {
                xmlStr = decodeURIComponent(decompressed);
            } catch (e) {
                console.log(`URL Decode failed for ${title}: ${e.message}`);
                continue; // or use decompressed
            }


            item.xml = xmlStr;
            // 4. Write outputs
            outputXml += `    '${title}': \`${xmlStr}\`,\n`;
            const styleMatch = xmlStr.match(/style="([^"]*)"/);
            let style = styleMatch ? styleMatch[1] : "";

            output += `    '${title}': '${style}',\n`;
        }
        output += "};\n";
        outputXml += "};\n";

        await writeFile("src/styles_output.js", output);
        console.log("Written to src/styles_output.js");


        await writeFile("src/styles.json", JSON.stringify(items));
        console.log("Written to src/styles.json");
    } catch (err) {
        console.log("Global Error: " + err);
    }
}

extractStyles();
