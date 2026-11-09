import mongoose from 'mongoose';

const localizedHeroSchema = new mongoose.Schema(
  {
    heading: { type: String, trim: true, maxlength: 160, default: '' },
    headingHighlight: { type: String, trim: true, maxlength: 160, default: '' },
    subtitle: { type: String, trim: true, maxlength: 240, default: '' },
    description: { type: String, trim: true, maxlength: 800, default: '' },
    primaryButtonText: { type: String, trim: true, maxlength: 60, default: '' },
    secondaryButtonText: { type: String, trim: true, maxlength: 60, default: '' },
  },
  { _id: false },
);

const heroSectionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'home',
      unique: true,
      index: true,
      immutable: true,
    },
    locales: {
      en: { type: localizedHeroSchema, default: () => ({}) },
      ta: { type: localizedHeroSchema, default: () => ({}) },
    },
    heading: { type: String, trim: true, maxlength: 160, default: '' },
    headingHighlight: { type: String, trim: true, maxlength: 160, default: '' },
    subtitle: { type: String, trim: true, maxlength: 240, default: '' },
    description: { type: String, trim: true, maxlength: 800, default: '' },
    backgroundImage: { type: String, trim: true, maxlength: 1000, default: '' },
    productImage: { type: String, trim: true, maxlength: 1000, default: '' },
    desktopBannerImage: { type: String, trim: true, maxlength: 1000, default: '' },
    mobileBannerImage: { type: String, trim: true, maxlength: 1000, default: '' },
    primaryButtonText: { type: String, trim: true, maxlength: 60, default: '' },
    primaryButtonLink: { type: String, trim: true, maxlength: 500, default: '' },
    secondaryButtonText: { type: String, trim: true, maxlength: 60, default: '' },
    secondaryButtonLink: { type: String, trim: true, maxlength: 500, default: '' },
    textAlign: {
      type: String,
      enum: ['left', 'center', 'right'],
      default: 'left',
    },
    isVisible: { type: Boolean, default: true, index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { collection: 'hero_sections', timestamps: true },
);

const HeroSection =
  mongoose.models.HeroSection || mongoose.model('HeroSection', heroSectionSchema);

export default HeroSection;
