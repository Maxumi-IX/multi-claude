document.getElementById("min-btn").onclick = () =>
  window.electronAPI.minimize();
document.getElementById("max-btn").onclick = () =>
  window.electronAPI.maximize();
document.getElementById("close-btn").onclick = () => window.electronAPI.close();

const profileBtn = document.getElementById("profile-btn");
const profilePopup = document.getElementById("profile-popup");
const profileList = document.getElementById("profile-list");
const currentProfileLabel = document.getElementById("current-profile");

const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const settingsProfileList = document.getElementById("settings-profile-list");

const profileFormHeading = document.getElementById("profile-form-heading");
const profileFormName = document.getElementById("profile-form-name");
const profileFormSave = document.getElementById("profile-form-save");
const profileFormCancel = document.getElementById("profile-form-cancel");
const avatarPickerCircle = document.getElementById("avatar-picker-circle");
const avatarPickerInitial = document.getElementById("avatar-picker-initial");
const avatarFileInput = document.getElementById("avatar-file-input");

const webviewContainer = document.getElementById("webview-container");
let activeProfileId = null;

// null = we're creating a new profile, otherwise holds the id being edited
let editingProfileId = null;
let pendingAvatarDataUrl = null;

profileBtn.onclick = () => {
  profilePopup.classList.toggle("hidden");
  profileBtn.classList.toggle("open");
};

// close the profile popup if you click anywhere outside it
document.addEventListener("click", (event) => {
  if (
    !profileBtn.contains(event.target) &&
    !profilePopup.contains(event.target)
  ) {
    profilePopup.classList.add("hidden");
    profileBtn.classList.remove("open");
  }
});

settingsBtn.onclick = () => {
  settingsModal.classList.toggle("hidden");
  profilePopup.classList.add("hidden");
  profileBtn.classList.remove("open");
  if (!settingsModal.classList.contains("hidden")) {
    // always open fresh on the list view, not whatever was last showing
    resetProfileForm();
    switchProfileSubtab("list");
  }
};
closeModalBtn.onclick = () => settingsModal.classList.add("hidden");

// top-level settings tabs (profiles / about)
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.onclick = () => {
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelectorAll(".tab-panel")
      .forEach((p) => p.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  };
});

function switchProfileSubtab(name) {
  document
    .querySelectorAll(".subtab-btn")
    .forEach((b) => b.classList.toggle("active", b.dataset.subtab === name));
  document
    .querySelectorAll(".subtab-panel")
    .forEach((p) => p.classList.toggle("active", p.id === `subtab-${name}`));
}

document.querySelectorAll(".subtab-btn").forEach((btn) => {
  btn.onclick = () => {
    // clicking "Add New" while not already editing something should reset the form
    if (btn.dataset.subtab === "edit" && editingProfileId === null) {
      resetProfileForm();
    }
    switchProfileSubtab(btn.dataset.subtab);
  };
});

// fallback avatar look for profiles without a picture - colored circle + first letter
function getAvatarProps(name) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return { color: "#da7756", initial };
}

function avatarHtml(profile, sizeClass = "profile-avatar") {
  if (profile.avatar) {
    return `<img class="${sizeClass}" src="${profile.avatar}" alt="" />`;
  }
  const { color, initial } = getAvatarProps(profile.name);
  return `<span class="${sizeClass}" style="background: ${color}">${initial}</span>`;
}

// resize/crop whatever image the user picked down to a small square jpeg
// so we're not stuffing huge base64 blobs into profiles.json
function fileToAvatarDataUrl(file) {
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
        const ctx = canvas.getContext("2d");

        // scale to cover then center-crop, like object-fit: cover
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// updates the little avatar circle in the add/edit form based on current state
function renderAvatarPicker() {
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
  const file = avatarFileInput.files[0];
  if (!file) return;
  pendingAvatarDataUrl = await fileToAvatarDataUrl(file);
  renderAvatarPicker();
  avatarFileInput.value = ""; // so picking the same file twice still fires onchange
};
profileFormName.addEventListener("input", renderAvatarPicker);

function resetProfileForm() {
  editingProfileId = null;
  pendingAvatarDataUrl = null;
  profileFormName.value = "";
  profileFormHeading.textContent = "New profile";
  profileFormSave.textContent = "Create profile";
  renderAvatarPicker();
}

function openProfileForm(profile) {
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
    mountWebview(newProfile.id, newProfile.name);
    settingsModal.classList.add("hidden");
  } else {
    await window.electronAPI.editProfile(
      editingProfileId,
      name,
      pendingAvatarDataUrl,
    );
    if (activeProfileId === editingProfileId) {
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

// swaps out the webview for the given profile's session/partition
function mountWebview(profileId, profileName) {
  if (activeProfileId === profileId) return; // already on this one, nothing to do

  webviewContainer.innerHTML = "";
  const wv = document.createElement("webview");
  wv.setAttribute("partition", `persist:${profileId}`); // this is what actually isolates login/cookies per profile
  wv.setAttribute("src", "https://claude.ai/chat");
  wv.style.width = "100%";
  wv.style.height = "100%";

  webviewContainer.appendChild(wv);
  activeProfileId = profileId;
  currentProfileLabel.textContent = profileName;

  localStorage.setItem("lastActiveProfileId", profileId);

  // update the checkmark on whichever profile is active in the dropdown
  document.querySelectorAll(".popup-item").forEach((item) => {
    if (item.dataset.id === profileId) {
      item.classList.add("active-item");
    } else {
      item.classList.remove("active-item");
    }
  });
}

// promise-based confirm dialog since we can't use the native confirm() with a frameless window
function showCustomConfirm(message) {
  return new Promise((resolve) => {
    document.getElementById("confirm-message").textContent = message;
    document.getElementById("confirm-modal").classList.remove("hidden");

    const yesBtn = document.getElementById("confirm-yes-btn");
    const cancelBtn = document.getElementById("confirm-cancel-btn");

    const cleanup = () => {
      yesBtn.onclick = null;
      cancelBtn.onclick = null;
      document.getElementById("confirm-modal").classList.add("hidden");
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

async function loadProfiles() {
  const profiles = await window.electronAPI.getProfiles();

  profileList.innerHTML = "";
  settingsProfileList.innerHTML = "";

  profiles.forEach((p) => {
    // dropdown entry
    const div = document.createElement("div");
    div.dataset.id = p.id;
    div.className = `popup-item ${p.id === activeProfileId ? "active-item" : ""}`;
    div.innerHTML = `
      ${avatarHtml(p, "profile-avatar")}
      <span style="flex-grow: 1; margin-left: 8px;">${p.name}</span>
      <span class="check-icon">✓</span>
    `;
    div.onclick = () => {
      mountWebview(p.id, p.name);
      profilePopup.classList.add("hidden");
      profileBtn.classList.remove("open");
    };
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
          if (activeProfileId === p.id) {
            // if you delete the profile you're currently on, bounce back to Default
            const defaultProfile = profiles.find(
              (prof) => prof.id === "Default",
            );
            mountWebview("Default", defaultProfile.name);
          }
          await loadProfiles();
        }
      };
      actionContainer.appendChild(deleteBtn);
    }

    settingsItem.appendChild(actionContainer);
    settingsProfileList.appendChild(settingsItem);
  });

  // first load - restore whatever profile was active last time, or just fall back to the first one
  if (profiles.length > 0 && !activeProfileId) {
    const savedId = localStorage.getItem("lastActiveProfileId");
    const profileToLoad = profiles.find((p) => p.id === savedId) || profiles[0];
    mountWebview(profileToLoad.id, profileToLoad.name);
  }
}

resetProfileForm();
loadProfiles();
