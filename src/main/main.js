const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

// profiles get saved here between launches, just a flat json file in userData
const profilesPath = path.join(app.getPath("userData"), "profiles.json");
let profiles = [{ id: "Default", name: "Default", avatar: null }];

if (fs.existsSync(profilesPath)) {
  const rawData = JSON.parse(fs.readFileSync(profilesPath, "utf-8"));
  // old versions just stored an array of name strings, so handle both shapes
  profiles = rawData.map((p) =>
    typeof p === "string"
      ? { id: p, name: p, avatar: null }
      : { id: p.id, name: p.name, avatar: p.avatar || null },
  );
}

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // custom titlebar, see renderer.js for the min/max/close buttons
    icon: path.join(__dirname, "../../public/app-icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webviewTag: true, // needed so we can embed claude.ai per-profile
    },
  });

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

  // titlebar button events
  ipcMain.on("window-min", () => mainWindow.minimize());
  ipcMain.on("window-max", () =>
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(),
  );
  ipcMain.on("window-close", () => mainWindow.close());

  ipcMain.handle("get-profiles", () => profiles);

  ipcMain.handle("create-profile", (event, name, avatar) => {
    // skip dupes (case insensitive) and empty names
    if (
      name &&
      !profiles.find((p) => p.name.toLowerCase() === name.trim().toLowerCase())
    ) {
      const id = "profile_" + Date.now();
      profiles.push({ id, name: name.trim(), avatar: avatar || null });
      fs.writeFileSync(profilesPath, JSON.stringify(profiles));
    }
    return profiles;
  });

  ipcMain.handle("edit-profile", (event, id, newName, avatar) => {
    const profile = profiles.find((p) => p.id === id);
    if (profile) {
      if (newName) profile.name = newName.trim();
      if (avatar !== undefined && avatar !== null) profile.avatar = avatar;
      fs.writeFileSync(profilesPath, JSON.stringify(profiles));
    }
    return profiles;
  });

  ipcMain.handle("delete-profile", async (event, id) => {
    if (id === "Default") return profiles; // don't let people nuke the default profile

    profiles = profiles.filter((p) => p.id !== id);
    fs.writeFileSync(profilesPath, JSON.stringify(profiles));

    // wipe the webview's cookies/localstorage/session data for this profile too,
    // otherwise a new profile made later could reuse the partition and inherit old login
    const ses = session.fromPartition(`persist:${id}`);
    await ses.clearStorageData();
    return profiles;
  });
});
