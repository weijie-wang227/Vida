import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  ChevronDown,
  Edit3,
  FileText,
  ImagePlus,
  LogOut,
  Loader2,
  Search,
  Settings,
  X,
} from "lucide-react";
import { uploadImageToR2 } from "../api/uploads";
import type { Vendor } from "../api/types";

const maxProfileImageBytes = 3 * 1024 * 1024;
const maxDescriptionLength = 500;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });
}

export function TopBar({
  accountName,
  onUpdateVendorProfile,
  onSignOut,
  vendor,
}: {
  accountName: string;
  onUpdateVendorProfile: (input: {
    profileUrl: string;
    description: string;
  }) => Promise<void>;
  onSignOut: () => void;
  vendor: Vendor | null;
}) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editDescription, setEditDescription] = useState(
    vendor?.description ?? "",
  );
  const [editProfileFile, setEditProfileFile] = useState<File | null>(null);
  const [editProfilePreview, setEditProfilePreview] = useState("");
  const [editImageName, setEditImageName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const editedProfileImageSrc = editProfilePreview || vendor?.profileUrl || "";

  const openEditProfile = () => {
    setEditDescription(vendor?.description ?? "");
    setEditProfileFile(null);
    setEditProfilePreview("");
    setEditImageName("");
    setEditError(null);
    setIsAccountMenuOpen(false);
    setIsEditProfileOpen(true);

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const closeEditProfile = () => {
    if (!isSavingProfile) {
      setIsEditProfileOpen(false);
      setEditError(null);
    }
  };

  const clearProfileImageFile = () => {
    setEditProfileFile(null);
    setEditProfilePreview("");
    setEditImageName("");

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleProfileImageChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setEditError(null);

    if (!file.type.startsWith("image/")) {
      setEditError("Choose a PNG, JPEG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > maxProfileImageBytes) {
      setEditError("Choose an image under 3 MB.");
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);

      setEditProfileFile(file);
      setEditProfilePreview(dataUrl);
      setEditImageName(file.name);
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "Unable to read image.",
      );
    }
  };

  const handleEditProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const description = editDescription.trim();

    if (description.length > maxDescriptionLength) {
      setEditError(
        `Description must be ${maxDescriptionLength} characters or less.`,
      );
      return;
    }

    setIsSavingProfile(true);
    setEditError(null);

    try {
      const profileUrl = editProfileFile
        ? await uploadImageToR2(editProfileFile, "vendor")
        : vendor?.profileUrl ?? "";

      await onUpdateVendorProfile({
        profileUrl,
        description,
      });
      setIsEditProfileOpen(false);
      clearProfileImageFile();
    } catch (error) {
      setEditError(
        error instanceof Error
          ? error.message
          : "Unable to update vendor profile.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <header className="topbar">
      <label className="topbar__search">
        <Search size={17} />
        <input placeholder="Search orders, products, promotions" />
      </label>

      <div className="topbar__actions">
        {/*
        <button type="button" className="icon-button" aria-label="Apps">
          <Grid3X3 size={19} />
        </button>
        <button type="button" className="icon-button" aria-label="Guidebook">
          <BookOpen size={19} />
        </button>
        <button type="button" className="icon-button" aria-label="Messages">
          <MessageCircle size={19} />
        </button>
        */}
        <div className="account-menu">
          <button
            type="button"
            className="account-button"
            onClick={() => setIsAccountMenuOpen((current) => !current)}
            aria-expanded={isAccountMenuOpen}
            aria-haspopup="menu"
          >
            <span className="account-button__avatar">
              {vendor?.profileUrl ? (
                <img src={vendor.profileUrl} alt="" />
              ) : (
                accountName.slice(0, 1).toUpperCase() || "V"
              )}
            </span>
            <span>{accountName}</span>
            <ChevronDown size={16} />
          </button>
          {isAccountMenuOpen && (
            <div className="account-menu__panel" role="menu">
              <button type="button" role="menuitem" onClick={openEditProfile}>
                <Edit3 size={15} />
                Edit Profile
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => setIsAccountMenuOpen(false)}
              >
                <Settings size={15} />
                Settings
              </button>
            </div>
          )}
        </div>
        <button type="button" className="icon-button" onClick={onSignOut} aria-label="Sign out">
          <LogOut size={18} />
        </button>
      </div>

      {isEditProfileOpen && (
        <div className="vendor-modal" role="dialog" aria-modal="true">
          <div className="vendor-modal__panel">
            <div className="vendor-modal__header">
              <div>
                <span>Edit Profile</span>
                <h2>{vendor?.name ?? accountName}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={closeEditProfile}
                aria-label="Close edit profile"
              >
                <X size={18} />
              </button>
            </div>

            <form className="vendor-profile-form" onSubmit={handleEditProfileSubmit}>
              <div className="vendor-profile-form__image">
                {editedProfileImageSrc ? (
                  <img src={editedProfileImageSrc} alt="" />
                ) : (
                  <span>{accountName.slice(0, 1).toUpperCase() || "V"}</span>
                )}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleProfileImageChange}
                />
                <div>
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <ImagePlus size={15} />
                    Choose photo
                  </button>
                  {editProfileFile && (
                    <button
                      type="button"
                      className="secondary-action"
                      onClick={clearProfileImageFile}
                    >
                      Remove
                    </button>
                  )}
                </div>
                {editImageName && <p>{editImageName}</p>}
              </div>

              <label>
                <span>Description</span>
                <div className="vendor-profile-form__textarea">
                  <FileText size={16} />
                  <textarea
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                    maxLength={maxDescriptionLength}
                    placeholder="Tell customers what your activities are about"
                  />
                </div>
                <em>
                  {editDescription.length}/{maxDescriptionLength}
                </em>
              </label>

              {editError && <p className="form-error">{editError}</p>}

              <button
                type="submit"
                className="primary-action"
                disabled={isSavingProfile}
              >
                {isSavingProfile && <Loader2 size={16} className="spin" />}
                Save Profile
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
