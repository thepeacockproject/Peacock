import fs, { createReadStream } from "fs"
import path from "path"
import { pipeline } from "stream/promises"

import Pick from "stream-json/filters/Pick.js"
import Parser from "stream-json/Parser.js"
import SV from "stream-json/streamers/StreamValues.js"

const lines = new Map<string, string>()

async function processLocrFile(filePath: string) {
    try {
        const fileStream = createReadStream(filePath)
        const jsonParser = new Parser()
        const pickLanguages = Pick.pick({ filter: "languages.en" })
        const streamParser = SV.streamValues()

        streamParser.on(
            "data",
            ({ value }: { value: Record<string, unknown> }) => {
                // value will be the entire languages.en object
                for (const [key, val] of Object.entries(value)) {
                    if (typeof val === "string") {
                        lines.set(key, val)
                    }
                }
            },
        )

        await pipeline(fileStream, jsonParser, pickLanguages, streamParser)
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error)
    }
}

async function walkDirectory(dir: string): Promise<string[]> {
    const files = await fs.promises.readdir(dir)
    const locrFiles: string[] = []

    for (const file of files) {
        const fullPath = path.join(dir, file)
        const stat = await fs.promises.stat(fullPath)

        if (stat.isDirectory()) {
            const subDirFiles = await walkDirectory(fullPath)
            locrFiles.push(...subDirFiles)
        } else if (file.endsWith(".locr.json")) {
            locrFiles.push(fullPath)
        }
    }

    return locrFiles
}

async function exportToCsv(outputPath: string) {
    const csvContent = Array.from(lines.entries())
        .map(([key, value]) => `"${key}","${value.replace(/"/g, '""')}"`)
        .join("\n")

    await fs.promises.writeFile(outputPath, `${csvContent}`, "utf-8")
}

async function main() {
    try {
        // Replace with your base LOCR directory
        const baseDir = path.resolve(path.dirname("."), "./scripts/LOCR")

        // Check if the base directory exists
        if (!fs.existsSync(baseDir)) {
            throw new Error("LOCR directory does not exist")
        }

        const locrFiles = await walkDirectory(baseDir)

        // Process files sequentially to avoid memory overload
        for (const file of locrFiles) {
            await processLocrFile(file)
        }

        // Export to CSV
        await exportToCsv(path.join(baseDir, "localization.csv"))
        console.log(
            `Processed ${locrFiles.length} files. Results saved to localization.csv`,
        )

        return
    } catch (error) {
        console.error("Error:", error)
    }
}

void main()
