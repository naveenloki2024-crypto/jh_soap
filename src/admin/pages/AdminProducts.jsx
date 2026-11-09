import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ImageOff,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  createAdminProduct,
  deactivateAdminProduct,
  getAdminProducts,
  updateAdminProduct,
  uploadProductImage,
} from '../../api/admin';
import { PRODUCT_IMAGES } from '../../data/products';
import { broadcastStorefrontUpdate } from '../../utils/storefrontEvents';
import { formatCurrency, formatNumber, slugify } from '../adminUtils';
import {
  AdminBadge,
  AdminEmptyState,
  AdminError,
  AdminField,
  AdminModal,
  AdminPagination,
  AdminSpinner,
} from '../components/AdminUI';

const EMPTY_FORM = {
  name: '',
  slug: '',
  category: 'Herbal',
  regularPrice: '',
  offerPrice: '',
  stockQuantity: '0',
  sku: '',
  imageUrl: '',
  description: '',
  isActive: true,
};

function ProductForm({ product, onClose, onSaved }) {
  const editing = Boolean(product);
  const [form, setForm] = useState(() =>
    editing
      ? {
          name: product.name || '',
          slug: product.slug || '',
          category: product.category || 'Herbal',
          regularPrice: String(product.regularPrice ?? product.price ?? ''),
          offerPrice: product.offerPrice === null ? '' : String(product.offerPrice ?? ''),
          stockQuantity: String(product.stockQuantity ?? 0),
          sku: product.sku || '',
          imageUrl: product.imageUrl || '',
          description: product.description || '',
          isActive: Boolean(product.isActive),
        }
      : EMPTY_FORM,
  );
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setFormError('');
  };

  const removeImage = () => {
    setPreviewUrl('');
    set('imageUrl', '');
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setFormError('Choose a JPEG, PNG, WebP or GIF image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Images must be 5 MB or smaller.');
      return;
    }
    setUploading(true);
    setFormError('');
    setPreviewUrl(URL.createObjectURL(file));
    try {
      const data = await uploadProductImage(file);
      set('imageUrl', data.url);
      setPreviewUrl('');
    } catch (error) {
      setPreviewUrl('');
      setFormError(error.message || 'Could not upload the image.');
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Product name is required.';
    if (form.regularPrice === '' || Number(form.regularPrice) < 0) {
      next.regularPrice = 'Enter the regular price.';
    }
    if (form.offerPrice !== '' && Number(form.offerPrice) < 0) {
      next.offerPrice = 'Offer price cannot be negative.';
    }
    if (
      form.offerPrice !== '' &&
      form.regularPrice !== '' &&
      Number(form.offerPrice) > Number(form.regularPrice)
    ) {
      next.offerPrice = 'Offer price cannot be higher than the regular price.';
    }
    if (!Number.isInteger(Number(form.stockQuantity)) || Number(form.stockQuantity) < 0) {
      next.stockQuantity = 'Stock must be a whole number of zero or more.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || uploading) return;
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      category: form.category.trim() || 'Herbal',
      regularPrice: Number(form.regularPrice),
      offerPrice: form.offerPrice === '' ? '' : Number(form.offerPrice),
      stockQuantity: Number(form.stockQuantity),
      sku: form.sku.trim(),
      images: form.imageUrl.trim() ? [form.imageUrl.trim()] : [],
      description: form.description.trim(),
      isActive: Boolean(form.isActive),
    };

    setSubmitting(true);
    setFormError('');
    try {
      if (editing) {
        await updateAdminProduct(product.productId || product.slug, payload);
      } else {
        await createAdminProduct(payload);
      }
      onSaved(editing ? 'Product updated.' : 'Product created.');
    } catch (error) {
      setFormError(error.message || 'Could not save the product.');
      if (error.fieldErrors) setErrors(error.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModal
      title={editing ? `Edit ${product.name}` : 'Add a product'}
      subtitle={editing ? 'Changes appear on the storefront immediately.' : 'Create a new soap for the JH Soaps catalogue.'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            form="admin-product-form"
            className="admin-btn admin-btn--primary"
            disabled={submitting || uploading}
          >
            {submitting ? <Loader2 size={16} className="admin-spin" /> : null}
            {editing ? 'Save changes' : 'Create product'}
          </button>
        </>
      }
    >
      <form id="admin-product-form" onSubmit={handleSubmit} className="admin-form-stack" noValidate>
        <AdminError message={formError} />

        <div className="admin-form-grid">
          <AdminField label="Product name" error={errors.name}>
            <input
              type="text"
              value={form.name}
              onChange={(event) => set('name', event.target.value)}
              placeholder="e.g. Vetiver Soap"
              maxLength={120}
              required
            />
          </AdminField>
          <AdminField label="URL slug" hint="Leave blank to generate from the name." error={errors.slug}>
            <input
              type="text"
              value={form.slug}
              onChange={(event) => set('slug', slugify(event.target.value))}
              placeholder="vetiver-soap"
              maxLength={80}
            />
          </AdminField>
          <AdminField label="Category" error={errors.category}>
            <input
              type="text"
              value={form.category}
              onChange={(event) => set('category', event.target.value)}
              placeholder="Herbal"
              maxLength={60}
            />
          </AdminField>
          <AdminField label="SKU" hint="Optional stock keeping unit." error={errors.sku}>
            <input
              type="text"
              value={form.sku}
              onChange={(event) => set('sku', event.target.value.toUpperCase())}
              placeholder="JH-VET-01"
              maxLength={60}
            />
          </AdminField>
          <AdminField label="Regular price (₹)" error={errors.price || errors.regularPrice}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.regularPrice}
              onChange={(event) => set('regularPrice', event.target.value)}
              placeholder="110"
              required
            />
          </AdminField>
          <AdminField label="Offer price (₹)" hint="Optional. Must be below the regular price." error={errors.offerPrice}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.offerPrice}
              onChange={(event) => set('offerPrice', event.target.value)}
              placeholder="No offer"
            />
          </AdminField>
          <AdminField label="Stock quantity" error={errors.stockQuantity}>
            <input
              type="number"
              min="0"
              step="1"
              value={form.stockQuantity}
              onChange={(event) => set('stockQuantity', event.target.value)}
              required
            />
          </AdminField>
          <AdminField label="Visibility">
            <label className="admin-check admin-check--field">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => set('isActive', event.target.checked)}
              />
              <span>Show this product in the store</span>
            </label>
          </AdminField>
        </div>

        <div className="admin-form-grid">
          <AdminField label="Product image" hint="JPEG, PNG, WebP or GIF up to 5 MB." error={errors.images}>
            <div className="admin-upload-row">
              <label className={`admin-upload-btn${uploading ? ' is-busy' : ''}`}>
                {uploading ? <Loader2 size={16} className="admin-spin" /> : <Upload size={16} />}
                {uploading ? 'Uploading…' : 'Upload image'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
              {form.imageUrl || previewUrl ? (
                <button
                  type="button"
                  className="admin-btn admin-btn--danger-ghost admin-btn--sm"
                  onClick={removeImage}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </AdminField>
          <AdminField label="Or paste an image URL" hint="HTTPS URL or /uploads path.">
            <input
              type="text"
              value={form.imageUrl}
              onChange={(event) => {
                setPreviewUrl('');
                set('imageUrl', event.target.value);
              }}
              placeholder="https://…"
            />
          </AdminField>
        </div>

        {previewUrl || form.imageUrl ? (
          <div className="admin-image-preview">
            <img src={previewUrl || form.imageUrl} alt="Product preview" />
            <span>{uploading && previewUrl ? 'Uploading preview…' : 'Image preview'}</span>
          </div>
        ) : null}

        <AdminField label="Description" hint="Shown on the product page." error={errors.description}>
          <textarea
            rows={4}
            value={form.description}
            onChange={(event) => set('description', event.target.value)}
            placeholder="Describe the soap, ingredients and benefits."
            maxLength={2000}
          />
        </AdminField>
      </form>
    </AdminModal>
  );
}

export default function AdminProducts({ createMode = false }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [active, setActive] = useState('');
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [formProduct, setFormProduct] = useState(undefined);
  const [formOpen, setFormOpen] = useState(Boolean(createMode));
  const [rowBusy, setRowBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminProducts({
        page,
        limit: 12,
        q: appliedQuery,
        active,
      });
      setProducts(data.products || []);
      setPagination(data.pagination || null);
    } catch (requestError) {
      setError(requestError.message || 'Could not load products.');
    } finally {
      setLoading(false);
    }
  }, [active, appliedQuery, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setFormProduct(undefined);
    setFormOpen(true);
    setNotice('');
  };

  const openEdit = (product) => {
    setFormProduct(product);
    setFormOpen(true);
    setNotice('');
  };

  const handleSaved = (message) => {
    setFormOpen(false);
    setFormProduct(undefined);
    broadcastStorefrontUpdate();
    if (createMode) {
      navigate('/admin/products', { replace: true });
      return;
    }
    setNotice(message);
    load();
  };

  const closeForm = () => {
    setFormOpen(false);
    setFormProduct(undefined);
    if (createMode) navigate('/admin/products', { replace: true });
  };

  const toggleActive = async (product) => {
    const nextActive = !product.isActive;
    if (!nextActive) {
      const confirmed = window.confirm(
        `Remove ${product.name} from the storefront? Order history stays intact.`,
      );
      if (!confirmed) return;
    }
    setRowBusy(product.productId || product.slug);
    setError('');
    setNotice('');
    try {
      if (nextActive) {
        await updateAdminProduct(product.productId || product.slug, { isActive: true });
      } else {
        await deactivateAdminProduct(product.productId || product.slug);
      }
      broadcastStorefrontUpdate();
      setNotice(nextActive ? 'Product restored to the store.' : 'Product removed from the store.');
      load();
    } catch (requestError) {
      setError(requestError.message || 'Could not update this product.');
    } finally {
      setRowBusy('');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-toolbar">
        <div>
          <span className="admin-section-kicker">Catalogue</span>
          <h2>Products</h2>
        </div>
        <div className="admin-toolbar-actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'admin-spin' : ''} />
            Refresh
          </button>
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            <Plus size={16} />
            Add product
          </button>
        </div>
      </div>

      <div className="admin-filter-bar">
        <form
          className="admin-search"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setAppliedQuery(query.trim());
          }}
        >
          <Search size={17} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, slug or SKU"
            aria-label="Search products"
          />
          <button type="submit" className="admin-btn admin-btn--primary admin-btn--sm">
            Search
          </button>
        </form>
        <select
          value={active}
          onChange={(event) => {
            setActive(event.target.value);
            setPage(1);
          }}
          aria-label="Filter by visibility"
        >
          <option value="">All products</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
      </div>

      {notice ? <p className="admin-success">{notice}</p> : null}
      <AdminError message={error} onRetry={load} />

      <section className="admin-panel">
        {loading && !products.length ? (
          <AdminSpinner label="Loading products" />
        ) : products.length ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th className="is-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.productId || product.slug}>
                      <td>
                        <div className="admin-product-cell">
                          <span className="admin-product-thumb">
                            {product.imageUrl || PRODUCT_IMAGES[product.slug] ? (
                              <img src={product.imageUrl || PRODUCT_IMAGES[product.slug]} alt="" />
                            ) : (
                              <ImageOff size={17} />
                            )}
                          </span>
                          <div>
                            <strong>{product.name}</strong>
                            <small>/{product.slug}</small>
                          </div>
                        </div>
                      </td>
                      <td>{product.category}</td>
                      <td>
                        <strong>{formatCurrency(product.price)}</strong>
                        {product.offerPrice !== null && product.offerPrice < product.regularPrice ? (
                          <small className="admin-strike">{formatCurrency(product.regularPrice)}</small>
                        ) : null}
                      </td>
                      <td>
                        <span className={product.stockQuantity === 0 ? 'admin-stock-out' : ''}>
                          {formatNumber(product.stockQuantity)}
                        </span>
                      </td>
                      <td>
                        <AdminBadge tone={product.isActive ? 'done' : 'muted'}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </AdminBadge>
                      </td>
                      <td className="is-right">
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-icon-btn"
                            onClick={() => openEdit(product)}
                            aria-label={`Edit ${product.name}`}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="admin-icon-btn admin-icon-btn--danger"
                            onClick={() => toggleActive(product)}
                            disabled={rowBusy === (product.productId || product.slug)}
                            aria-label={product.isActive ? `Remove ${product.name}` : `Restore ${product.name}`}
                          >
                            {rowBusy === (product.productId || product.slug) ? (
                              <Loader2 size={16} className="admin-spin" />
                            ) : product.isActive ? (
                              <Trash2 size={16} />
                            ) : (
                              <Plus size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AdminPagination
              page={pagination?.page || 1}
              totalPages={pagination?.totalPages || 1}
              total={pagination?.total || 0}
              onPageChange={setPage}
            />
          </>
        ) : (
          <AdminEmptyState
            icon={Package}
            title={appliedQuery || active ? 'No products match' : 'No products yet'}
            text={
              appliedQuery || active
                ? 'Try a different search term or visibility filter.'
                : 'Add your first product to start selling.'
            }
            action={
              <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
                <Plus size={16} />
                Add product
              </button>
            }
          />
        )}
      </section>

      {formOpen ? (
        <ProductForm
          product={formProduct}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      ) : null}
    </div>
  );
}
