import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  CalendarPlus,
  ChevronDown,
  CircleDollarSign,
  GraduationCap,
  HandHeart,
  Image,
  Loader2,
  RotateCcw,
  Star,
} from "lucide-react";
import type {
  AvailableTag,
  CreateActivityInput,
  CreateVendorActivityResponse,
  Vendor,
  VidaCategory,
} from "../api/types";
import { fetchAvailableTags } from "../api/tags";
import { uploadImageToR2 } from "../api/uploads";
import { Card } from "../components/Card";

const categories: Array<{ value: VidaCategory; label: string }> = [
  { value: "physical", label: "Physical" },
  { value: "social", label: "Social" },
  { value: "cognitive", label: "Cognitive" },
  { value: "creative", label: "Creative" },
];

type PaymentMode = "free" | "premium" | "skillsfuture";
type SelectedActivityImage = {
  file: File;
  previewUrl: string;
};
const maxActivityImages = 5;

export function CreateActivityPage({
  vendor,
  error,
  isSubmitting,
  onCreateActivity,
}: {
  vendor: Vendor | null;
  error: string | null;
  isSubmitting: boolean;
  onCreateActivity: (
    input: CreateActivityInput,
  ) => Promise<CreateVendorActivityResponse>;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [suitability, setSuitability] = useState("");
  const [availableTags, setAvailableTags] = useState<AvailableTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [tagLoadError, setTagLoadError] = useState<string | null>(null);
  const [activityImages, setActivityImages] = useState<SelectedActivityImage[]>(
    [],
  );
  const activityImagesRef = useRef(activityImages);
  const [selectedCategories, setSelectedCategories] = useState<VidaCategory[]>(
    [],
  );
  const [isVolunteer, setIsVolunteer] = useState(
    searchParams.get("volunteer") === "true",
  );
  const [credits, setCredits] = useState("0");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("free");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const selectedTagNames = availableTags
    .filter((tag) => selectedTagIds.includes(tag.id))
    .map((tag) => tag.name);

  useEffect(() => {
    activityImagesRef.current = activityImages;
  }, [activityImages]);

  useEffect(() => {
    return () => {
      activityImagesRef.current.forEach(({ previewUrl }) =>
        URL.revokeObjectURL(previewUrl),
      );
    };
  }, []);

  useEffect(() => {
    if (isVolunteer || paymentMode === "free") {
      setCredits("0");
    }
  }, [isVolunteer, paymentMode]);

  useEffect(() => {
    let isActive = true;

    setIsLoadingTags(true);
    setTagLoadError(null);
    fetchAvailableTags()
      .then((tags) => {
        if (isActive) {
          setAvailableTags(tags);
        }
      })
      .catch(() => {
        if (isActive) {
          setAvailableTags([]);
          setTagLoadError("Unable to load available tags.");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingTags(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const toggleCategory = (category: VidaCategory) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId],
    );
  };

  const selectActivityImages = (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    if (activityImages.length + selectedFiles.length > maxActivityImages) {
      setLocalError(
        `You can upload up to ${maxActivityImages} activity images.`,
      );
      return;
    }

    setActivityImages((current) => [
      ...current,
      ...selectedFiles.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
    setLocalError(null);
  };

  const removeActivityImage = (previewUrl: string) => {
    URL.revokeObjectURL(previewUrl);
    setActivityImages((current) =>
      current.filter((image) => image.previewUrl !== previewUrl),
    );
  };

  const resetForm = () => {
    activityImages.forEach(({ previewUrl }) =>
      URL.revokeObjectURL(previewUrl),
    );
    setTitle("");
    setDescription("");
    setSuitability("");
    setSelectedTagIds([]);
    setActivityImages([]);
    setSelectedCategories([]);
    setIsVolunteer(searchParams.get("volunteer") === "true");
    setCredits("0");
    setPaymentMode("free");
    setLocalError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    if (!vendor) {
      setLocalError("Create a vendor profile before adding activities.");
      return;
    }

    if (selectedCategories.length === 0) {
      setLocalError("Choose at least one category.");
      return;
    }

    const creditsValue =
      isVolunteer || paymentMode === "free" ? 0 : Number(credits);

    if (!Number.isFinite(creditsValue) || creditsValue < 0) {
      setLocalError("Credits cannot be negative.");
      return;
    }

    const payload: CreateActivityInput = {
      title: title.trim(),
      description: description.trim(),
      suitability: suitability.trim(),
      categories: selectedCategories,
      imageUrls: [],
      tagIds: selectedTagIds,
      isVolunteer,
      vendorId: vendor.id,
      createAsVendor: true,
      credits: creditsValue,
      isPremium: !isVolunteer && paymentMode === "premium",
      skillsFuturePayable: !isVolunteer && paymentMode === "skillsfuture",
    };

    try {
      setIsUploadingImages(true);
      if (activityImages.length > 0) {
        payload.imageUrls = await Promise.all(
          activityImages.map(({ file }) => uploadImageToR2(file, "activities")),
        );
      }

      const response = await onCreateActivity(payload);
      navigate(`/activities/${response.activity.id}`);
    } catch (submissionError) {
      setLocalError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create activity.",
      );
    } finally {
      setIsUploadingImages(false);
    }
  };

  return (
    <div className="dashboard__main dashboard__main--full">
      <button
        type="button"
        className="back-button"
        onClick={resetForm}
        disabled={isSubmitting || isUploadingImages}
      >
        <RotateCcw size={16} />
        Reset
      </button>

      <Card title="Create Activity">
        <form className="activity-form" onSubmit={handleSubmit}>
          <label className="activity-form__wide volunteer-activity-toggle">
            <span className="volunteer-activity-toggle__copy">
              <HandHeart size={18} />
              <span>
                <strong>Volunteer activity</strong>
                <small>
                  Volunteer sessions are always free and appear in Volunteer
                  Management.
                </small>
              </span>
            </span>
            <span className="volunteer-activity-toggle__control">
              <input
                type="checkbox"
                role="switch"
                checked={isVolunteer}
                onChange={(event) => setIsVolunteer(event.target.checked)}
                aria-label="Create as a volunteer activity"
              />
              <span aria-hidden="true" />
            </span>
          </label>

          <label>
            <span>Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>

          <fieldset className="activity-form__wide tag-fieldset">
            <legend>Tags</legend>
            {isLoadingTags ? (
              <p>Loading available tags...</p>
            ) : tagLoadError ? (
              <p className="form-error">{tagLoadError}</p>
            ) : availableTags.length === 0 ? (
              <p>No tags are available.</p>
            ) : (
              <details className="tag-dropdown">
                <summary>
                  <span>
                    {selectedTagNames.length > 0
                      ? selectedTagNames.join(", ")
                      : "Select tags"}
                  </span>
                  <ChevronDown size={17} />
                </summary>
                <div className="tag-dropdown__menu" role="group" aria-label="Tags">
                  {availableTags.map((tag) => (
                    <label
                      key={tag.id}
                      className={
                        selectedTagIds.includes(tag.id)
                          ? "tag-option tag-option--active"
                          : "tag-option"
                      }
                    >
                      <input
                        type="checkbox"
                        checked={selectedTagIds.includes(tag.id)}
                        onChange={() => toggleTag(tag.id)}
                      />
                      <span>{tag.name}</span>
                    </label>
                  ))}
                </div>
              </details>
            )}
          </fieldset>

          <label className="activity-form__wide">
            <span>Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              placeholder="Describe the activity, goals, and what participants can expect."
            />
          </label>

          <label className="activity-form__wide">
            <span>Suitability</span>
            <textarea
              value={suitability}
              onChange={(event) => setSuitability(event.target.value)}
              maxLength={500}
              placeholder="Describe who this activity is suitable for."
            />
          </label>

          <label className="activity-form__wide activity-cover-field">
            <span>
              <Image size={15} />
              Activity Images ({activityImages.length}/{maxActivityImages})
            </span>
            {activityImages.length > 0 ? (
              <div className="activity-image-previews">
                {activityImages.map(({ file, previewUrl }, index) => (
                  <figure key={previewUrl}>
                    <img src={previewUrl} alt={`${file.name} preview`} />
                    <button
                      type="button"
                      className="secondary-action"
                      onClick={() => removeActivityImage(previewUrl)}
                    >
                      Remove
                    </button>
                    {index === 0 && <small>Primary image</small>}
                  </figure>
                ))}
              </div>
            ) : (
              <div className="activity-image-empty">No images selected</div>
            )}
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              disabled={activityImages.length >= maxActivityImages}
              onChange={(event) => {
                selectActivityImages(event.target.files);
                event.currentTarget.value = "";
              }}
            />
            <small>
              Select up to five PNG, JPEG, or WebP images. The first image is
              used as the primary image.
            </small>
          </label>

          <fieldset className="activity-form__wide category-fieldset">
            <legend>Categories</legend>
            <div>
              {categories.map((category) => (
                <label
                  key={category.value}
                  className={`category-option category-option--${category.value} ${
                    selectedCategories.includes(category.value)
                      ? "category-option--active"
                      : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.value)}
                    onChange={() => toggleCategory(category.value)}
                  />
                  <span>{category.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {isVolunteer ? (
            <div className="activity-form__wide volunteer-activity-payment-note">
              <HandHeart size={18} />
              <div>
                <strong>Volunteer activity</strong>
                <span>Payment is disabled and this activity will be free.</span>
              </div>
            </div>
          ) : (
            <fieldset className="activity-form__wide activity-toggle-fieldset">
              <legend>Payment options</legend>
              <div>
                <label
                  className={`activity-toggle-card ${
                    paymentMode === "free" ? "activity-toggle-card--active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="activity-payment-mode"
                    checked={paymentMode === "free"}
                    onChange={() => setPaymentMode("free")}
                  />
                  <span>
                    <CircleDollarSign size={15} />
                    Free
                  </span>
                </label>
                <label
                  className={`activity-toggle-card ${
                    paymentMode === "premium"
                      ? "activity-toggle-card--active"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="activity-payment-mode"
                    checked={paymentMode === "premium"}
                    onChange={() => setPaymentMode("premium")}
                  />
                  <span>
                    <Star size={15} />
                    Premium
                  </span>
                </label>
                <label
                  className={`activity-toggle-card ${
                    paymentMode === "skillsfuture"
                      ? "activity-toggle-card--active"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="activity-payment-mode"
                    checked={paymentMode === "skillsfuture"}
                    onChange={() => setPaymentMode("skillsfuture")}
                  />
                  <span>
                    <GraduationCap size={15} />
                    SkillsFuture Payable
                  </span>
                </label>
              </div>
              <label className="activity-form__wide activity-credits-field">
                <span>Credits</span>
                <input
                  type="number"
                  min={0}
                  value={credits}
                  onChange={(event) => setCredits(event.target.value)}
                  disabled={paymentMode === "free"}
                  required
                />
              </label>
            </fieldset>
          )}

          {(localError || error) && (
            <p className="form-error activity-form__wide">
              {localError || error}
            </p>
          )}

          <button
            type="submit"
            className="primary-action activity-form__wide"
            disabled={isSubmitting || isUploadingImages}
          >
            {isSubmitting || isUploadingImages ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <CalendarPlus size={16} />
            )}
            Select Date and Time
          </button>
        </form>
      </Card>
    </div>
  );
}
