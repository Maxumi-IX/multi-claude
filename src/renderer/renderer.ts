// Profile and window.electronAPI come from src/renderer/global.d.ts, which
// is included in this compilation (see tsconfig.renderer.json) as an
// ambient global script - no import needed, and none is possible here
// without reintroducing the CommonJS "exports" boilerplate that breaks this
// file as a <script> tag.

// Small helper so we fail loudly (at startup) instead of with a vague
// "possibly null" error somewhere deep in a click handler.
function requireEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} element in index.html`);
  return el as T;
}

document.getElementById("min-btn")!.onclick = () =>
  window.electronAPI.minimize();
document.getElementById("max-btn")!.onclick = () =>
  window.electronAPI.maximize();
document.getElementById("close-btn")!.onclick = () =>
  window.electronAPI.close();

const profileBtn = requireEl<HTMLButtonElement>("profile-btn");
const profilePopup = requireEl<HTMLDivElement>("profile-popup");
const profileList = requireEl<HTMLDivElement>("profile-list");
const currentProfileLabel = requireEl<HTMLSpanElement>("current-profile");

const settingsBtn = requireEl<HTMLButtonElement>("settings-btn");
const settingsModal = requireEl<HTMLDivElement>("settings-modal");
const closeModalBtn = requireEl<HTMLButtonElement>("close-modal-btn");
const settingsProfileList = requireEl<HTMLDivElement>("settings-profile-list");

const profileFormHeading = requireEl<HTMLElement>("profile-form-heading");
const profileFormName = requireEl<HTMLInputElement>("profile-form-name");
const profileFormSave = requireEl<HTMLButtonElement>("profile-form-save");
const profileFormCancel = requireEl<HTMLButtonElement>("profile-form-cancel");
const avatarPickerCircle = requireEl<HTMLDivElement>("avatar-picker-circle");
const avatarPickerInitial = requireEl<HTMLElement>("avatar-picker-initial");
const avatarFileInput = requireEl<HTMLInputElement>("avatar-file-input");

const webviewContainer = requireEl<HTMLDivElement>("webview-container");

// null = we're creating a new profile, otherwise holds the id being edited
let editingProfileId: string | null = null;
let pendingAvatarDataUrl: string | null = null;

profileBtn.onclick = () => {
  profilePopup.classList.toggle("hidden");
  profileBtn.classList.toggle("open");
};

// close the profile popup if you click anywhere outside it
document.addEventListener("click", (event) => {
  if (
    !profileBtn.contains(event.target as Node) &&
    !profilePopup.contains(event.target as Node)
  ) {
    closeProfilePopup();
  }
});

settingsBtn.onclick = () => {
  settingsModal.classList.toggle("hidden");
  closeProfilePopup();
  if (!settingsModal.classList.contains("hidden")) {
    // always open fresh on the list view, not whatever was last showing
    resetProfileForm();
    switchProfileSubtab("list");
  }
};
closeModalBtn.onclick = () => settingsModal.classList.add("hidden");

// top-level settings tabs (profiles / about)
document.querySelectorAll<HTMLButtonElement>(".tab-btn").forEach((btn) => {
  btn.onclick = () => {
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelectorAll(".tab-panel")
      .forEach((p) => p.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`)!.classList.add("active");
  };
});

function switchProfileSubtab(name: string): void {
  document
    .querySelectorAll<HTMLButtonElement>(".subtab-btn")
    .forEach((b) => b.classList.toggle("active", b.dataset.subtab === name));
  document
    .querySelectorAll(".subtab-panel")
    .forEach((p) => p.classList.toggle("active", p.id === `subtab-${name}`));
}

document.querySelectorAll<HTMLButtonElement>(".subtab-btn").forEach((btn) => {
  btn.onclick = () => {
    // clicking "Add New" while not already editing something should reset the form
    if (btn.dataset.subtab === "edit" && editingProfileId === null) {
      resetProfileForm();
    }
    switchProfileSubtab(btn.dataset.subtab!);
  };
});

// fallback avatar look for profiles without a picture - colored circle + first letter
function getAvatarProps(name: string): { color: string; initial: string } {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return { color: "#da7756", initial };
}

function avatarHtml(profile: Profile, sizeClass = "profile-avatar"): string {
  if (profile.avatar) {
    return `<img class="${sizeClass}" src="${profile.avatar}" alt="" />`;
  }
  const { color, initial } = getAvatarProps(profile.name);
  return `<span class="${sizeClass}" style="background: ${color}">${initial}</span>`;
}

