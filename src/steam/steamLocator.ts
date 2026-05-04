import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";

export function findSteamExe(): string | null {
  const registryPath = findSteamFromRegistry();
  if (registryPath) return registryPath;

  const candidates = [
    "C:\\Program Files (x86)\\Steam\\steam.exe",
    "C:\\Program Files\\Steam\\steam.exe",
    "D:\\Steam\\steam.exe",
    "D:\\Program Files (x86)\\Steam\\steam.exe",
    "D:\\Program Files\\Steam\\steam.exe"
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

export function launchSteamWithCefDebugging(steamExe: string): void {
  spawn(steamExe, ["-cef-enable-debugging"], {
    detached: true,
    stdio: "ignore"
  }).unref();
}

function findSteamFromRegistry(): string | null {
  const keys = [
    "HKCU\\Software\\Valve\\Steam",
    "HKLM\\Software\\WOW6432Node\\Valve\\Steam",
    "HKLM\\Software\\Valve\\Steam"
  ];

  for (const key of keys) {
    const result = spawnSync("reg", ["query", key, "/v", "SteamExe"], {
      encoding: "utf8",
      windowsHide: true
    });
    const match = result.stdout.match(/SteamExe\s+REG_\w+\s+(.+steam\.exe)/i);
    if (match && existsSync(match[1].trim())) return match[1].trim();

    const install = spawnSync("reg", ["query", key, "/v", "SteamPath"], {
      encoding: "utf8",
      windowsHide: true
    });
    const pathMatch = install.stdout.match(/SteamPath\s+REG_\w+\s+(.+)/i);
    if (pathMatch) {
      const exe = `${pathMatch[1].trim()}\\steam.exe`;
      if (existsSync(exe)) return exe;
    }
  }

  return null;
}
