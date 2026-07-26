import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { ImagePlus, Loader2, Store, Text } from "lucide-react";
import { uploadImageToR2 } from "../api/uploads";
import { BrandLogo } from "../components/BrandLogo";

const maxProfileImageBytes = 3 * 1024 * 1024;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });
}

type CreateVendorPageProps = {
  error: string | null;
  isSubmitting: boolean;
  onCreate: (input: {
    name: string;
    profileUrl?: string;
    description?: string;
  }) => Promise<void>;
};

export function CreateVendorPage({
  error,
  isSubmitting,
  onCreate,
}: CreateVendorPageProps) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const [profileImageName, setProfileImageName] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const clearProfileImage = () => {
    setProfileImage(null);
    setProfileImagePreview("");
    setProfileImageName("");

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

    setUploadError(null);

    if (!file.type.startsWith("image/")) {
      setUploadError("Choose a PNG, JPEG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > maxProfileImageBytes) {
      setUploadError("Choose an image under 3 MB.");
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);

      setProfileImage(file);
      setProfileImagePreview(dataUrl);
      setProfileImageName(file.name);
    } catch (imageError) {
      setUploadError(
        imageError instanceof Error
          ? imageError.message
          : "Unable to read image.",
      );
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUploadError(null);
    setIsUploadingImage(true);

    try {
      const profileUrl = profileImage
        ? await uploadImageToR2(profileImage, "vendor")
        : "";

      await onCreate({ name, profileUrl, description });
    } catch (submissionError) {
      setUploadError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to upload the vendor image.",
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const isBusy = isSubmitting || isUploadingImage;

  return (
    <main className="auth-page">
      <section className="auth-card vendor-create-card">
        <div className="auth-card__brand">
          <BrandLogo />
          <div className="auth-card__badge">
            <Store size={16} />
            New vendor
          </div>
        </div>

        <h1>Create your vendor profile</h1>
        <p>
          We found your Vida account, but there is no vendor profile attached to
          it yet.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Vendor name</span>
            <div className="auth-field">
              <Store size={16} />
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Vida Wellness Studio"
                required
              />
            </div>
          </label>

          <div className="vendor-profile-form__image">
            {profileImagePreview ? (
              <img src={profileImagePreview} alt="Vendor profile preview" />
            ) : (
              <span>{name.trim().slice(0, 1).toUpperCase() || "V"}</span>
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
                disabled={isBusy}
              >
                <ImagePlus size={15} />
                Choose image
              </button>
              {profileImage && (
                <button
                  type="button"
                  className="secondary-action"
                  onClick={clearProfileImage}
                  disabled={isBusy}
                >
                  Remove
                </button>
              )}
            </div>
            {profileImageName && <p>{profileImageName}</p>}
          </div>

          <label>
            <span>Description</span>
            <div className="auth-field auth-field--textarea">
              <Text size={16} />
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Tell customers what you offer."
                rows={4}
              />
            </div>
          </label>

          {(uploadError || error) && (
            <p className="form-error">{uploadError || error}</p>
          )}

          <button type="submit" className="auth-submit" disabled={isBusy}>
            {isBusy ? <Loader2 size={16} className="spin" /> : <Store size={16} />}
            Create vendor
          </button>
        </form>
      </section>
    </main>
  );
}
