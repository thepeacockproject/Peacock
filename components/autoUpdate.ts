/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2026 The Peacock Project Team
 *
 *     This program is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU Affero General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU Affero General Public License for more details.
 *
 *     You should have received a copy of the GNU Affero General Public License
 *     along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { log, LogLevel } from "./loggingInterop"
import { PEACOCKVERSTRING, compare } from "./utils"
import { getFlag } from "./flags"
import { createWriteStream, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "fs"
import { join } from "path"
import { execSync } from "child_process"
import picocolors from "picocolors"
import * as readline from "readline"

const PEACOCK_REPO = "thepeacockproject/Peacock"
const STAGING_DIR = ".peacock_update_staging"

interface GitHubAsset {
    name: string
    browser_download_url: string
    size: number
}

interface GitHubRelease {
    tag_name: string
    assets: GitHubAsset[]
}

function getPlatformAssetName(version: string): string | null {
    const platform = process.platform
    if (platform === "win32") return `Peacock-v${version}.zip`
    if (platform === "linux") return `Peacock-v${version}-linux.zip`
    if (platform === "darwin") return `Peacock-v${version}-macos.zip`
    return null
}

function formatTimestamp(): string {
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, "0")
    const mm = String(now.getMinutes()).padStart(2, "0")
    const ss = String(now.getSeconds()).padStart(2, "0")
    const ms = String(now.getMilliseconds()).padStart(3, "0")
    return `[${hh}:${mm}:${ss}:${ms}]`
}

function formatUpdatePrompt(message: string): string {
    return `${picocolors.gray(formatTimestamp())} [${picocolors.green("Update")}] ${message}`
}

function getExtractedSource(stagingPath: string): string {
    const entries = readdirSync(stagingPath).filter((e) =>
        statSync(join(stagingPath, e)).isDirectory(),
    )

    if (entries.length === 1 && /^Peacock-v\d/.test(entries[0])) {
        return join(stagingPath, entries[0])
    }

    return stagingPath
}

function writeApplyScripts(sourcePath: string, targetPath: string): void {
    const isWin = process.platform === "win32"
    const preserveItems = [
        "userdata",
        "plugins",
        "logs",
        "contractSessions",
        "contracts",
        "images",
        "options.ini",
    ]

    if (isWin) {
        const ps1 = [
            "$ErrorActionPreference = 'Stop'",
            "Start-Sleep -Seconds 3",
            `$source = "${sourcePath.replace(/\\/g, "\\\\")}"`,
            `$target = "${targetPath.replace(/\\/g, "\\\\")}"`,
            `$preserve = @(${preserveItems.map((p) => `"${p}"`).join(", ")})`,
            "",
            'Write-Host "Applying Peacock update..." -ForegroundColor Cyan',
            "",
            "Get-ChildItem -Path $target | ForEach-Object {",
            "    if ($preserve -notcontains $_.Name) {",
            "        Remove-Item -Path $_.FullName -Recurse -Force",
            "    }",
            "}",
            "",
            "Get-ChildItem -Path $source | ForEach-Object {",
            "    if ($preserve -notcontains $_.Name) {",
            "        $dest = Join-Path $target $_.Name",
            '        Copy-Item -Path $_.FullName -Destination $dest -Recurse -Force',
            "    }",
            "}",
            "",
            `Remove-Item -Path "${sourcePath.replace(/\\/g, "\\\\")}" -Recurse -Force`,
            'Write-Host "Update applied!" -ForegroundColor Green',
            "pause",
        ].join("\n")

        writeFileSync(join(targetPath, "apply-update.ps1"), ps1)

        const bat = [
            "@echo off",
            'powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0apply-update.ps1"',
            "pause",
        ].join("\r\n")

        writeFileSync(join(targetPath, "apply-update.bat"), bat)
    } else {
        const sh = [
            "#!/bin/bash",
            `SOURCE="${sourcePath}"`,
            `TARGET="${targetPath}"`,
            "",
            `PRESERVE="${preserveItems.join(" ")}"`,
            "",
            'echo "Applying Peacock update..."',
            "sleep 3",
            "",
            'for item in "$TARGET"/*; do',
            '    name=$(basename "$item")',
            "    skip=0",
            "    for p in $PRESERVE; do",
            '        if [ "$name" = "$p" ]; then skip=1; break; fi',
            "    done",
            '    if [ "$skip" = "0" ]; then rm -rf "$item"; fi',
            "done",
            "",
            'for item in "$SOURCE"/*; do',
            '    name=$(basename "$item")',
            "    skip=0",
            "    for p in $PRESERVE; do",
            '        if [ "$name" = "$p" ]; then skip=1; break; fi',
            "    done",
            '    if [ "$skip" = "0" ]; then cp -r "$item" "$TARGET/"; fi',
            "done",
            "",
            'rm -rf "$SOURCE"',
            'echo "Update applied!"',
        ].join("\n")

        writeFileSync(join(targetPath, "apply-update.sh"), sh)
        execSync(`chmod +x "${join(targetPath, "apply-update.sh")}"`, { stdio: "ignore" })
    }
}

