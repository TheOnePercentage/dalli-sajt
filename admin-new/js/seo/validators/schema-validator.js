/**
 * Schema.org Validator
 * Validates structured data (JSON-LD, Microdata, RDFa) for SEO
 * Checks: required properties, @type validation, nested schemas, Google Rich Results compliance
 */

import { BaseValidator, ValidationResult, ValidatorConfig } from './base-validator.js';

export class SchemaConfig extends ValidatorConfig {
  constructor(options = {}) {
    super(options);
    this.requiredTypes = options.requiredTypes || ['Product', 'Organization', 'WebSite', 'BreadcrumbList', 'FAQPage'];
    this.validateProduct = options.validateProduct !== false;
    this.validateOrganization = options.validateOrganization !== false;
    this.validateBreadcrumb = options.validateBreadcrumb !== false;
    this.validateWebSite = options.validateWebSite !== false;
    this.validateArticle = options.validateArticle !== false;
    this.validateFAQPage = options.validateFAQPage !== false;
    this.checkNestedSchemas = options.checkNestedSchemas !== false;
    this.checkGoogleRichResults = options.checkGoogleRichResults !== false;
    this.checkPropertyTypes = options.checkPropertyTypes !== false;
    this.requiredProductProps = options.requiredProductProps || ['name', 'image', 'description', 'sku', 'offers'];
    this.requiredOfferProps = options.requiredOfferProps || ['price', 'priceCurrency', 'availability'];
    this.checkSameAs = options.checkSameAs !== false;
    this.checkLogo = options.checkLogo !== false;
  }
}

