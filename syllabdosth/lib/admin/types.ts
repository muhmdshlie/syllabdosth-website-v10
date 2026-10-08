/** Shared (server + client) types for the admin panel's generic list/edit screens. */

export type FieldType =
  | 'text' | 'textarea' | 'number' | 'bool' | 'select' | 'relation' | 'multirelation' | 'multiselect'
  | 'lines' | 'date' | 'datetime' | 'image' | 'url' | 'email' | 'password' | 'slug' | 'list' | 'group' | 'color';

export type Option = { value: string; label: string };

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: Option[];          // select / multiselect
  to?: string;                 // relation / multirelation: target resource key
  from?: string;               // slug: field it is generated from
  min?: number;
  max?: number;
  int?: boolean;
  rows?: number;
  fields?: Field[];            // list items / group children
  itemLabel?: string;          // list: name for one item ("question", "slide")
  titleKey?: string;           // list: item field shown in the collapsed header
  full?: boolean;              // span the whole form width
  readonly?: boolean;          // shown, never saved
  createOnly?: boolean;        // editable only when creating
  showIf?: { field: string; equals: string[] };
  default?: unknown;
};

export type ColumnKind = 'text' | 'strong' | 'image' | 'bool' | 'status' | 'date' | 'datetime' | 'money' | 'relation' | 'stars' | 'count' | 'role';
export type Column = { name: string; label: string; kind?: ColumnKind; to?: string };

export type Filter = { name: string; label: string; options?: Option[]; to?: string };

export type Resource = {
  key: string;                 // URL: /admin/<key>
  table: string;
  pk: string;
  label: string;               // plural, page title
  singular: string;
  titleField: string;          // used as the record's name in relations and headings
  fields: Field[];
  columns: Column[];
  search?: string[];
  filters?: Filter[];
  baseFilter?: Record<string, string>;
  defaultSort?: { col: string; asc?: boolean };
  noCreate?: boolean;
  noDelete?: boolean;
  noEdit?: boolean;
  createHint?: string;         // shown instead of "Add" when noCreate
  description?: string;
  group?: string;              // resources sharing a group get tabs on their list page
  viewPath?: string;           // public page, e.g. '/courses/{slug}'
  perPage?: number;
};

export type Row = Record<string, unknown>;
