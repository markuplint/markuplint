# @markuplint/html-spec

[![npm version](https://badge.fury.io/js/%40markuplint%2Fhtml-spec.svg)](https://www.npmjs.com/package/@markuplint/html-spec)

**Canonical HTML Living Standard dataset provider with automated external data enrichment.**

This package provides the consolidated HTML element specification data for markuplint, including:

- **HTML Living Standard elements** with complete attribute definitions
- **WAI-ARIA mappings** (implicit roles, permitted roles, ARIA properties)
- **Content model definitions** for each element
- **MDN-enriched metadata** (descriptions, compatibility, experimental status)
- **Automated external data integration** from authoritative sources

This package serves as the data layer in markuplint's specification system, depending on `@markuplint/ml-spec` for type definitions and structural schemas.

## Package Architecture

This package serves as the data layer in markuplint's specification system:

```
@markuplint/ml-spec (Foundation Layer)
  ↓ provides types, algorithms, schemas
@markuplint/html-spec (Data Layer) ← YOU ARE HERE
  ↓ provides HTML specification data
Framework-specific specs (Extension Layer)
  ↓ provide framework extensions
Core packages (Application Layer)
  ↓ consume specifications for validation
```

## Package Contents

### Generated Output (DO NOT EDIT)

- **`index.json`** - Consolidated specification data (48K+ lines)
  - All HTML elements with complete specifications
  - Global attribute definitions (`#HTMLGlobalAttrs`, `#ARIAAttrs`)
  - ARIA role and property definitions (`#aria`)
  - Content model macros (`#contentModels`)
  - Citation references to authoritative sources

### Source Files (EDIT THESE)

- **`src/spec-*.json`** - Individual element specifications
  - `src/spec.div.json` → `<div>` element specification
  - `src/spec.table.json` → `<table>` element specification
  - `src/spec.svg_text.json` → `<svg:text>` element specification
- **`src/spec-common.attributes.json`** - Shared attribute definitions
- **`src/spec-common.contents.json`** - Reusable content model macros

### Build Process

- **`build.mjs`** - Generation script that invokes `@markuplint/spec-generator`
- **External data sources**:
  - **MDN Web Docs** - Element descriptions, compatibility data, attribute metadata
  - **W3C ARIA specifications** - Role definitions, property mappings (1.1/1.2/1.3)
  - **HTML Living Standard** - Obsolete element definitions
  - **SVG specifications** - SVG element definitions and categories

## Data Structure

The generated `index.json` follows this structure:

```typescript
{
  cites: Cites;           // Reference citations to external specs
  def: {                  // Global definitions
    "#HTMLGlobalAttrs": GlobalAttributes;
    "#ARIAAttrs": ARIAAttributes;
    "#aria": ARIASpecification;
    "#contentModels": ContentModelMacros;
  };
  specs: ElementSpec[];   // Individual element specifications
}
```

### Element Specification Format

Each element specification includes:

```typescript
{
  name: string;                    // Element name (e.g., "table", "tr")
  cite: string;                   // MDN reference URL
  description: string;            // Human-readable description
  categories: string[];           // Content categories (flow, phrasing, etc.)
  contentModel: ContentModel;     // Permitted child elements
  globalAttrs: GlobalAttrSets;    // Applicable global attributes
  attributes: AttributeSpecs;     // Element-specific attributes
  aria: {                        // ARIA integration
    implicitRole: string | null;  // Default ARIA role
    permittedRoles: string[] | boolean;  // Allowed ARIA roles
    namingProhibited?: boolean;   // Accessible name constraints
    conditions?: ConditionalARIA; // Context-specific ARIA rules
  };
  omission?: TagOmissionRules;    // Start/end tag omission rules
}
```

## Relationship to @markuplint/ml-spec

**@markuplint/ml-spec** provides the foundation:

- **Type definitions** (`ElementSpec`, `ExtendedSpec`, `MLMLSpec`) that structure this data
- **JSON schemas** that validate the specification format
- **Algorithms** that process and compute values from this specification data
- **Runtime utilities** that consume this consolidated specification data

**@markuplint/html-spec** (this package) provides:

- **Canonical HTML data** following the type definitions from `@markuplint/ml-spec`
- **External data enrichment** from MDN and W3C specifications
- **Build automation** that keeps data synchronized with external sources
- **Single consolidated dataset** optimized for runtime consumption

This separation enables:

- **Independent data updates** without affecting type definitions or algorithms
- **Algorithm improvements** without requiring data regeneration
- **Framework extensions** that can augment this base HTML data

## Development Workflow

### Adding or Editing HTML Elements

1. **Edit source specifications**
   - Add new file: `src/spec.<element>.json` (e.g., `src/spec.dialog.json`)
   - Edit existing: Update relevant `src/spec-*.json` file
   - For SVG elements: Use pattern `src/spec.svg_<local>.json`

2. **Regenerate the dataset**

   ```bash
   # From repository root (recommended)
   yarn up:gen

   # Or for this package only
   yarn workspace @markuplint/html-spec run gen
   ```

3. **Verify output**
   - Check `index.json` for expected changes
   - Ensure no unintended modifications to other elements

### Element Specification Guide

**Minimal element specification**:

```json
{
  "contentModel": {
    "contents": [{ "require": "#phrasing" }]
  },
  "globalAttrs": {
    "#HTMLGlobalAttrs": true,
    "#ARIAAttrs": true
  },
  "attributes": {
    "custom-attr": { "type": "String" }
  },
  "aria": {
    "implicitRole": "button",
    "permittedRoles": ["link", "tab"]
  }
}
```

**Key principles**:

- Only specify what differs from defaults or overrides MDN data
- Use references to global attribute sets when possible
- Define content models using semantic categories (`#flow`, `#phrasing`)
- Include ARIA specifications following HTML-ARIA mapping guidelines

### Common Editing Patterns

**Adding element-specific attributes**:

```json
{
  "attributes": {
    "href": {
      "type": "URL",
      "required": false,
      "description": "Target URL for navigation"
    },
    "download": {
      "type": "String",
      "experimental": true
    }
  }
}
```

**Conditional ARIA rules**:

```json
{
  "aria": {
    "implicitRole": "link",
    "permittedRoles": ["button", "menuitem"],
    "conditions": {
      ":not([href])": {
        "implicitRole": "generic",
        "namingProhibited": true
      }
    }
  }
}
```

**Complex content models**:

```json
{
  "contentModel": {
    "contents": [{ "transparent": ":not(:model(interactive), a, [tabindex])" }]
  }
}
```

## Build Process Details

### What `yarn up:gen` does

1. **Invokes spec-generator** with inputs:
   - HTML spec sources: `src/spec-*.json`
   - Common attributes: `src/spec-common.attributes.json`
   - Common content models: `src/spec-common.contents.json`

2. **External data enrichment**:
   - **MDN scraping**: Fetches descriptions, categories, attribute metadata
   - **ARIA integration**: Downloads W3C ARIA specifications (1.1/1.2/1.3)
   - **Obsolete elements**: Adds deprecated elements from HTML Living Standard
   - **SVG specifications**: Includes SVG element definitions and categories

3. **Data consolidation**:
   - Merges manual specifications with fetched data
   - Resolves conflicts (manual data takes precedence)
   - Validates against JSON schemas from `@markuplint/ml-spec`
   - Generates citations and references

4. **Output generation**:
   - Writes consolidated `index.json`
   - Formats with Prettier
   - Validates structural integrity

### External Data Sources

**MDN Web Docs** (`developer.mozilla.org`):

- Element descriptions and usage guidance
- Compatibility tables and browser support
- Attribute metadata (deprecated, experimental, obsolete)
- Tag omission rules and semantic information

**W3C ARIA Specifications**:

- **ARIA 1.1**: `https://www.w3.org/TR/wai-aria-1.1/`
- **ARIA 1.2**: `https://www.w3.org/TR/wai-aria-1.2/`
- **ARIA 1.3**: `https://w3c.github.io/aria/`
- **HTML-ARIA**: `https://www.w3.org/TR/html-aria/`

**HTML Living Standard** (`https://html.spec.whatwg.org/`):

- Obsolete element definitions
- Semantic category classifications
- Content model specifications

### Caching and Performance

- **External fetches are cached** to prevent unnecessary network requests during development
- **CI/CD builds** refresh external data to stay current with specification changes
- **Generated output is optimized** for runtime consumption (single file, pre-resolved references)

## File Naming Conventions

**HTML elements**: `src/spec.<tag>.json`

- Examples: `spec.div.json`, `spec.table.json`, `spec.input.json`

**SVG elements**: `src/spec.svg_<local>.json`

- Examples: `spec.svg_text.json`, `spec.svg_circle.json`
- Element name inferred as `svg:<local>` (e.g., `svg:text`)

**Special files**:

- `spec-common.attributes.json` - Global attribute category definitions
- `spec-common.contents.json` - Reusable content model macros

## Install

[`markuplint`](https://www.npmjs.com/package/markuplint) package includes this package.

<details>
<summary>If you are installing purposely, how below:</summary>

```shell
$ npm install @markuplint/html-spec

$ yarn add @markuplint/html-spec
```

</details>

## Important Notes

### Do Not Edit Generated Files

- **Never modify `index.json` directly** - it will be overwritten
- Always update source files in `src/` and regenerate

### Manual Data Takes Precedence

- Your specifications in `src/spec-*.json` override scraped MDN data
- Use this to correct inaccuracies or add missing information
- External data fills gaps but doesn't override manual specifications

### Specification Compliance

- ARIA mappings should follow W3C HTML-ARIA mapping guidelines
- Content models should align with HTML Living Standard definitions
- Attribute types should reference `@markuplint/types` definitions

### Framework Integration

- This package provides base HTML specifications
- Framework-specific packages (Vue, React, Svelte) extend this base data
- Extensions are merged at runtime using `@markuplint/ml-spec` utilities

## License

MIT
