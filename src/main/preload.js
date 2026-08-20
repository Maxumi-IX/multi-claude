const { contextBridge, ipcRenderer } = require("electron");

// bridge between renderer and main process - keep this minimal, only expose what we actually use
contextBridge.exposeInMainWorld("electronAPI", {
  getProfiles: () => ipcRenderer.invoke("get-profiles"),
  createProfile: (name, avatar) => ipcRenderer.invoke("create-profile", name, avatar),
  editProfile: (id, newName, avatar) => ipcRenderer.invoke("edit-profile", id, newName, avatar),
  deleteProfile: (id) => ipcRenderer.invoke("delete-profile", id),
  minimize: () => ipcRenderer.send("window-min"),
  maximize: () => ipcRenderer.send("window-max"),
  close: () => ipcRenderer.send("window-close"),
});
