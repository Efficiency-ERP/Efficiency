export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type PartyType = string
export type ArticleType = "product" | "service"
export type PackagingType = "BOUTEILLE" | "PALETTE" | "CASIER"
export type DocumentKind = "quote" | "invoice" | "delivery" | "order"
export type DocumentFlow = "sale" | "purchase"
export type InvoiceType = "standard" | "credit" | "debit"
export type InvoiceDirection = "in" | "out"
export type PaymentMethod = "especes" | "cheque" | "virement" | "traite" | "carte"
export type CounterpartyKind = "contact" | "organization"
export type OrderType = "supplier" | "interco" | "customer"
export type DocumentStatus = "draft" | "final"
export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected"

export type TaxBase = "ht" | "transfer" | "cumulative"

export interface TaxCharge {
  id: string
  label: string
  rate: number
  base: TaxBase
}

// Line charges are per-line and percentage-only. A charge that applies once to
// the whole document — Tunisia's timbre fiscal above all — is neither, so it
// gets its own shape. The base deliberately isn't TaxBase: "transfer" and
// "cumulative" are per-line concepts with no document-level meaning. A negative
// rate is legal and is how a retenue a la source is expressed.
export type DocumentChargeBase = "ht" | "ttc"

export interface DocumentCharge {
  id: string
  label: string
  kind: "percent" | "fixed"
  rate?: number
  amount?: number
  base?: DocumentChargeBase
}

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
        }
      }
      organizations: {
        Row: {
          id: string
          tenant_id: string
          name: string
          mf: string | null
          unique_id: string | null
          address: Json
          contact: Json
          conditions_de_vente: string | null
          logo_path: string | null
          bank_details: Json | null
          stamp_duty: number | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          mf?: string | null
          unique_id?: string | null
          address?: Json
          contact?: Json
          conditions_de_vente?: string | null
          logo_path?: string | null
          bank_details?: Json | null
          stamp_duty?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          mf?: string | null
          unique_id?: string | null
          address?: Json
          contact?: Json
          conditions_de_vente?: string | null
          logo_path?: string | null
          bank_details?: Json | null
          stamp_duty?: number | null
        }
      }
      contacts: {
        Row: {
          id: string
          party_type: PartyType
          tenant_id: string
          is_internal_org: boolean
          internal_organization_id: string | null
          company_name: string
          mf: string | null
          unique_id: string | null
          address: Json
          contact: Json
          conditions_de_vente: string | null
          archived: boolean
          created_at: string
        }
        Insert: {
          id?: string
          party_type: PartyType
          tenant_id: string
          internal_organization_id?: string | null
          company_name: string
          mf?: string | null
          unique_id?: string | null
          address?: Json
          contact?: Json
          conditions_de_vente?: string | null
          archived?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          party_type?: PartyType
          tenant_id?: string
          internal_organization_id?: string | null
          company_name?: string
          mf?: string | null
          unique_id?: string | null
          address?: Json
          contact?: Json
          conditions_de_vente?: string | null
          archived?: boolean
        }
      }
      articles: {
        Row: {
          id: string
          type: ArticleType
          code: string
          designation: string
          organization_id: string | null
          unit: string | null
          unit_price_puht: number
          transfer_price: number
          tax_charges: Json
          stock: Json
          consignment: Json
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          type: ArticleType
          code: string
          designation: string
          organization_id?: string | null
          unit?: string | null
          unit_price_puht?: number
          transfer_price?: number
          tax_charges?: Json
          stock?: Json
          consignment?: Json
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          type?: ArticleType
          code?: string
          designation?: string
          organization_id?: string | null
          unit?: string | null
          unit_price_puht?: number
          transfer_price?: number
          tax_charges?: Json
          stock?: Json
          consignment?: Json
          active?: boolean
        }
      }
      documents: {
        Row: {
          id: string
          kind: DocumentKind
          subtype: string | null
          number: string
          date: string
          due_date: string | null
          organization_id: string
          counterparty_id: string
          flow: DocumentFlow
          direction: InvoiceDirection | null
          status: string | null
          totals: Json
          charges: Json
          notes: string | null
          source_document_id: string | null
          attributes: Json
          created_at: string
        }
        Insert: {
          id?: string
          kind: DocumentKind
          subtype?: string | null
          number: string
          date?: string
          due_date?: string | null
          organization_id: string
          counterparty_id: string
          flow: DocumentFlow
          direction?: InvoiceDirection | null
          status?: string | null
          totals?: Json
          charges?: Json
          notes?: string | null
          source_document_id?: string | null
          attributes?: Json
          created_at?: string
        }
        Update: {
          id?: string
          kind?: DocumentKind
          subtype?: string | null
          number?: string
          date?: string
          due_date?: string | null
          organization_id?: string
          counterparty_id?: string
          flow?: DocumentFlow
          direction?: InvoiceDirection | null
          status?: string | null
          totals?: Json
          charges?: Json
          notes?: string | null
          source_document_id?: string | null
          attributes?: Json
        }
      }
      document_lines: {
        Row: {
          id: string
          document_id: string
          article_id: string | null
          code: string
          designation: string
          unit: string | null
          quantity: number
          unit_price_excl_tax: number
          discount_percent: number | null
          tax_charges: Json
          consignments: Json
        }
        Insert: {
          id?: string
          document_id: string
          article_id?: string | null
          code: string
          designation: string
          unit?: string | null
          quantity?: number
          unit_price_excl_tax?: number
          discount_percent?: number | null
          tax_charges?: Json
          consignments?: Json
        }
        Update: {
          id?: string
          document_id?: string
          article_id?: string | null
          code?: string
          designation?: string
          unit?: string | null
          quantity?: number
          unit_price_excl_tax?: number
          discount_percent?: number | null
          tax_charges?: Json
          consignments?: Json
        }
      }
      consignment_lines: {
        Row: {
          id: string
          document_id: string | null
          source_line_id: string | null
          organization_id: string | null
          counterparty_id: string | null
          date: string | null
          direction: "in" | "out" | null
          notes: string | null
          packaging_type: string
          units_per_article: number
          quantity: number
          deposit_value: number
          total: number
        }
        Insert: {
          id?: string
          document_id?: string | null
          source_line_id?: string | null
          organization_id?: string | null
          counterparty_id?: string | null
          date?: string | null
          direction?: "in" | "out" | null
          notes?: string | null
          packaging_type: string
          units_per_article?: number
          quantity?: number
          deposit_value?: number
          total?: number
        }
        Update: {
          id?: string
          document_id?: string | null
          source_line_id?: string | null
          organization_id?: string | null
          counterparty_id?: string | null
          date?: string | null
          direction?: "in" | "out" | null
          notes?: string | null
          packaging_type?: string
          units_per_article?: number
          quantity?: number
          deposit_value?: number
          total?: number
        }
      }
      issues: {
        Row: {
          id: string
          number: string
          date: string
          organization_id: string
          counterparty_id: string
          status: DocumentStatus
          created_at: string
        }
        Insert: {
          id?: string
          number: string
          date?: string
          organization_id: string
          counterparty_id: string
          status?: DocumentStatus
          created_at?: string
        }
        Update: {
          id?: string
          number?: string
          date?: string
          organization_id?: string
          counterparty_id?: string
          status?: DocumentStatus
        }
      }
      issue_lines: {
        Row: {
          id: string
          issue_id: string
          article_id: string | null
          code: string
          designation: string
          unit: string | null
          quantity: number
        }
        Insert: {
          id?: string
          issue_id: string
          article_id?: string | null
          code: string
          designation: string
          unit?: string | null
          quantity?: number
        }
        Update: {
          id?: string
          issue_id?: string
          article_id?: string | null
          code?: string
          designation?: string
          unit?: string | null
          quantity?: number
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string | null
          role: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          email?: string | null
          role?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          email?: string | null
          role?: string | null
          avatar_url?: string | null
        }
      }
      user_tenants: {
        Row: {
          user_id: string
          tenant_id: string
          role: string
        }
        Insert: {
          user_id: string
          tenant_id: string
          role?: string
        }
        Update: {
          user_id?: string
          tenant_id?: string
          role?: string
        }
      }
      logs: {
        Row: {
          id: string
          user_id: string | null
          user_name: string | null
          module: string
          message: string
          target_id: string | null
          organization_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          user_name?: string | null
          module: string
          message: string
          target_id?: string | null
          organization_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          user_name?: string | null
          module?: string
          message?: string
          target_id?: string | null
          organization_id?: string | null
        }
      }
      stock_movements: {
        Row: {
          id: string
          article_id: string
          organization_id: string
          quantity_delta: number
          direction: StockMovementDirection
          source_type: StockMovementSourceType
          source_document_id: string | null
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          article_id: string
          organization_id: string
          quantity_delta: number
          direction: StockMovementDirection
          source_type: StockMovementSourceType
          source_document_id?: string | null
          date?: string
          created_at?: string
        }
        Update: {
          id?: string
          article_id?: string
          organization_id?: string
          quantity_delta?: number
          direction?: StockMovementDirection
          source_type?: StockMovementSourceType
          source_document_id?: string | null
          date?: string
        }
      }
    }
  }
}

