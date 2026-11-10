import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  ExternalLink,
  ImageOff,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Upload,
} from 'lucide-react';
import { getAdminHero, resetAdminHero, saveAdminHero, uploadAdminImage } from '../../api/admin';
import { DEFAULT_HERO_CONTENT, HERO_ALIGNMENT_OPTIONS } from '../../data/hero';
import heroFallback from '../../assets/hero.png';
import { broadcastStorefrontUpdate } from '../../utils/storefrontEvents';
import { AdminError, AdminField, AdminSpinner } from '../components/AdminUI';

const TEXT_FIELDS = [
  'heading',
  'headingHighlight',
  'subtitle',
  'description',
  'primaryButtonText',
  'primaryButtonLink',
  'secondaryButtonText',
  'secondaryButtonLink',
];

const EMPTY_FORM = {
  heading: '',
  headingHighlight: '',
  subtitle: '',
  description: '',
  backgroundImage: '',
  productImage: '',
  desktopBannerImage: '',
  mobileBannerImage: '',
  primaryButtonText: '',
  primaryButtonLink: '',
  secondaryButtonText: '',
  secondaryButtonLink: '',
  textAlign: 'left',
  isVisible: true,
};

const asForm = (hero) => {
  const source = hero || {};
  return {
    ...EMPTY_FORM,
    ...Object.fromEntries(
      Object.keys(EMPTY_FORM).map((key) => [
        key,
        typeof EMPTY_FORM[key] === 'boolean'
          ? source[key] !== false
          : String(source[key] ?? ''),
      ]),
    ),
  };
};

const bgStyle = (url) =>
  url ? { backgroundImage: `url(${JSON.stringify(url)})` } : undefined;

function HeroImageField({ label, hint, field, value, uploading, onChange, onUpload, onRemove }) {
  return (
    <div className="admin-field hero-image-field">
      <span className="admin-field-label">{label}</span>
      <div className="hero-image-control">
        <span className="hero-image-thumb">
          {value ? <img src={value} alt="" /> : <ImageOff size={20} />}
        </span>
        <div className="hero-image-control-body">
          <div className="admin-upload-row">
            <label className={`admin-upload-btn${uploading ? ' is-busy' : ''}`}>
              {uploading ? <Loader2 size={16} className="admin-spin" /> : <Upload size={16} />}
              {uploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) => onUpload(field, event)}
                disabled={uploading}
              />
            </label>
            {value ? (
              <button
                type="button"
                className="admin-btn admin-btn--danger-ghost admin-btn--sm"
                onClick={() => onRemove(field)}
                disabled={uploading}
              >
                Remove
              </button>
            ) : null}
          </div>
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(field, event.target.value)}
            placeholder="https://… or /api/uploads/…"
          />
          {hint ? <span className="admin-field-hint">{hint}</span> : null}
        </div>
      </div>
    </div>
  );
}

function HeroPreview({ form }) {
  const heading = form.heading.trim() || DEFAULT_HERO_CONTENT.heading;
  const headingHighlight = form.headingHighlight.trim() || DEFAULT_HERO_CONTENT.headingHighlight;
  const subtitle = form.subtitle.trim() || DEFAULT_HERO_CONTENT.subtitle;
  const description = form.description.trim() || DEFAULT_HERO_CONTENT.description;
  const primaryText = form.primaryButtonText.trim() || DEFAULT_HERO_CONTENT.primaryButtonText;
  const secondaryText =
    form.secondaryButtonText.trim() || DEFAULT_HERO_CONTENT.secondaryButtonText;
  const background =
    form.desktopBannerImage || form.mobileBannerImage || form.backgroundImage;
  const productImage = form.productImage || heroFallback;

  return (
    <div className="hero-admin-preview">
      <div className="hero-admin-preview-head">
        <span className="admin-section-kicker">Live preview</span>
        <span className={`admin-badge admin-badge--${form.isVisible ? 'done' : 'muted'}`}>
          {form.isVisible ? 'Visible on homepage' : 'Hidden'}
        </span>
      </div>

      <div
        className={`hero-admin-preview-canvas hero--align-${form.textAlign || 'left'}${
          background ? ' has-bg' : ''
        }`}
        style={bgStyle(background)}
      >
        {background ? <span className="hero-admin-preview-overlay" /> : null}
        <div className="hero-admin-preview-copy">
          <span className="hero-admin-preview-eyebrow">{subtitle}</span>
          <h3>
            {heading}
            {headingHighlight ? <span>{headingHighlight}</span> : null}
          </h3>
          <p>{description}</p>
          <div className="hero-admin-preview-actions">
            <span className="is-primary">{primaryText}</span>
            {secondaryText ? <span className="is-secondary">{secondaryText}</span> : null}
          </div>
        </div>
        <img className="hero-admin-preview-product" src={productImage} alt="" />
        {!form.isVisible ? (
          <span className="hero-admin-preview-hidden">
            <EyeOff size={16} />
            Hidden on the customer website
          </span>
        ) : null}
      </div>
      <p className="hero-admin-preview-note">
        <Eye size={13} />
        This preview updates as you type. Save to publish it on the live homepage.
      </p>
    </div>
  );
}