// Schema.org type definitions with required/recommended properties
export const SCHEMA_DEFINITIONS = {
  Product: {
    required: ['name', 'image', 'description', 'sku', 'offers'],
    recommended: ['brand', 'gtin', 'mpn', 'review', 'aggregateRating', 'color', 'size', 'material', 'audience', 'shippingDetails', 'hasMerchantReturnPolicy', 'offers.shippingDetails', 'offers.priceValidUntil', 'offers.itemCondition', 'review', 'aggregateRating'],
    properties: {
      name: { type: 'Text', required: true },
      image: { type: 'ImageObject|URL', required: true },
      description: { type: 'Text', required: true },
      sku: { type: 'Text', required: true },
      offers: { type: 'Offer', required: true },
      brand: { type: 'Brand|Organization|Text' },
      gtin: { type: 'Text' },
      mpn: { type: 'Text' },
      review: { type: 'Review' },
      aggregateRating: { type: 'AggregateRating' },
      color: { type: 'Text' },
      size: { type: 'Text|SizeSpecification' },
      material: { type: 'Text' },
      audience: { type: 'Audience' },
      shippingDetails: { type: 'OfferShippingDetails' },
      hasMerchantReturnPolicy: { type: 'MerchantReturnPolicy' }
    }
  },
  Offer: {
    required: ['price', 'priceCurrency', 'availability'],
    recommended: ['seller', 'priceValidUntil', 'itemCondition', 'shippingDetails', 'shippingDetails.deliveryTime', 'shippingDetails.shippingRate', 'shippingDetails.shippingDestination', 'availabilityStarts', 'availabilityEnds', 'eligibleQuantity', 'eligibleTransactionVolume', 'maxPrice', 'eligibleRegion'],
    properties: {
      price: { type: 'Number', required: true },
      priceCurrency: { type: 'Text', required: true },
      availability: { type: 'URL|Text', required: true },
      seller: { type: 'Organization|Person' },
      priceValidUntil: { type: 'Date' },
      itemCondition: { type: 'OfferItemCondition' },
      shippingDetails: { type: 'OfferShippingDetails' },
      availabilityStarts: { type: 'DateTime' },
      availabilityEnds: { type: 'DateTime' },
      eligibleQuantity: { type: 'QuantitativeValue' },
      eligibleTransactionVolume: { type: 'QuantitativeValue' },
      maxPrice: { type: 'Number' },
      eligibleRegion: { type: 'AdministrativeArea|GeoShape|Place|Text' }
    }
  },
  OfferShippingDetails: {
    required: ['deliveryTime', 'shippingRate', 'shippingDestination'],
    properties: {
      deliveryTime: { type: 'ShippingDeliveryTime', required: true },
      shippingRate: { type: 'MonetaryAmount', required: true },
      shippingDestination: { type: 'DefinedRegion', required: true },
      shippingRateCurrency: { type: 'Text' },
      freeShippingThreshold: { type: 'MonetaryAmount' },
      doesNotShip: { type: 'Boolean' },
      shippingLabel: { type: 'Text' },
      appliesTo: { type: 'DefinedTerm' }
    }
  },
  ShippingDeliveryTime: {
    required: ['handlingTime', 'transitTime'],
    properties: {
      handlingTime: { type: 'QuantitativeValue', required: true },
      transitTime: { type: 'QuantitativeValue', required: true },
      cutOffTime: { type: 'Time' },
      businessDays: { type: 'Text' }
    }
  },
  QuantitativeValue: {
    required: ['value', 'unitCode'],
    properties: {
      value: { type: 'Number', required: true },
      unitCode: { type: 'Text', required: true },
      unitText: { type: 'Text' },
      minValue: { type: 'Number' },
      maxValue: { type: 'Number' }
    }
  },
  MonetaryAmount: {
    required: ['value', 'currency'],
    properties: {
      value: { type: 'Number', required: true },
      currency: { type: 'Text', required: true }
    }
  },
  DefinedRegion: {
    required: ['addressCountry'],
    properties: {
      addressCountry: { type: 'Text', required: true },
      addressRegion: { type: 'Text' },
      postalCode: { type: 'Text' },
      addressCity: { type: 'Text' }
    }
  },
  MerchantReturnPolicy: {
    required: ['applicableCountry', 'returnPolicyCategory', 'merchantReturnDays', 'returnFees', 'returnMethod'],
    properties: {
      applicableCountry: { type: 'Text', required: true },
      returnPolicyCategory: { type: 'Text', required: true },
      merchantReturnDays: { type: 'Integer', required: true },
      returnFees: { type: 'Text', required: true },
      returnMethod: { type: 'Text', required: true },
      returnPolicyUrl: { type: 'URL' }
    }
  },
  Organization: {
    required: ['name', 'url'],
    recommended: ['logo', 'sameAs', 'contactPoint', 'address', 'foundingDate', 'numberOfEmployees', 'department', 'subOrganization', 'duns', 'taxID', 'legalName', 'email', 'telephone', 'faxNumber', 'areaServed', 'award', 'brand', 'review', 'aggregateRating', 'member', 'memberOf', 'parentOrganization', 'subOrganization', 'department'],
    properties: {
      name: { type: 'Text', required: true },
      url: { type: 'URL', required: true },
      logo: { type: 'ImageObject|URL' },
      sameAs: { type: 'URL' },
      contactPoint: { type: 'ContactPoint' },
      address: { type: 'PostalAddress' },
      foundingDate: { type: 'Date' },
      numberOfEmployees: { type: 'QuantitativeValue' },
      department: { type: 'Organization' },
      subOrganization: { type: 'Organization' },
      duns: { type: 'Text' },
      taxID: { type: 'Text' },
      legalName: { type: 'Text' },
      email: { type: 'Text' },
      telephone: { type: 'Text' },
      faxNumber: { type: 'Text' },
      areaServed: { type: 'AdministrativeArea|GeoShape|Place|Text' },
      award: { type: 'Text' },
      brand: { type: 'Brand' },
      review: { type: 'Review' },
      aggregateRating: { type: 'AggregateRating' },
      member: { type: 'Organization|Person' },
      memberOf: { type: 'Organization|Person' },
      parentOrganization: { type: 'Organization' },
      subOrganization: { type: 'Organization' },
      department: { type: 'Organization' }
    }
  },
  WebSite: {
    required: ['name', 'url'],
    recommended: ['potentialAction', 'publisher'],
    properties: {
      name: { type: 'Text', required: true },
      url: { type: 'URL', required: true },
      potentialAction: { type: 'SearchAction' },
      publisher: { type: 'Organization|Person' }
    }
  },
  BreadcrumbList: {
    required: ['itemListElement'],
    recommended: [],
    properties: {
      itemListElement: { type: 'ListItem', required: true }
    }
  },
  ListItem: {
    required: ['position', 'item'],
    recommended: ['name'],
    properties: {
      position: { type: 'Integer', required: true },
      item: { type: 'Thing|URL', required: true },
      name: { type: 'Text' }
    }
  },
  Article: {
    required: ['headline', 'datePublished', 'author'],
    recommended: ['image', 'dateModified', 'publisher', 'mainEntityOfPage'],
    properties: {
      headline: { type: 'Text', required: true },
      datePublished: { type: 'DateTime', required: true },
      author: { type: 'Person|Organization', required: true },
      image: { type: 'ImageObject|URL' },
      dateModified: { type: 'DateTime' },
      publisher: { type: 'Organization' },
      mainEntityOfPage: { type: 'WebPage' }
    }
  },
  SearchAction: {
    required: ['target', 'query-input'],
    properties: {
      target: { type: 'EntryPoint', required: true },
      'query-input': { type: 'PropertyValueSpecification', required: true }
    }
  },
  EntryPoint: {
    required: ['urlTemplate'],
    properties: {
      urlTemplate: { type: 'Text', required: true },
      actionPlatform: { type: 'Text' },
      encodingType: { type: 'Text' },
      contentType: { type: 'Text' }
    }
  },
  ContactPoint: {
    required: ['telephone', 'contactType'],
    properties: {
      telephone: { type: 'Text', required: true },
      contactType: { type: 'Text', required: true },
      availableLanguage: { type: 'Text|Language' },
      areaServed: { type: 'AdministrativeArea|GeoShape|Place|Text' },
      availableHours: { type: 'OpeningHoursSpecification' }
    }
  },
  PostalAddress: {
    required: ['streetAddress', 'addressLocality', 'addressRegion', 'postalCode', 'addressCountry'],
    properties: {
      streetAddress: { type: 'Text', required: true },
      addressLocality: { type: 'Text', required: true },
      addressRegion: { type: 'Text', required: true },
      postalCode: { type: 'Text', required: true },
      addressCountry: { type: 'Text|Country', required: true }
    }
  },
  AggregateRating: {
    required: ['ratingValue', 'reviewCount'],
    properties: {
      ratingValue: { type: 'Number|Text', required: true },
      reviewCount: { type: 'Integer', required: true },
      bestRating: { type: 'Number|Text' },
      worstRating: { type: 'Number|Text' }
    }
  },
  Review: {
    required: ['author', 'reviewRating'],
    recommended: ['datePublished', 'reviewBody'],
    properties: {
      author: { type: 'Person|Organization', required: true },
      reviewRating: { type: 'Rating', required: true },
      datePublished: { type: 'DateTime' },
      reviewBody: { type: 'Text' }
    }
  },
  Rating: {
    required: ['ratingValue'],
    properties: {
      ratingValue: { type: 'Number|Text', required: true },
      bestRating: { type: 'Number|Text' },
      worstRating: { type: 'Number|Text' }
    }
  },
  Brand: {
    required: ['name'],
    properties: {
      name: { type: 'Text', required: true },
      logo: { type: 'ImageObject|URL' }
    }
  },
  FAQPage: {
    required: ['mainEntity'],
    recommended: ['description', 'publisher'],
    properties: {
      mainEntity: { type: 'Question', required: true },
      description: { type: 'Text' },
      publisher: { type: 'Organization|Person' }
    }
  },
  Question: {
    required: ['name', 'acceptedAnswer'],
    recommended: ['answerExplanation'],
    properties: {
      name: { type: 'Text', required: true },
      acceptedAnswer: { type: 'Answer', required: true },
      answerExplanation: { type: 'Text' }
    }
  },
  Answer: {
    required: ['text'],
    properties: {
      text: { type: 'Text', required: true },
      upvoteCount: { type: 'Integer' },
      dateCreated: { type: 'DateTime' },
      author: { type: 'Person|Organization' }
    }
  }
};

export class SchemaValidator extends BaseValidator {
  constructor(config = {}) {
    super(new SchemaConfig(config));
    this.name = 'schema';
    this.schemas = [];
  }

  async runValidation(document, url, context = {}) {
    const result = new ValidationResult();
    result.metadata.url = url;
    result.metadata.validator = this.name;

    // Extract all schemas from page
    this.schemas = this.extractSchemas(document);
    result.metadata.totalSchemas = this.schemas.length;
    result.metadata.schemaTypes = [...new Set(this.schemas.map(s => s['@type']))];

    if (this.schemas.length === 0) {
      result.addWarning('No structured data found on page', {
        recommendation: 'Add JSON-LD structured data for better search visibility. Start with Organization, WebSite, and Product schemas.',
        impact: 'high'
      });
      return result;
    }

    // Validate each schema
    for (const schema of this.schemas) {
      const schemaResult = this.validateSchema(schema, document, url, context);
      result.merge(schemaResult);
    }

    // Check for required schema types
    this.validateRequiredTypes(result);

    // Cross-schema validation
    this.validateCrossSchemaConsistency(result);

    result.metadata.score = this.calculateScore(result);
    return result;
  }

