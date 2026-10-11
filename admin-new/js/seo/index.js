/**
 * SEO Module Index - Export all SEO functionality
 */

import { BaseValidator, ValidationResult, ValidatorConfig } from './validators/base-validator.js';
import { MetaDescriptionValidator, MetaDescriptionConfig } from './validators/meta-description-validator.js';
import { ImageAltValidator, ImageAltConfig } from './validators/image-alt-validator.js';
import { SchemaValidator, SchemaConfig, SCHEMA_DEFINITIONS } from './validators/schema-validator.js';
import { CanonicalValidator, CanonicalConfig } from './validators/canonical-validator.js';
import { SEOAuditor, AuditorConfig, PageAuditResult, SiteAuditResult } from './seo-auditor.js';

export { BaseValidator, ValidationResult, ValidatorConfig };
export { MetaDescriptionValidator, MetaDescriptionConfig };
export { ImageAltValidator, ImageAltConfig };
export { SchemaValidator, SchemaConfig, SCHEMA_DEFINITIONS };
export { CanonicalValidator, CanonicalConfig };
export { SEOAuditor, AuditorConfig, PageAuditResult, SiteAuditResult };

export const validatorRegistry = new Map();

export function registerValidator(name, validatorClass) {
  validatorRegistry.set(name.toLowerCase(), validatorClass);
}

export function getValidator(name) {
  return validatorRegistry.get(name.toLowerCase());
}

export function getAllValidators() {
  return Array.from(validatorRegistry.values());
}

export function createValidator(name, config) {
  const ValidatorClass = getValidator(name);
  if (!ValidatorClass) {
    throw new Error(`Validator "${name}" not registered`);
  }
  return new ValidatorClass(config);
}

// Register built-in validators
registerValidator('meta-description', MetaDescriptionValidator);
registerValidator('image-alt', ImageAltValidator);
registerValidator('schema', SchemaValidator);
registerValidator('canonical', CanonicalValidator);

export default {
  BaseValidator,
  ValidationResult,
  ValidatorConfig,
  MetaDescriptionValidator,
  MetaDescriptionConfig,
  ImageAltValidator,
  ImageAltConfig,
  SchemaValidator,
  SchemaConfig,
  SCHEMA_DEFINITIONS,
  CanonicalValidator,
  CanonicalConfig,
  SEOAuditor,
  AuditorConfig,
  PageAuditResult,
  SiteAuditResult,
  validatorRegistry,
  registerValidator,
  getValidator,
  getAllValidators,
  createValidator
};