export type StockMovementDirection = "in" | "out"
export type StockMovementSourceType = "delivery"

// Convenience types
export type Tenant = Database["public"]["Tables"]["tenants"]["Row"]
export type Organization = Database["public"]["Tables"]["organizations"]["Row"]
export type Contact = Database["public"]["Tables"]["contacts"]["Row"]
export type Article = Database["public"]["Tables"]["articles"]["Row"]
// quote/invoice/delivery/order are all the same physical row (documents/
// document_lines), discriminated at runtime by `kind` — these are kind-
// narrowed views, not separate shapes, so a Quote and an Invoice are
// structurally identical; the lib layer filters by kind on every query.
export type Document = Database["public"]["Tables"]["documents"]["Row"]
export type DocumentLine = Database["public"]["Tables"]["document_lines"]["Row"]
export type Quote = Document
export type QuoteLine = DocumentLine
export type Invoice = Document
export type InvoiceLine = DocumentLine
export type ConsignmentLine = Database["public"]["Tables"]["consignment_lines"]["Row"]

// Backed by the consignment_balances view — net(sum(quantity)) per
// counterparty + packaging_type across every charge (via invoice) and
// return (standalone) row in consignment_lines.
export interface ConsignmentBalance {
  organization_id: string | null
  counterparty_id: string | null
  packaging_type: string
  quantity_outstanding: number
  deposit_outstanding: number
}
export type Delivery = Document
export type DeliveryLine = DocumentLine
export type Order = Document
export type OrderLine = DocumentLine
export type Issue = Database["public"]["Tables"]["issues"]["Row"]
export type IssueLine = Database["public"]["Tables"]["issue_lines"]["Row"]
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type UserTenant = Database["public"]["Tables"]["user_tenants"]["Row"]
export type Log = Database["public"]["Tables"]["logs"]["Row"]
export type StockMovement = Database["public"]["Tables"]["stock_movements"]["Row"]

// Address and contact types from JSONB
export interface Address {
  line1: string
  city: string
  zipCode: string
  country: string
}

export interface ContactInfo {
  phone: string | null
  fax: string | null
}

// Shown on invoices so a customer paying by virement has the account to
// pay into. All optional — an org that doesn't take transfers leaves it empty.
export interface BankDetails {
  bank_name?: string | null
  rib?: string | null
  iban?: string | null
  swift?: string | null
}

export interface Stock {
  onHand: number
  minStock: number
}

export interface ConsignmentPackaging {
  type: PackagingType
  unitsPerArticle: number
  depositValue: number
}

export interface Consignment {
  enabled: boolean
  packaging: ConsignmentPackaging[]
}

// Kind-specific extras bundled into documents.attributes jsonb rather than
// dedicated columns — invoice: payment_method/counterparty_kind; delivery:
// driver_name/vehicle_registration.
export interface DocumentAttributes {
  payment_method?: PaymentMethod | null
  counterparty_kind?: CounterpartyKind
  driver_name?: string | null
  vehicle_registration?: string | null
}

export interface InvoiceTotals {
  subtotal_excl_tax?: number
  chargesByKey?: Record<string, number>
  total_incl_tax?: number
}