  /**
   * Extract all structured data from page
   * @param {Document} document
   * @returns {Array<Object>}
   */
  extractSchemas(document) {
    const schemas = [];

    // 1. JSON-LD scripts
    const jsonLdScripts = this.$$(document, 'script[type="application/ld+json"]');
    jsonLdScripts.forEach(script => {
      try {
        const content = script.textContent.trim();
        if (!content) return;
        
        const parsed = JSON.parse(content);
        const schemas = Array.isArray(parsed) ? parsed : [parsed];
        schemas.forEach(s => {
          if (s['@context'] && s['@type']) {
            schemas.push({
              ...s,
              format: 'json-ld',
              source: 'script[type="application/ld+json"]'
            });
          }
        });
      } catch (e) {
        // Invalid JSON-LD - will be caught in validation
      }
    });

    // 2. Microdata
    const microdataItems = this.$$(document, '[itemscope]');
    microdataItems.forEach(item => {
      if (item.itemType) {
        const schema = this.parseMicrodata(item);
        if (schema) {
          schema.format = 'microdata';
          schema.source = 'microdata';
          schemas.push(schema);
        }
      }
    });

    // 3. RDFa
    const rdfaItems = this.$$(document, '[typeof]');
    rdfaItems.forEach(item => {
      const schema = this.parseRDFa(item);
      if (schema) {
        schema.format = 'rdfa';
        schema.source = 'rdfa';
        schemas.push(schema);
      }
    });

    return schemas;
  }

  /**
   * Parse microdata item
   * @param {HTMLElement} element
   * @returns {Object|null}
   */
  parseMicrodata(element) {
    const type = element.itemType;
    if (!type) return null;

    const schema = { '@type': type.split('/').pop() };
    
    const properties = element.properties;
    if (properties) {
      for (const prop of properties) {
        const name = prop.name;
        const value = prop.value;
        if (schema[name]) {
          if (!Array.isArray(schema[name])) schema[name] = [schema[name]];
          schema[name].push(value);
        } else {
          schema[name] = value;
        }
      }
    }

    return Object.keys(schema).length > 1 ? schema : null;
  }

  /**
   * Parse RDFa item
   * @param {HTMLElement} element
   * @returns {Object|null}
   */
  parseRDFa(element) {
    const type = element.getAttribute('typeof');
    if (!type) return null;

    const schema = { '@type': type.split('/').pop() };
    
    // Get all property attributes
    const props = element.querySelectorAll('[property]');
    props.forEach(prop => {
      const name = prop.getAttribute('property').replace('schema:', '');
      const value = prop.getAttribute('content') || prop.textContent;
      if (schema[name]) {
        if (!Array.isArray(schema[name])) schema[name] = [schema[name]];
        schema[name].push(value);
      } else {
        schema[name] = value;
      }
    });

    return Object.keys(schema).length > 1 ? schema : null;
  }

  /**
   * Validate a single schema object
   * @param {Object} schema
   * @param {Document} document
   * @param {string} url
   * @param {Object} context
   * @returns {ValidationResult}
   */
  validateSchema(schema, document, url, context) {
    const result = new ValidationResult();
    result.metadata.schemaType = schema['@type'];
    result.metadata.schemaFormat = schema.format;
    result.metadata.schemaSource = schema.source;

    const type = schema['@type'];
    const definition = SCHEMA_DEFINITIONS[type];

    if (!definition) {
      result.addInfo(`Schema type "${type}" not in validation definitions`, {
        recommendation: 'Add definition to SCHEMA_DEFINITIONS for full validation.'
      });
      return result;
    }

    // Check required properties
    this.validateRequiredProperties(schema, definition, result);

    // Check property types
    if (this.config.checkPropertyTypes) {
      this.validatePropertyTypes(schema, definition, result);
    }

    // Type-specific validation
    switch (schema['@type']) {
      case 'Product':
        this.validateProductSchema(schema, result, context);
        break;
      case 'Offer':
        this.validateOfferSchema(schema, result);
        break;
      case 'Organization':
        this.validateOrganizationSchema(schema, result);
        break;
      case 'WebSite':
        this.validateWebSiteSchema(schema, result);
        break;
      case 'BreadcrumbList':
        this.validateBreadcrumbSchema(schema, result, document);
        break;
      case 'Article':
        this.validateArticleSchema(schema, result);
        break;
      case 'FAQPage':
        this.validateFAQPageSchema(schema, result);
        break;
    }

    // Nested schema validation
    if (this.config.checkNestedSchemas) {
      this.validateNestedSchemas(schema, definition, result);
    }

    // Google Rich Results specific checks
    if (this.config.checkGoogleRichResults) {
      this.validateGoogleRichResults(schema, result);
    }

    return result;
  }

  validateRequiredProperties(schema, definition, result) {
    if (!definition.required) return;

    for (const requiredProp of definition.required) {
      const value = schema[requiredProp];
      
      if (!value || (Array.isArray(value) && value.length === 0)) {
        result.addError(`Missing required property: ${requiredProp}`, {
          schemaType: schema['@type'],
          property: requiredProp,
          recommendation: `Add required property "${requiredProp}" to ${schema['@type']} schema.`,
          impact: 'high',
          googleRichResults: true
        });
      } else {
        result.addPassed(`Required property present: ${requiredProp}`, {
          property: requiredProp,
          valueType: Array.isArray(value) ? 'array' : typeof value
        });
      }
    }
  }

  validatePropertyTypes(schema, definition, result) {
    if (!definition.properties) return;

    for (const [prop, value] of Object.entries(schema)) {
      const propDef = definition.properties[prop];
      if (!propDef) continue; // Unknown property - skip

      const expectedType = propDef.type;
      const actualValue = Array.isArray(value) ? value[0] : value;

      if (actualValue === undefined || actualValue === null) continue;

      // Type validation
      const typeValid = this.validateType(actualValue, expectedType);
      if (!typeValid) {
        result.addWarning(`Property "${prop}" may have incorrect type`, {
          property: prop,
          expectedType,
          actualType: typeof actualValue,
          recommendation: `Ensure "${prop}" matches expected type: ${expectedType}`
        });
      }
    }
  }

  validateType(value, expectedType) {
    if (!expectedType) return true;

    // Handle union types (e.g., "ImageObject|URL")
    const types = expectedType.split('|').map(t => t.trim());
    
    return types.some(type => {
      switch (type) {
        case 'Text':
        case 'URL':
        case 'Date':
        case 'DateTime':
        case 'Integer':
        case 'Number':
          return typeof value === 'string' || typeof value === 'number';
        case 'Boolean':
          return typeof value === 'boolean';
        case 'Integer':
          return Number.isInteger(Number(value));
        case 'Number':
          return !isNaN(Number(value));
        default:
          // Complex types - just check if object
          return typeof value === 'object' && value !== null;
      }
    });
  }

