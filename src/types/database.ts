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

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          mf: string | null
          unique_id: string | null
          address: Json
          contact: Json
          conditions_de_vente: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          mf?: string | null
          unique_id?: string | null
          address?: Json
          contact?: Json
          conditions_de_vente?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          mf?: string | null
          unique_id?: string | null
          address?: Json
          contact?: Json
          conditions_de_vente?: string | null
        }
      }
      contacts: {
        Row: {
          id: string
          party_type: PartyType
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
          is_internal_org?: boolean
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
          is_internal_org?: boolean
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
      quotes: {
        Row: {
          id: string
          number: string
          date: string
          organization_id: string
          counterparty_id: string
          status: QuoteStatus
          totals: Json
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          number: string
          date?: string
          organization_id: string
          counterparty_id: string
          status?: QuoteStatus
          totals?: Json
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          number?: string
          date?: string
          organization_id?: string
          counterparty_id?: string
          status?: QuoteStatus
          totals?: Json
          notes?: string | null
        }
      }
      quote_lines: {
        Row: {
          id: string
          quote_id: string
          article_id: string | null
          code: string
          designation: string
          unit: string | null
          quantity: number
          unit_price_puht: number
          remise_percent: number | null
          tax_charges: Json
          consignments: Json
        }
        Insert: {
          id?: string
          quote_id: string
          article_id?: string | null
          code: string
          designation: string
          unit?: string | null
          quantity?: number
          unit_price_puht?: number
          remise_percent?: number | null
          tax_charges?: Json
          consignments?: Json
        }
        Update: {
          id?: string
          quote_id?: string
          article_id?: string | null
          code?: string
          designation?: string
          unit?: string | null
          quantity?: number
          unit_price_puht?: number
          remise_percent?: number | null
          tax_charges?: Json
          consignments?: Json
        }
      }
      invoices: {
        Row: {
          id: string
          number: string
          date: string
          due_date: string | null
          organization_id: string
          counterparty_kind: CounterpartyKind
          counterparty_id: string
          type: InvoiceType
          direction: InvoiceDirection
          payment_method: PaymentMethod | null
          totals: Json
          source_order_id: string | null
          source_quote_id: string | null
          source_delivery_id: string | null
          original_invoice_id: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          number: string
          date?: string
          due_date?: string | null
          organization_id: string
          counterparty_kind: CounterpartyKind
          counterparty_id: string
          type: InvoiceType
          direction: InvoiceDirection
          payment_method?: PaymentMethod | null
          totals?: Json
          source_order_id?: string | null
          source_quote_id?: string | null
          source_delivery_id?: string | null
          original_invoice_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          number?: string
          date?: string
          due_date?: string | null
          organization_id?: string
          counterparty_kind?: CounterpartyKind
          counterparty_id?: string
          type?: InvoiceType
          direction?: InvoiceDirection
          payment_method?: PaymentMethod | null
          totals?: Json
          source_order_id?: string | null
          source_quote_id?: string | null
          source_delivery_id?: string | null
          original_invoice_id?: string | null
          notes?: string | null
        }
      }
      invoice_lines: {
        Row: {
          id: string
          invoice_id: string
          article_id: string | null
          code: string
          designation: string
          unit: string | null
          quantity: number
          unit_price_puht: number
          remise_percent: number | null
          tax_charges: Json
        }
        Insert: {
          id?: string
          invoice_id: string
          article_id?: string | null
          code: string
          designation: string
          unit?: string | null
          quantity?: number
          unit_price_puht?: number
          remise_percent?: number | null
          tax_charges?: Json
        }
        Update: {
          id?: string
          invoice_id?: string
          article_id?: string | null
          code?: string
          designation?: string
          unit?: string | null
          quantity?: number
          unit_price_puht?: number
          remise_percent?: number | null
          tax_charges?: Json
        }
      }
      consignment_lines: {
        Row: {
          id: string
          invoice_id: string | null
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
          invoice_id?: string | null
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
          invoice_id?: string | null
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
      deliveries: {
        Row: {
          id: string
          number: string
          date: string
          organization_id: string
          counterparty_id: string
          driver_name: string | null
          vehicle_registration: string | null
          status: DocumentStatus
          source_quote_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          number: string
          date?: string
          organization_id: string
          counterparty_id: string
          driver_name?: string | null
          vehicle_registration?: string | null
          status?: DocumentStatus
          source_quote_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          number?: string
          date?: string
          organization_id?: string
          counterparty_id?: string
          driver_name?: string | null
          vehicle_registration?: string | null
          status?: DocumentStatus
          source_quote_id?: string | null
        }
      }
      delivery_lines: {
        Row: {
          id: string
          delivery_id: string
          article_id: string | null
          code: string
          designation: string
          unit: string | null
          quantity: number
        }
        Insert: {
          id?: string
          delivery_id: string
          article_id?: string | null
          code: string
          designation: string
          unit?: string | null
          quantity?: number
        }
        Update: {
          id?: string
          delivery_id?: string
          article_id?: string | null
          code?: string
          designation?: string
          unit?: string | null
          quantity?: number
        }
      }
      orders: {
        Row: {
          id: string
          number: string
          date: string
          organization_id: string
          counterparty_id: string
          type: OrderType
          status: DocumentStatus
          created_at: string
        }
        Insert: {
          id?: string
          number: string
          date?: string
          organization_id: string
          counterparty_id: string
          type: OrderType
          status?: DocumentStatus
          created_at?: string
        }
        Update: {
          id?: string
          number?: string
          date?: string
          organization_id?: string
          counterparty_id?: string
          type?: OrderType
          status?: DocumentStatus
        }
      }
      order_lines: {
        Row: {
          id: string
          order_id: string
          code: string
          designation: string
          unit: string | null
          quantity: number
          unit_price: number | null
        }
        Insert: {
          id?: string
          order_id: string
          code: string
          designation: string
          unit?: string | null
          quantity?: number
          unit_price?: number | null
        }
        Update: {
          id?: string
          order_id?: string
          code?: string
          designation?: string
          unit?: string | null
          quantity?: number
          unit_price?: number | null
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
          code: string
          designation: string
          unit: string | null
          quantity: number
        }
        Insert: {
          id?: string
          issue_id: string
          code: string
          designation: string
          unit?: string | null
          quantity?: number
        }
        Update: {
          id?: string
          issue_id?: string
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
      user_organizations: {
        Row: {
          user_id: string
          organization_id: string
        }
        Insert: {
          user_id: string
          organization_id: string
        }
        Update: {
          user_id?: string
          organization_id?: string
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
          source_id: string | null
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
          source_id?: string | null
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
          source_id?: string | null
          date?: string
        }
      }
    }
  }
}

export type StockMovementDirection = "in" | "out"
export type StockMovementSourceType = "delivery"

// Convenience types
export type Organization = Database["public"]["Tables"]["organizations"]["Row"]
export type Contact = Database["public"]["Tables"]["contacts"]["Row"]
export type Article = Database["public"]["Tables"]["articles"]["Row"]
export type Quote = Database["public"]["Tables"]["quotes"]["Row"]
export type QuoteLine = Database["public"]["Tables"]["quote_lines"]["Row"]
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"]
export type InvoiceLine = Database["public"]["Tables"]["invoice_lines"]["Row"]
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
export type Delivery = Database["public"]["Tables"]["deliveries"]["Row"]
export type DeliveryLine = Database["public"]["Tables"]["delivery_lines"]["Row"]
export type Order = Database["public"]["Tables"]["orders"]["Row"]
export type OrderLine = Database["public"]["Tables"]["order_lines"]["Row"]
export type Issue = Database["public"]["Tables"]["issues"]["Row"]
export type IssueLine = Database["public"]["Tables"]["issue_lines"]["Row"]
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type UserOrganization = Database["public"]["Tables"]["user_organizations"]["Row"]
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

export interface InvoiceTotals {
  htSubtotal?: number
  chargesByKey?: Record<string, number>
  ttc?: number
}
