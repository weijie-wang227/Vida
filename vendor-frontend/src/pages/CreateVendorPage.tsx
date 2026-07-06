import { useState, type FormEvent } from "react";
import { Loader2, Link, Store, Text } from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";

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
  const [name, setName] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onCreate({ name, profileUrl, description });
  };

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

          <label>
            <span>Profile URL</span>
            <div className="auth-field">
              <Link size={16} />
              <input
                value={profileUrl}
                onChange={(event) => setProfileUrl(event.target.value)}
                placeholder="https://example.com"
                type="url"
              />
            </div>
          </label>

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

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={16} className="spin" /> : <Store size={16} />}
            Create vendor
          </button>
        </form>
      </section>
    </main>
  );
}