  validateProductSchema(schema, result, context) {
    // Check offers structure
    if (schema.offers) {
      const offers = Array.isArray(schema.offers) ? schema.offers : [schema.offers];
      
      offers.forEach((offer, i) => {
        if (offer['@type'] !== 'Offer') {
          result.addWarning(`Offer ${i} missing @type "Offer"`, {
            recommendation: 'Add @type: "Offer" to each offer object.'
          });
        }
        
        // Validate offer properties
        if (offer.price === undefined) {
          result.addError(`Offer ${i} missing price`, { impact: 'high' });
        }
        if (!offer.priceCurrency) {
          result.addError(`Offer ${i} missing priceCurrency`, { impact: 'high' });
        }
        if (!offer.availability) {
          result.addError(`Offer ${i} missing availability`, { impact: 'high' });
        } else {
          // Validate availability value
          const validAvailability = [
            'InStock', 'OutOfStock', 'PreOrder', 'LimitedAvailability',
            'InStock', 'OutOfStock', 'PreOrder', 'SoldOut', 'Discontinued'
          ];
          const avail = offer.availability.split('/').pop();
          if (!validAvailability.includes(avail)) {
            result.addWarning(`Offer ${i} has non-standard availability: ${avail}`, {
              recommendation: 'Use standard Schema.org availability values: InStock, OutOfStock, PreOrder, etc.'
            });
          }
        }
      });
    }

    // Check for aggregateRating
    if (schema.aggregateRating) {
      if (!schema.aggregateRating.ratingValue) {
        result.addError('aggregateRating missing ratingValue');
      }
      if (!schema.aggregateRating.reviewCount) {
        result.addError('aggregateRating missing reviewCount');
      }
    }

    // Check for brand
    if (!schema.brand) {
      result.addWarning('Product missing brand', {
        recommendation: 'Add brand information for better rich results.'
      });
    }

    // Check for GTIN/MPN
    if (!schema.gtin && !schema.mpn) {
      result.addInfo('Product missing GTIN/MPN', {
        recommendation: 'Add gtin or mpn for better product identification in shopping results.'
      });
    }

    // Check images
    if (schema.image) {
      const images = Array.isArray(schema.image) ? schema.image : [schema.image];
      images.forEach((img, i) => {
        if (typeof img === 'string') {
          // URL string - OK
        } else if (img['@type'] === 'ImageObject') {
          if (!img.contentUrl && !img.url) {
            result.addWarning(`Image ${i} missing contentUrl/url`);
          }
        }
      });
    }
  }

  validateOfferSchema(schema, result) {
    // Price validation
    if (schema.price !== undefined) {
      const price = Number(schema.price);
      if (isNaN(price) || price < 0) {
        result.addError('Invalid price value', {
          value: schema.price,
          recommendation: 'Price must be a non-negative number.'
        });
      }
    }

    // Currency validation
    if (schema.priceCurrency) {
      if (!/^[A-Z]{3}$/.test(schema.priceCurrency)) {
        result.addWarning('priceCurrency should be 3-letter ISO 4217 code', {
          value: schema.priceCurrency,
          recommendation: 'Use standard currency codes: RSD, EUR, USD, etc.'
        });
      }
    }
  }