// resize/crop whatever image the user picked down to a small square jpeg
// so we're not stuffing huge base64 blobs into profiles.json
function fileToAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not read image"));
      img.onload = () => {
        const size = 128;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;

        // scale to cover then center-crop, like object-fit: cover
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// updates the little avatar circle in the add/edit form based on current state
function renderAvatarPicker(): void {
  const rawName = profileFormName.value.trim();

  if (pendingAvatarDataUrl) {
    avatarPickerCircle.style.backgroundImage = `url(${pendingAvatarDataUrl})`;
    avatarPickerCircle.style.backgroundColor = "transparent";
    avatarPickerInitial.style.display = "none";
  } else if (rawName) {
    const { color, initial } = getAvatarProps(rawName);
    avatarPickerCircle.style.backgroundImage = "none";
    avatarPickerCircle.style.backgroundColor = color;
    avatarPickerInitial.textContent = initial;
    avatarPickerInitial.style.color = "rgba(0, 0, 0, 0.7)";
    avatarPickerInitial.style.display = "flex";
  } else {
    // nothing typed yet and no image - show the placeholder plus icon
    avatarPickerCircle.style.backgroundImage = "none";
    avatarPickerCircle.style.backgroundColor = "var(--surface-2)";
    avatarPickerCircle.classList.add("is-placeholder");
    return;
  }

  avatarPickerCircle.classList.remove("is-placeholder");
}

avatarPickerCircle.onclick = () => avatarFileInput.click();
avatarFileInput.onchange = async () => {
  const file = avatarFileInput.files?.[0];
  if (!file) return;
  pendingAvatarDataUrl = await fileToAvatarDataUrl(file);
  renderAvatarPicker();
  avatarFileInput.value = ""; // so picking the same file twice still fires onchange
};
profileFormName.addEventListener("input", renderAvatarPicker);

function resetProfileForm(): void {
  editingProfileId = null;
  pendingAvatarDataUrl = null;
  profileFormName.value = "";
  profileFormHeading.textContent = "New profile";
  profileFormSave.textContent = "Create profile";
  renderAvatarPicker();
}

function openProfileForm(profile: Profile): void {
  editingProfileId = profile.id;
  pendingAvatarDataUrl = profile.avatar || null;
  profileFormName.value = profile.name;
  profileFormHeading.textContent = `Edit "${profile.name}"`;
  profileFormSave.textContent = "Save changes";
  renderAvatarPicker();
  switchProfileSubtab("edit");
}

profileFormCancel.onclick = () => {
  resetProfileForm();
  switchProfileSubtab("list");
};

profileFormSave.onclick = async () => {
  const name = profileFormName.value.trim();
  if (!name) return;

  if (editingProfileId === null) {
    // creating a new profile - jump straight into it once it's made
    const updatedProfiles = await window.electronAPI.createProfile(
      name,
      pendingAvatarDataUrl,
    );
    resetProfileForm();
    switchProfileSubtab("list");
    await loadProfiles();

    const newProfile = updatedProfiles[updatedProfiles.length - 1];
    setMainProfile(newProfile.id);
    settingsModal.classList.add("hidden");
  } else {
    await window.electronAPI.editProfile(
      editingProfileId,
      name,
      pendingAvatarDataUrl,
    );
    if (primaryProfileId === editingProfileId) {
      currentProfileLabel.textContent = name;
    }
    resetProfileForm();
    switchProfileSubtab("list");
    await loadProfiles();
  }
};

// enter key in the name field = save, same as clicking the button
profileFormName.addEventListener("keypress", (e) => {
  if (e.key === "Enter") profileFormSave.click();
});

// ---------------------------------------------------------------------------
// Split view: the main view (picked from the title bar dropdown, same as
// always) plus an optional second view on its right. The second view is chosen
// with the split button next to each profile in the dropdown.
//
// The main pane is never moved or recreated when the split opens/closes -
// detaching a <webview> reloads the page inside it, which would throw away
// whatever you were in the middle of.
// ---------------------------------------------------------------------------
const MIN_PANE_WIDTH = 260;

let profilesCache: Profile[] = [];
let primaryProfileId: string | null = null;
let splitProfileId: string | null = null;

// A view = the pane element, the host the webview lives in, and a little
// Chrome-style tab tucked into the page's bottom corner (only shown while
// split) with the profile name and a close button.
interface PaneView {
  root: HTMLDivElement;
  host: HTMLDivElement;
  label: HTMLSpanElement;
  closeBtn: HTMLButtonElement;
}

function createPaneView(): PaneView {
  const root = document.createElement("div");
  root.className = "pane";

  const host = document.createElement("div");
  host.className = "pane-host";

  const tab = document.createElement("div");
  tab.className = "pane-tab";
  const label = document.createElement("span");
  label.className = "pane-tab-label";
  const closeBtn = document.createElement("button");
  closeBtn.className = "pane-tab-close";
  closeBtn.type = "button";
  closeBtn.title = "Close this view";
  // drawn as an svg (not a text glyph) so it centers exactly, whatever font is in use
  closeBtn.innerHTML =
    '<svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">' +
    '<path d="M1 1 L7 7 M7 1 L1 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/>' +
    "</svg>";
  tab.append(label, closeBtn);

  root.append(host, tab);
  return { root, host, label, closeBtn };
}

let mainPane = createPaneView();
webviewContainer.appendChild(mainPane.root);
let splitPane: PaneView | null = null;
let splitDivider: HTMLDivElement | null = null;

mainPane.closeBtn.onclick = () => closeMainPane();

function closeProfilePopup(): void {
  profilePopup.classList.add("hidden");
  profileBtn.classList.remove("open");
}

// (re)creates the webview inside a pane for the given profile
function mountIn(pane: PaneView, profileId: string): void {
  pane.host.innerHTML = "";
  const wv = document.createElement("webview");
  wv.setAttribute("partition", `persist:${profileId}`); // this is what actually isolates login/cookies per profile
  wv.setAttribute("src", "https://claude.ai/chat");
  pane.host.appendChild(wv);
}

function profileName(id: string | null): string {
  return profilesCache.find((p) => p.id === id)?.name ?? id ?? "";
}

function updateTabLabels(): void {
  mainPane.label.textContent = profileName(primaryProfileId);
  if (splitPane) splitPane.label.textContent = profileName(splitProfileId);
}

// main/split highlights in the dropdown: checkmark + soft highlight = main, lit button = split
function updateMenuHighlights(): void {
  document.querySelectorAll<HTMLElement>(".popup-item").forEach((item) => {
    const id = item.dataset.id;
    item.classList.toggle("active-item", id === primaryProfileId);
    item.classList.toggle("split-item", id === splitProfileId);
    item
      .querySelector(".split-item-btn")
      ?.classList.toggle("on", id === splitProfileId);
  });
  webviewContainer.classList.toggle("split-active", splitPane !== null);
  updateTabLabels();
}

function setMainProfile(profileId: string): void {
  if (primaryProfileId === profileId) return; // already on this one, nothing to do
  const profile = profilesCache.find((p) => p.id === profileId);

  mountIn(mainPane, profileId);
  primaryProfileId = profileId;
  currentProfileLabel.textContent = profile ? profile.name : profileId;
  localStorage.setItem("lastActiveProfileId", profileId);
  updateMenuHighlights();
}

// drag the divider to resize the two views
function startResize(event: MouseEvent): void {
  if (!splitPane || !splitDivider) return;
  event.preventDefault();

  const right = splitPane.root;
  const left = mainPane.root;
  const divider = splitDivider;
  const startX = event.clientX;
  const leftStart = left.getBoundingClientRect().width;
  const rightStart = right.getBoundingClientRect().width;
  const total = leftStart + rightStart;

  webviewContainer.classList.add("resizing"); // stops the webviews swallowing mouse events
  divider.classList.add("active");

  const onMove = (e: MouseEvent) => {
    let newLeft = leftStart + (e.clientX - startX);
    newLeft = Math.max(
      MIN_PANE_WIDTH,
      Math.min(total - MIN_PANE_WIDTH, newLeft),
    );
    left.style.flexGrow = String(newLeft);
    right.style.flexGrow = String(total - newLeft);
  };
  const onUp = () => {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    webviewContainer.classList.remove("resizing");
    divider.classList.remove("active");
  };
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

// null closes the split view and leaves just the main view
function setSplitProfile(profileId: string | null): void {
  if (profileId === null) {
    splitDivider?.remove();
    splitPane?.root.remove();
    splitDivider = null;
    splitPane = null;
    splitProfileId = null;
    mainPane.root.style.flexGrow = "1";
    localStorage.removeItem("splitProfileId");
    updateMenuHighlights();
    return;
  }

  if (!splitPane) {
    splitDivider = document.createElement("div");
    splitDivider.className = "pane-divider";
    splitDivider.addEventListener("mousedown", startResize);
    splitPane = createPaneView();
    splitPane.closeBtn.onclick = () => setSplitProfile(null);
    webviewContainer.append(splitDivider, splitPane.root);
    mainPane.root.style.flexGrow = "1";
  } else if (splitProfileId === profileId) {
    return;
  }

  mountIn(splitPane, profileId);
  splitProfileId = profileId;
  localStorage.setItem("splitProfileId", profileId);
  updateMenuHighlights();
}

// closing the left tab: the split view takes over as the main view. Its pane
// is kept as-is (not re-mounted), so whatever you had open in it isn't reloaded.
function closeMainPane(): void {
  if (!splitPane || splitProfileId === null) return;

  splitDivider?.remove();
  mainPane.root.remove();

  mainPane = splitPane;
  splitPane = null;
  splitDivider = null;
  mainPane.closeBtn.onclick = () => closeMainPane();
  mainPane.root.style.flexGrow = "1";

  primaryProfileId = splitProfileId;
  splitProfileId = null;
  currentProfileLabel.textContent = profileName(primaryProfileId);
  localStorage.setItem("lastActiveProfileId", primaryProfileId);
  localStorage.removeItem("splitProfileId");
  updateMenuHighlights();
}

// promise-based confirm dialog since we can't use the native confirm() with a frameless window
function showCustomConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    requireEl<HTMLElement>("confirm-message").textContent = message;
    requireEl<HTMLElement>("confirm-modal").classList.remove("hidden");

    const yesBtn = requireEl<HTMLButtonElement>("confirm-yes-btn");
    const cancelBtn = requireEl<HTMLButtonElement>("confirm-cancel-btn");

    const cleanup = () => {
      yesBtn.onclick = null;
      cancelBtn.onclick = null;
      requireEl<HTMLElement>("confirm-modal").classList.add("hidden");
    };

    yesBtn.onclick = () => {
      cleanup();
      resolve(true);
    };
    cancelBtn.onclick = () => {
      cleanup();
      resolve(false);
    };
  });
}