export async function performAutoUpdate(): Promise<void> {
    if (getFlag("updateChecking") === false) {
        log(LogLevel.DEBUG, "Update checking is disabled.", "auto-update")
        return
    }

    try {
        log(LogLevel.INFO, "Checking for updates...", "auto-update")

        const res = await fetch(
            `https://api.github.com/repos/${PEACOCK_REPO}/releases/latest`,
            {
                headers: {
                    Accept: "application/vnd.github.v3+json",
                    "User-Agent": `Peacock/${PEACOCKVERSTRING}`,
                },
            },
        )

        if (!res.ok) {
            throw new Error(`GitHub API responded with ${res.status} ${res.statusText}`)
        }

        const release = (await res.json()) as GitHubRelease
        const latestVersion = release.tag_name.startsWith("v")
            ? release.tag_name.slice(1)
            : release.tag_name

        const comparison = compare(PEACOCKVERSTRING, latestVersion)

        if (comparison === 0) {
            log(LogLevel.DEBUG, `Peacock v${PEACOCKVERSTRING} is up to date.`, "auto-update")
            return
        }

        if (comparison === 1) {
            log(
                LogLevel.INFO,
                `You're ahead of the latest release! v${latestVersion} is older than v${PEACOCKVERSTRING}.`,
                "auto-update",
            )
            return
        }

        log(
            LogLevel.WARN,
            `New version available: v${latestVersion} (you have v${PEACOCKVERSTRING})`,
            "auto-update",
        )

        const assetName = getPlatformAssetName(latestVersion)

        if (!assetName) {
            log(LogLevel.ERROR, `Unsupported platform: ${process.platform}.`, "auto-update")
            return
        }

        const asset = release.assets.find((a) => a.name === assetName)

        if (!asset) {
            log(LogLevel.ERROR, `Asset "${assetName}" not found for v${latestVersion}.`, "auto-update")

            for (const a of release.assets) {
                log(LogLevel.INFO, `  ${a.name}`, "auto-update")
            }

            return
        }

        if (!process.stdout.isTTY) {
            log(
                LogLevel.INFO,
                `Run "apply-update.bat" after downloading v${latestVersion} from the GitHub releases page.`,
                "auto-update",
            )
            return
        }

        process.stdout.write("\n")
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        })

        const answer = await new Promise<string>((resolve) => {
            rl.question(
                `${formatUpdatePrompt(`Download and stage Peacock v${latestVersion} update? (y/N): `)} `,
                (a) => {
                    rl.close()
                    resolve(a.trim())
                },
            )
        })

        if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
            log(LogLevel.INFO, "Update skipped by user.", "auto-update")
            return
        }

        const stagingPath = join(process.cwd(), STAGING_DIR)
        const downloadPath = join(stagingPath, assetName)

        if (existsSync(stagingPath)) {
            rmSync(stagingPath, { recursive: true, force: true })
        }

        mkdirSync(stagingPath, { recursive: true })

        log(LogLevel.INFO, `Downloading ${assetName}...`, "auto-update")

        const downloadRes = await fetch(asset.browser_download_url)

        if (!downloadRes.ok || !downloadRes.body) {
            throw new Error(`Download failed with status ${downloadRes.status}`)
        }

        const writer = createWriteStream(downloadPath)
        const reader = downloadRes.body.getReader()
        let downloaded = 0
        const total = asset.size

        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            downloaded += value.length
            const pct = Math.round((downloaded / total) * 100)
            process.stdout.write(`\rDownloading... ${pct}% (${(downloaded / 1024 / 1024).toFixed(1)} MB)`)
            writer.write(value)
        }

        writer.end()
        process.stdout.write("\n")

        await new Promise<void>((resolve, reject) => {
            writer.on("finish", resolve)
            writer.on("error", reject)
        })

        log(LogLevel.INFO, "Extracting update...", "auto-update")

        if (process.platform === "win32") {
            execSync(
                `powershell -NoProfile -ExecutionPolicy Bypass -Command "& { Expand-Archive -Path '${downloadPath}' -DestinationPath '${stagingPath}' -Force }"`,
                { stdio: "inherit", timeout: 120000 },
            )
        } else {
            execSync(`unzip -o "${downloadPath}" -d "${stagingPath}"`, {
                stdio: "inherit",
                timeout: 120000,
            })
        }

        rmSync(downloadPath)

        const sourcePath = getExtractedSource(stagingPath)
        writeApplyScripts(sourcePath, process.cwd())

        const scriptName = process.platform === "win32" ? "apply-update.bat" : "apply-update.sh"
        log(
            LogLevel.WARN,
            `Update v${latestVersion} staged! Close this window and run "${scriptName}" to apply.`,
            "auto-update",
        )
    } catch (e) {
        log(
            LogLevel.ERROR,
            `Auto-update failed: ${(e as Error).message}`,
            "auto-update",
        )
    }
}