  validateOrganizationSchema(schema, result) {
    // Logo check
    if (this.config.checkLogo && !schema.logo) {
      result.addWarning('Organization missing logo', {
        recommendation: 'Add logo for brand recognition in knowledge panel.'
      });
    } else if (schema.logo) {
      // Validate logo
      const logo = schema.logo;
      if (typeof logo === 'string') {
        // URL - OK
      } else if (logo['@type'] === 'ImageObject') {
        if (!logo.contentUrl && !logo.url) {
          result.addWarning('Organization logo ImageObject missing contentUrl');
        }
      }
    }

    // SameAs check
    if (this.config.checkSameAs && !schema.sameAs) {
      result.addWarning('Organization missing sameAs', {
        recommendation: 'Add sameAs array with social media profiles for knowledge panel.'
      });
    } else if (schema.sameAs) {
      const sameAs = Array.isArray(schema.sameAs) ? schema.sameAs : [schema.sameAs];
      sameAs.forEach((url, i) => {
        try {
          new URL(url);
        } catch (e) {
          result.addError(`sameAs[${i}] is not a valid URL: ${url}`);
        }
      });
    }

    // Contact point
    if (schema.contactPoint) {
      const contacts = Array.isArray(schema.contactPoint) ? schema.contactPoint : [schema.contactPoint];
      contacts.forEach((cp, i) => {
        if (!cp.telephone) {
          result.addError(`ContactPoint ${i} missing telephone`);
        }
        if (!cp.contactType) {
          result.addError(`ContactPoint ${i} missing contactType`);
        }
        // Validate optional contactPoint properties
        if (cp.availableLanguage && typeof cp.availableLanguage !== 'string') {
          result.addWarning(`ContactPoint ${i} availableLanguage should be a string`, {
            recommendation: 'Use language codes like "en", "sr", "en-US"'
          });
        }
        if (cp.areaServed) {
          const areas = Array.isArray(cp.areaServed) ? cp.areaServed : [cp.areaServed];
          areas.forEach((area, j) => {
            if (typeof area === 'object' && area['@type'] !== 'AdministrativeArea') {
              result.addWarning(`ContactPoint ${i} areaServed[${j}] should have @type AdministrativeArea`);
            }
          });
        }
      });

      // Enhanced validation for new Organization fields
      if (this.config.checkGoogleRichResults) {
        // foundingDate validation
        if (schema.foundingDate) {
          const date = new Date(schema.foundingDate);
          if (isNaN(date.getTime())) {
            result.addError('Invalid foundingDate format', {
              value: schema.foundingDate,
              recommendation: 'Use ISO 8601 date format (YYYY-MM-DD).'
            });
          } else if (date > new Date()) {
            result.addWarning('foundingDate is in the future', {
              value: schema.foundingDate,
              recommendation: 'foundingDate should not be in the future.'
            });
          }
        } else {
          result.addInfo('Organization missing foundingDate', {
            recommendation: 'Add foundingDate for better knowledge panel completeness.'
          });
        }

        // numberOfEmployees validation
        if (schema.numberOfEmployees) {
          const emp = schema.numberOfEmployees;
          if (typeof emp === 'object' && emp['@type'] === 'QuantitativeValue') {
            if (emp.value === undefined || typeof emp.value !== 'number') {
              result.addWarning('numberOfEmployees missing or invalid value', {
                recommendation: 'Add numeric value to QuantitativeValue.'
              });
            }
            if (emp.unitCode && emp.unitCode !== 'C62') { // C62 = "person"
              result.addInfo('numberOfEmployees unitCode should be "C62" (person)', {
                recommendation: 'Use unitCode "C62" for person count.'
              });
            }
          } else if (typeof schema.numberOfEmployees === 'number') {
            // Raw number is OK but QuantitativeValue is preferred
          } else {
            result.addInfo('numberOfEmployees should be a QuantitativeValue', {
              recommendation: 'Use QuantitativeValue with value and unitCode "C62".'
            });
          }
        } else {
          result.addInfo('Organization missing numberOfEmployees', {
            recommendation: 'Add numberOfEmployees as QuantitativeValue for better knowledge panel.'
          });
        }

        // Validate department
        if (schema.department) {
          const departments = Array.isArray(schema.department) ? schema.department : [schema.department];
          departments.forEach((dept, i) => {
            if (typeof dept === 'object' && dept['@type'] === 'Organization') {
            if (!dept.name) {
              result.addWarning('Department ' + i + ' missing name', {
                recommendation: 'Add name to department Organization.'
              });
            }
            if (!dept.url) {
              result.addInfo('Department ' + i + ' missing url', {
                recommendation: 'Add url to department for better navigation.'
              });
            }
          } else if (typeof dept === 'string') {
            // String reference - OK
          } else {
            // result.addWarning('Department ' + i + ' should be an Organization object', {
            //   recommendation: 'Department should be an Organization with @type "Organization".'
            // });
          }
        });

    }

        // Validate subOrganization
        if (schema.subOrganization) {
          const subs = Array.isArray(schema.subOrganization) ? schema.subOrganization : [schema.subOrganization];
          subs.forEach((sub, i) => {
            if (typeof sub === 'object' && sub['@type'] === 'Organization') {
              if (!sub.name) {
                result.addWarning(`subOrganization ${i} missing name`, {
                  recommendation: 'Add name to subOrganization.'
                });
              }
            } else if (typeof sub === 'string') {
              // String reference - OK
} else {
              const warningMsg = 'Department ' + i + ' should be an Organization object';
              result.addWarning(warningMsg, {
                recommendation: 'Department should be an Organization with @type "Organization".'
              });
            }
          });
        }

        // Validate duns (DUNS number)
        if (schema.duns) {
          const duns = String(schema.duns).replace(/\D/g, '');
          if (!/^\d{9}$/.test(duns)) {
            result.addWarning('DUNS number format may be invalid', {
              value: schema.duns,
              recommendation: 'DUNS number should be 9 digits.'
            });
          }
        }

        // Validate taxID
        if (schema.taxID) {
          const taxId = String(schema.taxID).trim();
          if (taxId.length < 5) {
            result.addWarning('taxID may be too short', {
              value: schema.taxID,
              recommendation: 'Verify tax ID format for your country.'
            });
          }
        }

        // Validate legalName
        if (schema.legalName && schema.legalName === schema.name) {
          result.addInfo('legalName is same as name', {
            recommendation: 'legalName should differ from name if using a formal legal name.'
          });
        }

        // Validate contact information
        if (schema.email) {
          const emails = Array.isArray(schema.email) ? schema.email : [schema.email];
          emails.forEach((email, i) => {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              result.addError(`email[${i}] is not a valid email address: ${email}`);
            }
          });
        }
        if (schema.telephone) {
          const phones = Array.isArray(schema.telephone) ? schema.telephone : [schema.telephone];
          phones.forEach((phone, i) => {
            if (!/^[\+]?[\d\s\-\(\)]{7,}$/.test(phone)) {
              result.addWarning(`telephone[${i}] may be invalid format: ${phone}`);
            }
          });
        }
        if (schema.faxNumber) {
          const faxes = Array.isArray(schema.faxNumber) ? schema.faxNumber : [schema.faxNumber];
          faxes.forEach((fax, i) => {
            if (!/^[\+]?[\d\s\-\(\)]{7,}$/.test(fax)) {
              result.addWarning(`faxNumber[${i}] may be invalid format: ${fax}`);
            }
          });
        }

        // areaServed
        if (schema.areaServed) {
          const areas = Array.isArray(schema.areaServed) ? schema.areaServed : [schema.areaServed];
          areas.forEach((area, i) => {
            if (typeof area === 'string') {
              // Text - OK
            } else if (typeof area === 'object') {
              if (!area['@type'] || !['AdministrativeArea', 'GeoShape', 'Place'].includes(area['@type'])) {
                result.addWarning(`areaServed[${i}] should have @type AdministrativeArea, GeoShape, or Place`);
              }
            }
          });
        }

        // brand, review, aggregateRating
        if (schema.brand && typeof schema.brand === 'object' && schema.brand['@type'] !== 'Brand') {
          result.addWarning('brand should be a Brand object', {
            recommendation: 'Use Brand object with @type "Brand".'
          });
        }
        if (schema.review) {
          const reviews = Array.isArray(schema.review) ? schema.review : [schema.review];
          reviews.forEach((rev, i) => {
            if (!rev.author) result.addWarning(`Review ${i} missing author`);
            if (!rev.reviewRating) result.addWarning(`Review ${i} missing reviewRating`);
          });
        }
        if (schema.aggregateRating) {
          if (!schema.aggregateRating.ratingValue) result.addError('aggregateRating missing ratingValue');
          if (!schema.aggregateRating.reviewCount) result.addError('aggregateRating missing reviewCount');
        }

        // member / memberOf
        if (schema.member) {
          const members = Array.isArray(schema.member) ? schema.member : [schema.member];
          members.forEach((m, i) => {
            if (typeof m === 'object' && !m['@type']) {
              result.addWarning(`member[${i}] missing @type`, {
                recommendation: 'Add @type "Person" or "Organization" to member.'
              });
            }
          });
        }
        if (schema.memberOf) {
          const members = Array.isArray(schema.memberOf) ? schema.memberOf : [schema.memberOf];
          members.forEach((m, i) => {
            if (typeof m === 'object' && !m['@type']) {
              result.addWarning(`memberOf[${i}] missing @type`);
            }
          });
        }

        // parentOrganization / subOrganization
        if (schema.parentOrganization) {
          const parents = Array.isArray(schema.parentOrganization) ? schema.parentOrganization : [schema.parentOrganization];
          parents.forEach((p, i) => {
            if (typeof p === 'object' && !p['@type']) {
              result.addWarning(`parentOrganization[${i}] missing @type`);
            }
          });
        }
        if (schema.subOrganization) {
          const subs = Array.isArray(schema.subOrganization) ? schema.subOrganization : [schema.subOrganization];
          subs.forEach((sub, i) => {
            if (typeof sub === 'object' && sub['@type'] !== 'Organization') {
              result.addWarning(`subOrganization[${i}] should have @type "Organization"`);
            }
          });
        }

        // department
        if (schema.department) {
          const depts = Array.isArray(schema.department) ? schema.department : [schema.department];
          depts.forEach((dept, i) => {
            if (typeof dept === 'object' && dept['@type'] !== 'Organization') {
              result.addWarning(`department[${i}] should have @type "Organization"`);
            }
          });
        }

        // Check for awards
        if (schema.award) {
          const awards = Array.isArray(schema.award) ? schema.award : [schema.award];
          awards.forEach((award, i) => {
            if (typeof award === 'object' && !award['@type']) {
              result.addWarning(`award[${i}] missing @type`);
            }
          });
        }

        // Review and aggregateRating on Organization
        if (schema.review) {
          const reviews = Array.isArray(schema.review) ? schema.review : [schema.review];
          reviews.forEach((rev, i) => {
            if (!rev.author) result.addWarning(`Review ${i} missing author`);
            if (!rev.reviewRating) result.addWarning(`Review ${i} missing reviewRating`);
          });
        }
if (schema.aggregateRating) {
	if (!schema.aggregateRating.ratingValue) result.addError('aggregateRating missing ratingValue');
          if (!schema.aggregateRating.reviewCount) result.addError('aggregateRating missing reviewCount');
        }
      }
    }
    }

  validateWebSiteSchema(schema, result) {
    // Check for SearchAction
    if (schema.potentialAction) {
      const actions = Array.isArray(schema.potentialAction) ? schema.potentialAction : [schema.potentialAction];
      const searchAction = actions.find(a => a['@type'] === 'SearchAction');
      
      if (!searchAction) {
        result.addWarning('WebSite missing SearchAction', {
          recommendation: 'Add SearchAction for sitelinks searchbox in Google.'
        });
      } else {
        if (!searchAction.target) {
          result.addError('SearchAction missing target');
        }
        if (!searchAction['query-input']) {
          result.addError('SearchAction missing query-input');
        }
      }
    }
  }