async function loadProfiles(): Promise<void> {
  const profiles = await window.electronAPI.getProfiles();

  profileList.innerHTML = "";
  settingsProfileList.innerHTML = "";
  profilesCache = profiles;

  profiles.forEach((p) => {
    // dropdown entry: click the row for the main view, the split button for the second view
    const div = document.createElement("div");
    div.dataset.id = p.id;
    div.className = "popup-item";

    // left part: the profile itself (main view)
    const mainPart = document.createElement("div");
    mainPart.className = "popup-item-main";
    mainPart.innerHTML = avatarHtml(p, "profile-avatar");

    const nameEl = document.createElement("span");
    nameEl.style.cssText = "flex-grow: 1; margin-left: 8px;";
    nameEl.textContent = p.name;
    mainPart.appendChild(nameEl);

    const check = document.createElement("span");
    check.className = "check-icon";
    check.textContent = "\u2713";
    mainPart.appendChild(check);

    mainPart.onclick = () => {
      setMainProfile(p.id);
      closeProfilePopup();
    };

    // right part: a separate button for the split view, lights up when this profile is split
    const splitItemBtn = document.createElement("button");
    splitItemBtn.className = "split-item-btn";
    splitItemBtn.type = "button";
    splitItemBtn.title = "Open in split view";
    splitItemBtn.textContent = "\u25EB";
    splitItemBtn.onclick = (e) => {
      e.stopPropagation();
      // clicking the one that's already split closes the split view
      setSplitProfile(splitProfileId === p.id ? null : p.id);
      closeProfilePopup();
    };

    div.append(mainPart, splitItemBtn);
    profileList.appendChild(div);
    // settings tab card for the same profile
    const settingsItem = document.createElement("div");
    settingsItem.className = "settings-profile-card";

    const identity = document.createElement("div");
    identity.className = "settings-profile-identity";
    identity.innerHTML = `
      ${avatarHtml(p, "profile-avatar profile-avatar-lg")}
      <span class="settings-profile-name">${p.name}</span>
    `;
    settingsItem.appendChild(identity);

    const actionContainer = document.createElement("div");
    actionContainer.className = "profile-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.textContent = "Edit";
    editBtn.onclick = () => openProfileForm(p);
    actionContainer.appendChild(editBtn);

    // can't delete the Default profile, so just don't render the button for it
    if (p.id !== "Default") {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = "Delete";
      deleteBtn.onclick = async () => {
        const confirmDelete = await showCustomConfirm(
          `Wipe all data for "${p.name}"?`,
        );
        if (confirmDelete) {
          await window.electronAPI.deleteProfile(p.id);
          if (splitProfileId === p.id) setSplitProfile(null);
          if (primaryProfileId === p.id) {
            // if you delete the profile you're currently on, bounce back to Default
            setMainProfile("Default");
          }
          await loadProfiles();
        }
      };
      actionContainer.appendChild(deleteBtn);
    }

    settingsItem.appendChild(actionContainer);
    settingsProfileList.appendChild(settingsItem);
  });

  if (primaryProfileId === null) {
    // first load - restore whatever was active last time, or fall back to the first profile
    const savedId = localStorage.getItem("lastActiveProfileId");
    const profileToLoad = profiles.find((p) => p.id === savedId) || profiles[0];
    if (profileToLoad) setMainProfile(profileToLoad.id);

    const savedSplit = localStorage.getItem("splitProfileId");
    if (savedSplit && profiles.some((p) => p.id === savedSplit)) {
      setSplitProfile(savedSplit);
    }
  } else {
    // names/avatars may have changed
    const main = profiles.find((p) => p.id === primaryProfileId);
    if (main) currentProfileLabel.textContent = main.name;
  }
  updateMenuHighlights();
}

resetProfileForm();
loadProfiles();