export default function AdminHero() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [uploadingField, setUploadingField] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminHero();
      setForm(asForm(data.hero));
    } catch (requestError) {
      setError(requestError.message || 'Could not load the hero configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    setError('');
    setNotice('');
  };

  const handleUpload = async (field, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Choose a JPEG, PNG, WebP or GIF image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Images must be 5 MB or smaller.');
      return;
    }

    setUploadingField(field);
    setError('');
    setNotice('');
    try {
      const data = await uploadAdminImage(file);
      setField(field, data.url);
    } catch (requestError) {
      setError(requestError.message || 'Could not upload the image.');
    } finally {
      setUploadingField('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving || uploadingField) return;

    const payload = { ...form };
    for (const field of TEXT_FIELDS) payload[field] = payload[field].trim();

    setSaving(true);
    setError('');
    setNotice('');
    setFieldErrors({});
    try {
      const data = await saveAdminHero(payload);
      setForm(asForm(data.hero));
      setNotice(data.message || 'Hero section saved.');
      broadcastStorefrontUpdate();
    } catch (requestError) {
      setError(requestError.message || 'Could not save the hero section.');
      if (requestError.fieldErrors) setFieldErrors(requestError.fieldErrors);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      'Restore the default hero content? Your current heading, copy, buttons and images will be replaced.',
    );
    if (!confirmed) return;

    setResetting(true);
    setError('');
    setNotice('');
    setFieldErrors({});
    try {
      const data = await resetAdminHero();
      setForm(asForm(data.hero));
      setNotice(data.message || 'Default hero content restored.');
      broadcastStorefrontUpdate();
    } catch (requestError) {
      setError(requestError.message || 'Could not restore the default hero content.');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <section className="admin-panel">
          <AdminSpinner label="Loading hero section" />
        </section>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-toolbar">
        <div>
          <span className="admin-section-kicker">Homepage</span>
          <h2>Hero Section</h2>
        </div>
        <div className="admin-toolbar-actions">
          <Link className="admin-btn admin-btn--ghost" to="/" target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            View storefront
          </Link>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={load} disabled={saving}>
            <RefreshCw size={16} />
            Reload
          </button>
        </div>
      </div>

      <AdminError message={error} onRetry={load} />
      {notice ? <p className="admin-success">{notice}</p> : null}

      <div className="hero-admin-grid">
        <form className="admin-form-stack" onSubmit={handleSubmit} noValidate>
          <section className="admin-panel hero-admin-section">
            <div className="admin-panel-head">
              <div>
                <h3>Hero content</h3>
                <p>The main headline and supporting copy shown above the product grid.</p>
              </div>
            </div>
            <div className="hero-admin-section-body">
              <div className="admin-form-grid">
                <AdminField label="Hero title / heading" error={fieldErrors.heading}>
                  <input
                    type="text"
                    value={form.heading}
                    onChange={(event) => setField('heading', event.target.value)}
                    placeholder={DEFAULT_HERO_CONTENT.heading}
                    maxLength={160}
                  />
                </AdminField>
                <AdminField
                  label="Highlighted title line"
                  hint="Displayed on the second line in the brand green."
                  error={fieldErrors.headingHighlight}
                >
                  <input
                    type="text"
                    value={form.headingHighlight}
                    onChange={(event) => setField('headingHighlight', event.target.value)}
                    placeholder={DEFAULT_HERO_CONTENT.headingHighlight}
                    maxLength={160}
                  />
                </AdminField>
              </div>

              <AdminField label="Hero subtitle / eyebrow" error={fieldErrors.subtitle}>
                <input
                  type="text"
                  value={form.subtitle}
                  onChange={(event) => setField('subtitle', event.target.value)}
                  placeholder={DEFAULT_HERO_CONTENT.subtitle}
                  maxLength={240}
                />
              </AdminField>

              <AdminField
                label="Hero description"
                hint="Keep it short so the calls to action stay above the fold."
                error={fieldErrors.description}
              >
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) => setField('description', event.target.value)}
                  placeholder={DEFAULT_HERO_CONTENT.description}
                  maxLength={800}
                />
              </AdminField>
            </div>
          </section>

          <section className="admin-panel hero-admin-section">
            <div className="admin-panel-head">
              <div>
                <h3>Imagery</h3>
                <p>JPEG, PNG or WebP up to 5 MB. Images are stored outside MongoDB; only URLs are saved.</p>
              </div>
            </div>
            <div className="hero-admin-section-body">
              <HeroImageField
                label="Hero background image"
                hint="Optional backdrop for the whole hero section."
                field="backgroundImage"
                value={form.backgroundImage}
                uploading={uploadingField === 'backgroundImage'}
                onChange={setField}
                onUpload={handleUpload}
                onRemove={(field) => setField(field, '')}
              />
              <HeroImageField
                label="Hero product image"
                hint="The main product visual on the right side."
                field="productImage"
                value={form.productImage}
                uploading={uploadingField === 'productImage'}
                onChange={setField}
                onUpload={handleUpload}
                onRemove={(field) => setField(field, '')}
              />
              <div className="admin-form-grid">
                <HeroImageField
                  label="Desktop banner image"
                  hint="Overrides the background on desktop screens."
                  field="desktopBannerImage"
                  value={form.desktopBannerImage}
                  uploading={uploadingField === 'desktopBannerImage'}
                  onChange={setField}
                  onUpload={handleUpload}
                  onRemove={(field) => setField(field, '')}
                />
                <HeroImageField
                  label="Mobile banner image"
                  hint="Used below 768px wide for a focused mobile layout."
                  field="mobileBannerImage"
                  value={form.mobileBannerImage}
                  uploading={uploadingField === 'mobileBannerImage'}
                  onChange={setField}
                  onUpload={handleUpload}
                  onRemove={(field) => setField(field, '')}
                />
              </div>
            </div>
          </section>

          <section className="admin-panel hero-admin-section">
            <div className="admin-panel-head">
              <div>
                <h3>Buttons & layout</h3>
                <p>Control the calls to action, text alignment and homepage visibility.</p>
              </div>
            </div>
            <div className="hero-admin-section-body">
              <div className="admin-form-grid">
                <AdminField label="Primary button text" error={fieldErrors.primaryButtonText}>
                  <input
                    type="text"
                    value={form.primaryButtonText}
                    onChange={(event) => setField('primaryButtonText', event.target.value)}
                    placeholder={DEFAULT_HERO_CONTENT.primaryButtonText}
                    maxLength={60}
                  />
                </AdminField>
                <AdminField
                  label="Primary button link"
                  hint="Use #shop, /path, https://, mailto: or tel:."
                  error={fieldErrors.primaryButtonLink}
                >
                  <input
                    type="text"
                    value={form.primaryButtonLink}
                    onChange={(event) => setField('primaryButtonLink', event.target.value)}
                    placeholder="#shop"
                    maxLength={500}
                  />
                </AdminField>
                <AdminField label="Secondary button text" error={fieldErrors.secondaryButtonText}>
                  <input
                    type="text"
                    value={form.secondaryButtonText}
                    onChange={(event) => setField('secondaryButtonText', event.target.value)}
                    placeholder={DEFAULT_HERO_CONTENT.secondaryButtonText}
                    maxLength={60}
                  />
                </AdminField>
                <AdminField
                  label="Secondary button link"
                  hint="Leave blank to use the store WhatsApp order link."
                  error={fieldErrors.secondaryButtonLink}
                >
                  <input
                    type="text"
                    value={form.secondaryButtonLink}
                    onChange={(event) => setField('secondaryButtonLink', event.target.value)}
                    placeholder="https://wa.me/…"
                    maxLength={500}
                  />
                </AdminField>
              </div>

              <div className="admin-form-grid">
                <AdminField label="Text alignment" error={fieldErrors.textAlign}>
                  <select
                    value={form.textAlign}
                    onChange={(event) => setField('textAlign', event.target.value)}
                  >
                    {HERO_ALIGNMENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </AdminField>
                <AdminField label="Hero section visibility">
                  <label className="admin-check admin-check--field">
                    <input
                      type="checkbox"
                      checked={form.isVisible}
                      onChange={(event) => setField('isVisible', event.target.checked)}
                    />
                    <span>Show the hero section on the homepage</span>
                  </label>
                </AdminField>
              </div>
            </div>
          </section>

          <div className="admin-panel hero-admin-actions">
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={handleReset}
              disabled={saving || resetting || Boolean(uploadingField)}
            >
              {resetting ? <Loader2 size={16} className="admin-spin" /> : <RotateCcw size={16} />}
              Restore defaults
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              disabled={saving || resetting || Boolean(uploadingField)}
            >
              {saving ? <Loader2 size={16} className="admin-spin" /> : <Save size={16} />}
              {saving ? 'Saving…' : 'Save & publish'}
            </button>
          </div>
        </form>

        <aside className="hero-admin-preview-wrap">
          <HeroPreview form={form} />
        </aside>
      </div>
    </div>
  );
}