validateBreadcrumbSchema(schema, result, document) {
    if (!schema.itemListElement) {
      result.addError('BreadcrumbList missing itemListElement');
      return;
    }

    const items = Array.isArray(schema.itemListElement) ? schema.itemListElement : [schema.itemListElement];
    
    if (items.length < 2) {
      result.addWarning('BreadcrumbList has fewer than 2 items', {
        recommendation: 'Breadcrumbs should have at least 2 levels (Home > Current Page).'
      });
    }
    
    let lastPosition = 0;
    const urls = new Set();
    items.forEach((item, i) => {
      if (!item['@type'] || !['ListItem', 'ListItem'].includes(item['@type'])) {
        result.addWarning(`Breadcrumb item ${i} missing @type ListItem`);
      }
      
      if (item.position === undefined) {
        result.addError(`Breadcrumb item ${i} missing position`);
      } else if (item.position <= lastPosition) {
        result.addError(`Breadcrumb item ${i} position not sequential`);
      } else if (item.position !== i + 1) {
        result.addWarning(`Breadcrumb item ${i} position should be ${i + 1} (1-based sequential)`, {
          recommendation: 'Positions should be sequential starting from 1.'
        });
      }
      lastPosition = item.position || 0;

      if (!item.item) {
        result.addError(`Breadcrumb item ${i} missing item`);
      } else {
        // Validate item structure
        const itemValue = item.item;
        if (typeof itemValue === 'string') {
          // URL string - validate URL format
          try {
            new URL(itemValue);
            // Check for duplicate URLs
            if (urls.has(itemValue)) {
              result.addWarning(`Breadcrumb item ${i} has duplicate URL: ${itemValue}`, {
                recommendation: 'Each breadcrumb item should have a unique URL.'
              });
            }
            urls.add(itemValue);
            
            // Check if URL matches current page for last item
            if (i === items.length - 1 && document && document.location) {
              const currentUrl = document.location.href.split('#')[0].split('?')[0];
              const itemUrl = itemValue.split('#')[0].split('?')[0];
              if (currentUrl !== itemUrl && !itemUrl.endsWith('/') && !currentUrl.endsWith('/')) {
                result.addInfo(`Last breadcrumb URL may not match current page`, {
                  currentUrl,
                  breadcrumbUrl: itemValue
                });
              }
            }
          } catch (e) {
            result.addError(`Breadcrumb item ${i} has invalid URL: ${itemValue}`);
          }
        } else if (typeof itemValue === 'object') {
          // Item is an object (Thing, WebPage, etc.)
          if (!itemValue['@type']) {
            result.addWarning(`Breadcrumb item ${i} item missing @type`, {
              recommendation: 'Add @type to item (e.g., "WebPage", "Thing").'
            });
          } else if (!['WebPage', 'Thing', 'Article', 'Product', 'CollectionPage'].includes(itemValue['@type'])) {
            result.addInfo(`Breadcrumb item ${i} has unusual @type: ${itemValue['@type']}`, {
              recommendation: 'Common types: WebPage, Thing, Article, Product.'
            });
          }
          
          // Validate item properties
          if (!itemValue.name) {
            result.addWarning(`Breadcrumb item ${i} missing name`, {
              recommendation: 'Add name property to item for better accessibility.'
            });
          }
          
          if (itemValue.url) {
            try {
              new URL(itemValue.url);
              // Check for duplicate URLs
              if (urls.has(itemValue.url)) {
                result.addWarning(`Breadcrumb item ${i} has duplicate URL: ${itemValue.url}`);
              }
              urls.add(itemValue.url);
            } catch (e) {
              result.addError(`Breadcrumb item ${i} has invalid URL: ${itemValue.url}`);
            }
          } else if (itemValue['@id']) {
            // @id is also valid for item
            try {
              new URL(itemValue['@id']);
              if (urls.has(itemValue['@id'])) {
                result.addWarning(`Breadcrumb item ${i} has duplicate @id: ${itemValue['@id']}`);
              }
              urls.add(itemValue['@id']);
            } catch (e) {
              result.addError(`Breadcrumb item ${i} has invalid @id: ${itemValue['@id']}`);
            }
          } else {
            result.addWarning(`Breadcrumb item ${i} item missing url or @id`, {
              recommendation: 'Add url or @id to item for proper navigation.'
            });
          }
        } else {
          result.addWarning(`Breadcrumb item ${i} item has invalid type`, {
            recommendation: 'Item should be a URL string or an object with @type.'
          });
        }
      }
      
      // Check for proper hierarchy (first item should typically be Home)
      if (items.length > 0 && items[0].item) {
        const firstItem = items[0].item;
        const firstName = typeof firstItem === 'object' ? firstItem.name : '';
        const firstUrl = typeof firstItem === 'object' ? (firstItem.url || firstItem['@id']) : firstItem;
        const homeIndicators = ['home', 'homepage', 'главная', 'начало', 'pocetna', 'pocetna stranica'];
        const isHome = homeIndicators.some(h => 
          (firstName && firstName.toLowerCase().includes(h)) || 
          (firstUrl && firstUrl.toLowerCase().includes(h))
        );
        if (!isHome && items.length > 1) {
          result.addInfo('First breadcrumb item does not appear to be Home', {
            recommendation: 'First breadcrumb should typically be Home page.'
          });
        }
      }
      
      // Google Rich Results specific checks
      if (this.config.checkGoogleRichResults) {
        // Check all items have name
        items.forEach((item, i) => {
          if (item.item && typeof item.item === 'object' && !item.item.name) {
            result.addWarning(`Breadcrumb item ${i} missing name`, {
              recommendation: 'Each ListItem should have a name property for rich results.',
              googleRichResults: true
            });
          }
        });
        
        // Check last item is not a link (current page)
        const lastItem = items[items.length - 1];
        if (lastItem && lastItem.item && typeof lastItem.item === 'object' && lastItem.item.url) {
          result.addInfo('Last breadcrumb item has a URL', {
            recommendation: 'Last breadcrumb (current page) typically should not be a link.',
            googleRichResults: true
          });
        }
      }
    });
  }

  validateArticleSchema(schema, result) {
    // Check author
    if (!schema.author) {
      result.addError('Article missing author');
    } else {
      const authors = Array.isArray(schema.author) ? schema.author : [schema.author];
      authors.forEach((author, i) => {
        if (typeof author === 'string') {
          // Just name - OK but not ideal
        } else if (author['@type'] === 'Person') {
          if (!author.name) {
            result.addError(`Author ${i} missing name`);
          }
        } else if (author['@type'] === 'Organization') {
          if (!author.name) {
            result.addError(`Author ${i} (Organization) missing name`);
          }
        }
      });
    }

    // Date validation
    if (schema.datePublished) {
      const date = new Date(schema.datePublished);
      if (isNaN(date.getTime())) {
        result.addError('Invalid datePublished format');
      }
    }
  }

  validateFAQPageSchema(schema, result) {
    // Check mainEntity (required)
    if (!schema.mainEntity) {
      result.addError('FAQPage missing mainEntity', {
        recommendation: 'FAQPage must have a mainEntity property containing an array of Question objects.',
        impact: 'high',
        googleRichResults: true
      });
      return;
    }

    const questions = Array.isArray(schema.mainEntity) ? schema.mainEntity : [schema.mainEntity];
    
    if (questions.length === 0) {
      result.addWarning('FAQPage has empty mainEntity', {
        recommendation: 'Add at least one Question to the FAQPage.'
      });
    }

    questions.forEach((question, index) => {
      // Validate each Question
      if (!question['@type'] || question['@type'] !== 'Question') {
        result.addWarning(`Question ${index + 1} missing or incorrect @type (should be "Question")`, {
          recommendation: 'Each item in mainEntity should have @type: "Question"'
        });
      }

      // Check name (required)
      if (!question.name) {
        result.addError(`Question ${index + 1} missing name`, {
          recommendation: 'Each Question must have a name property with the question text.',
          impact: 'high',
          googleRichResults: true
        });
      } else if (typeof question.name === 'string' && question.name.length > 255) {
        result.addWarning(`Question ${index + 1} name exceeds 255 characters`, {
          recommendation: 'Keep question text concise (under 255 characters) for better display.'
        });
      }

      // Check acceptedAnswer (required)
      if (!question.acceptedAnswer) {
        result.addError(`Question ${index + 1} missing acceptedAnswer`, {
          recommendation: 'Each Question must have an acceptedAnswer property with an Answer object.',
          impact: 'high',
          googleRichResults: true
        });
      } else {
        const answer = question.acceptedAnswer;
        
        // Validate Answer object
        if (!answer['@type'] || answer['@type'] !== 'Answer') {
          result.addWarning(`Question ${index + 1} acceptedAnswer missing or incorrect @type (should be "Answer")`, {
            recommendation: 'The acceptedAnswer should be an object with @type: "Answer"'
          });
        }

        // Check text (required)
        if (!answer.text) {
          result.addError(`Question ${index + 1} acceptedAnswer missing text`, {
            recommendation: 'The Answer must have a text property with the answer content.',
            impact: 'high',
            googleRichResults: true
          });
        } else if (typeof answer.text === 'string' && answer.text.length > 3000) {
          result.addWarning(`Question ${index + 1} answer exceeds 3000 characters`, {
            recommendation: 'Keep answers concise (under 3000 characters) for better display.'
          });
        }

        // Check optional answer properties
        if (answer.upvoteCount !== undefined && typeof answer.upvoteCount !== 'number') {
          result.addWarning(`Question ${index + 1} upvoteCount should be an integer`);
        }
        
        if (answer.dateCreated) {
          const date = new Date(answer.dateCreated);
          if (isNaN(date.getTime())) {
            result.addWarning(`Question ${index + 1} dateCreated has invalid format`);
          }
        }
      }
    });

    // Check for publisher
    if (!schema.publisher) {
      result.addInfo('FAQPage missing publisher', {
        recommendation: 'Add publisher information for better attribution.'
      });
    }
  }

  validateNestedSchemas(schema, definition, result) {
    // Recursively validate nested objects with @type
    for (const [prop, value] of Object.entries(schema)) {
      const values = Array.isArray(value) ? value : [value];
      
      values.forEach(v => {
        if (v && typeof v === 'object' && v['@type']) {
          const nestedDef = SCHEMA_DEFINITIONS[v['@type']];
          if (nestedDef) {
            const nestedResult = this.validateSchema(v, document, '', {});
            // Merge but prefix errors
            nestedResult.errors.forEach(e => {
              result.addError(`${prop}.${e.details.property || ''} ${e.message}`, e.details);
            });
            nestedResult.warnings.forEach(w => {
              result.addWarning(`${prop}.${w.details.property || ''} ${w.message}`, w.details);
            });
          }
        }
      });
    }
  }

  validateGoogleRichResults(schema, result) {
    const type = schema['@type'];
    
    // Product rich results requirements
    if (type === 'Product') {
      const required = ['name', 'image', 'description', 'sku', 'offers'];
      const missing = required.filter(p => !schema[p]);
      
      if (missing.length > 0) {
        result.addError(`Product not eligible for rich results: missing ${missing.join(', ')}`, {
          missing,
          impact: 'critical',
          googleRichResults: true
        });
      }

      // Offers must have price, currency, availability
      if (schema.offers) {
        const offers = Array.isArray(schema.offers) ? schema.offers : [schema.offers];
        offers.forEach((offer, i) => {
          const offerMissing = ['price', 'priceCurrency', 'availability'].filter(p => !offer[p]);
          if (offerMissing.length > 0) {
            result.addError(`Offer ${i} incomplete for rich results: missing ${offerMissing.join(', ')}`, {
              impact: 'critical',
              googleRichResults: true
            });
          }
        });
      }
    }

    // Organization rich results
    if (type === 'Organization') {
      if (!schema.logo) {
        result.addWarning('Organization missing logo for knowledge panel');
      }
      if (!schema.sameAs) {
        result.addWarning('Organization missing sameAs for social profiles in knowledge panel');
      }
    }

    // BreadcrumbList
    if (type === 'BreadcrumbList') {
      if (!schema.itemListElement || (Array.isArray(schema.itemListElement) && schema.itemListElement.length < 2)) {
        result.addWarning('BreadcrumbList may not qualify for rich results (needs 2+ items)');
      }
    }

    // FAQPage
    if (type === 'FAQPage') {
      if (!schema.mainEntity || (Array.isArray(schema.mainEntity) && schema.mainEntity.length === 0)) {
        result.addError('FAQPage not eligible for rich results: missing or empty mainEntity', {
          impact: 'critical',
          googleRichResults: true
        });
      }

      const questions = Array.isArray(schema.mainEntity) ? schema.mainEntity : [schema.mainEntity];
      
      questions.forEach((question, index) => {
        if (!question.name) {
          result.addError(`FAQPage Question ${index + 1} missing name for rich results`, {
            impact: 'critical',
            googleRichResults: true
          });
        }
        
        if (!question.acceptedAnswer) {
          result.addError(`FAQPage Question ${index + 1} missing acceptedAnswer for rich results`, {
            impact: 'critical',
            googleRichResults: true
          });
        } else if (!question.acceptedAnswer.text) {
          result.addError(`FAQPage Question ${index + 1} acceptedAnswer missing text`, {
            impact: 'critical',
            googleRichResults: true
          });
        }

        if (!question['@type'] || question['@type'] !== 'Question') {
          result.addError(`FAQPage Question ${index + 1} missing @type "Question"`, {
            impact: 'critical',
            googleRichResults: true
          });
        }

        if (question.acceptedAnswer && (!question.acceptedAnswer['@type'] || question.acceptedAnswer['@type'] !== 'Answer')) {
          result.addError(`FAQPage Question ${index + 1} acceptedAnswer missing @type "Answer"`, {
            impact: 'critical',
            googleRichResults: true
          });
        }

        if (question.acceptedAnswer && !question.acceptedAnswer.text) {
          result.addError(`FAQPage Question ${index + 1} acceptedAnswer missing text`, {
            impact: 'critical',
            googleRichResults: true
          });
        }
      });
    }
  }

  validateRequiredTypes(result) {
    const foundTypes = result.metadata.schemaTypes || [];
    const requiredTypes = this.config.requiredTypes || [];
    
    for (const requiredType of requiredTypes) {
      if (!foundTypes.includes(requiredType)) {
        result.addWarning(`Recommended schema type missing: ${requiredType}`, {
          recommendation: `Add ${requiredType} schema for better search visibility.`
        });
      }
    }
  }

  validateCrossSchemaConsistency(result) {
    // Check Organization name consistency
    const orgs = this.schemas.filter(s => s['@type'] === 'Organization');
    if (orgs.length > 1) {
      const names = orgs.map(o => o.name).filter(Boolean);
      if (new Set(names).size > 1) {
        result.addWarning('Multiple Organization schemas with different names', {
          names: [...new Set(names)],
          recommendation: 'Use consistent organization name across all schemas.'
        });
      }
    }

    // Check WebSite publisher matches Organization
    const websites = this.schemas.filter(s => s['@type'] === 'WebSite');
    const orgs2 = this.schemas.filter(s => s['@type'] === 'Organization');
    
    if (websites.length > 0 && orgs2.length > 0) {
      const website = websites[0];
      const org = orgs2[0];
      
      if (website.publisher && org.name) {
        const pubName = typeof website.publisher === 'object' ? website.publisher.name : website.publisher;
        if (pubName && pubName !== org.name) {
          result.addWarning('WebSite publisher name differs from Organization name', {
            publisher: pubName,
            organization: org.name,
            recommendation: 'Ensure WebSite.publisher matches Organization.name'
          });
        }
      }
    }

    // Product brand consistency
    const products = this.schemas.filter(s => s['@type'] === 'Product');
    products.forEach(product => {
      if (product.brand && typeof product.brand === 'object' && product.brand['@type'] === 'Brand') {
        const org = orgs2[0];
        if (org && product.brand.name !== org.name) {
          result.addInfo(`Product brand "${product.brand.name}" differs from Organization "${org.name}"`);
        }
      }
    });
  }

  calculateScore(result) {
    if (result.metadata.totalSchemas === 0) return 0;
    
    let score = 100;
    
    // Penalties
    result.errors.forEach(e => {
      score -= e.details.impact === 'critical' ? 30 : (e.details.impact === 'high' ? 20 : 10);
    });
    
    result.warnings.forEach(() => score -= 5);
    
    // Bonus for having required schemas
    const foundTypes = result.metadata.schemaTypes || [];
    const requiredTypes = this.config.requiredTypes || [];
    const requiredFound = requiredTypes.filter(t => foundTypes.includes(t)).length;
    score += (requiredFound / requiredTypes.length) * 20;
    
    // Bonus for rich results eligibility
    const hasProduct = this.schemas.some(s => s['@type'] === 'Product');
    if (hasProduct) {
      const product = this.schemas.find(s => s['@type'] === 'Product');
      const richResultReady = product.offers && product.image && product.description && product.sku;
      if (richResultReady) score += 15;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Static method for cross-page schema consistency
   * @param {Array} allResults
   * @returns {ValidationResult}
   */
  static checkCrossPageConsistency(allResults) {
    const consistencyResult = new ValidationResult();
    const schemasByType = new Map();
    
    allResults.forEach(r => {
      if (r.metadata.validator === 'schema' && r.metadata.schemaType) {
        if (!schemasByType.has(r.metadata.schemaType)) {
          schemasByType.set(r.metadata.schemaType, []);
        }
        schemasByType.get(r.metadata.schemaType).push({
          url: r.metadata.url,
          schema: r.metadata.rawSchema || {}
        });
      }
    });

    // Check Organization consistency across pages
    const orgs = schemasByType.get('Organization') || [];
    if (orgs.length > 1) {
      const names = new Set(orgs.map(o => o.schema.name).filter(Boolean));
      const urls = new Set(orgs.map(o => o.schema.url).filter(Boolean));
      const logos = new Set(orgs.map(o => o.schema.logo).filter(Boolean));
      
      if (names.size > 1) {
        consistencyResult.addWarning('Organization name differs across pages', {
          names: [...names],
          pages: orgs.map(o => o.url)
        });
      }
      if (urls.size > 1) {
        consistencyResult.addWarning('Organization URL differs across pages', {
          urls: [...urls],
          pages: orgs.map(o => o.url)
        });
      }
    }

    // Check WebSite consistency
    const websites = schemasByType.get('WebSite') || [];
    if (websites.length > 1) {
      const names = new Set(websites.map(w => w.schema.name).filter(Boolean));
      if (names.size > 1) {
        consistencyResult.addWarning('WebSite name differs across pages', {
          names: [...names],
          pages: websites.map(w => w.url)
        });
      }
    }

    return consistencyResult;
  }
}

export default SchemaValidator;