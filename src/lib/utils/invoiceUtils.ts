import { db } from '@/lib/db';
import { invoiceDB, customerDB } from '@/lib/schema';
import { eq, and, or, sql, max } from 'drizzle-orm';

/**
 * Generates invoice number in format: INV/Cleaning/yyyy.mm.dd-00000
 * The sequence number is a 5-digit random number generated when customer is created
 */
function generateInvoiceNumber(subscriptionStart: Date, sequenceNumber: number): string {
  const year = subscriptionStart.getFullYear();
  const month = String(subscriptionStart.getMonth() + 1).padStart(2, '0');
  const day = String(subscriptionStart.getDate()).padStart(2, '0');
  
  // Format: INV/Cleaning/yyyy.mm.dd-00000
  const formattedSequence = String(sequenceNumber).padStart(5, '0');
  return `INV/Cleaning/${year}.${month}.${day}-${formattedSequence}`;
}

/**
 * Generates a random 5-digit sequence number for invoice
 */
export function generateInvoiceSequenceNumber(): number {
  // Generate random 5-digit number (10000-99999)
  return Math.floor(Math.random() * 90000) + 10000;
}

/**
 * Interface for creating invoice with populated data
 */
export interface CreateInvoiceParams {
  customerId: string;
  invoiceSequenceNumber?: number; // Optional: will be auto-generated if not provided
  invoicePromoCode?: string;
  invoicePromoDiscount?: number;
  dueDate?: Date;
  paymentMethod?: string;
  notes?: string;
}

/**
 * Creates an invoice with all data populated from customerDB
 */
export async function createInvoice(params: CreateInvoiceParams) {
  try {
    // Get customer data
    const customerResult = await db
      .select({
        customerName: customerDB.customerName,
        contact: customerDB.contact,
        address: customerDB.address,
        subscriptionStart: customerDB.subscriptionStart,
        // subscriptionQTY: customerDB.subscriptionQTY, // Column doesn't exist in actual database
        // subscriptionPerQTY: customerDB.subscriptionPerQTY, // Column doesn't exist in actual database
        monthlyFee: customerDB.monthlyFee,
      })
      .from(customerDB)
      .where(
        and(
          eq(customerDB.id, params.customerId),
          or(eq(customerDB.isDeleted, false), sql`${customerDB.isDeleted} IS NULL`)
        )
      )
      .limit(1);

    if (customerResult.length === 0) {
      throw new Error(`Customer with ID ${params.customerId} not found`);
    }

    const customer = customerResult[0];

    if (!customer.subscriptionStart) {
      throw new Error('Customer must have a subscription start date to generate invoice');
    }

    // Generate or use provided sequence number
    const sequenceNumber = params.invoiceSequenceNumber || generateInvoiceSequenceNumber();
    
    // Generate invoice number
    const subscriptionStartDate = new Date(customer.subscriptionStart);
    const invoiceNumber = generateInvoiceNumber(subscriptionStartDate, sequenceNumber);

    // Extract date components
    const invoiceYears = subscriptionStartDate.getFullYear();
    const invoiceMonths = subscriptionStartDate.getMonth() + 1; // 1-based month
    const invoiceDays = subscriptionStartDate.getDate();

    // Calculate totals - use default values since subscriptionQTY/subscriptionPerQTY don't exist in DB
    const qty = 1; // Default quantity since subscriptionQTY column doesn't exist
    const pricePerQty = parseFloat(customer.monthlyFee?.toString() || '0'); // Use monthlyFee as price
    const subtotal = qty * pricePerQty;
    const promoDiscount = params.invoicePromoDiscount || 0;
    const totalAmount = subtotal - promoDiscount;

    // Create invoice data
    const invoiceData = {
      customerId: params.customerId,
      
      // Invoice number and sequence
      invoiceNumber: invoiceNumber,
      invoiceNo: sequenceNumber,
      
      // Date fields from customer subscription start
      invoiceStartDate: subscriptionStartDate.toISOString().split('T')[0],
      invoiceYears: invoiceYears,
      invoiceMonths: invoiceMonths,
      invoiceDays: invoiceDays,
      invoiceSubscription: 'Cleaning', // Hardcoded
      
      // Customer info from customerDB
      invoiceCustomerName: customer.customerName,
      invoiceAddress: customer.address || '',
      invoicePhoneNumber: customer.contact,
      
      // Invoice line items from customerDB
      invoiceQty: qty,
      invoicePricePerQty: '0', // subscriptionPerQTY field doesn't exist in schema
      
      // Promo and discount
      invoicePromoCode: params.invoicePromoCode || null,
      invoicePromoDiscount: promoDiscount.toString(),
      
      // Legacy invoice details
      invoiceDate: new Date(),
      dueDate: params.dueDate || null,
      subtotal: subtotal.toString(),
      tax: '0',
      discount: promoDiscount.toString(),
      totalAmount: totalAmount.toString(),
      
      // Status and metadata
      status: 'Pending',
      paymentMethod: params.paymentMethod || null,
      notes: params.notes || null,
    };

    const result = await db
      .insert(invoiceDB)
      .values(invoiceData)
      .returning({
        id: invoiceDB.id,
        invoiceNumber: invoiceDB.invoiceNumber,
        invoiceNo: invoiceDB.invoiceNo,
        invoiceCustomerName: invoiceDB.invoiceCustomerName,
        invoiceQty: invoiceDB.invoiceQty,
        invoicePricePerQty: invoiceDB.invoicePricePerQty,
        totalAmount: invoiceDB.totalAmount,
        status: invoiceDB.status,
      });

    console.log('✅ Invoice created successfully:', {
      id: result[0].id,
      invoiceNumber: result[0].invoiceNumber,
      customerName: result[0].invoiceCustomerName,
      totalAmount: result[0].totalAmount,
    });

    return result[0];

  } catch (error) {
    console.error('❌ Error creating invoice:', error);
    throw error;
  }
}

/**
 * Gets invoices with all populated data
 */
export async function getInvoicesWithFullData(filters?: {
  customerId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const conditions = [];
    
    // Add filters
    if (filters?.customerId) {
      conditions.push(eq(invoiceDB.customerId, filters.customerId));
    }
    
    if (filters?.status) {
      conditions.push(eq(invoiceDB.status, filters.status));
    }
    
    if (filters?.startDate) {
      conditions.push(sql`${invoiceDB.invoiceStartDate} >= ${filters.startDate}`);
    }
    
    if (filters?.endDate) {
      conditions.push(sql`${invoiceDB.invoiceStartDate} <= ${filters.endDate}`);
    }
    
    // Add soft delete condition
    conditions.push(or(eq(invoiceDB.isDeleted, false), sql`${invoiceDB.isDeleted} IS NULL`));
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const result = await db
      .select({
        id: invoiceDB.id,
        customerId: invoiceDB.customerId,
        
        // Invoice number and sequence
        invoiceNumber: invoiceDB.invoiceNumber,
        invoiceNo: invoiceDB.invoiceNo,
        
        // Date fields
        invoiceStartDate: invoiceDB.invoiceStartDate,
        invoiceYears: invoiceDB.invoiceYears,
        invoiceMonths: invoiceDB.invoiceMonths,
        invoiceDays: invoiceDB.invoiceDays,
        invoiceSubscription: invoiceDB.invoiceSubscription,
        
        // Customer info
        invoiceCustomerName: invoiceDB.invoiceCustomerName,
        invoiceAddress: invoiceDB.invoiceAddress,
        invoicePhoneNumber: invoiceDB.invoicePhoneNumber,
        
        // Invoice line items
        invoiceQty: invoiceDB.invoiceQty,
        invoicePricePerQty: invoiceDB.invoicePricePerQty,
        
        // Promo and discount
        invoicePromoCode: invoiceDB.invoicePromoCode,
        invoicePromoDiscount: invoiceDB.invoicePromoDiscount,
        
        // Legacy fields
        invoiceDate: invoiceDB.invoiceDate,
        dueDate: invoiceDB.dueDate,
        subtotal: invoiceDB.subtotal,
        tax: invoiceDB.tax,
        discount: invoiceDB.discount,
        totalAmount: invoiceDB.totalAmount,
        
        // Status and metadata
        status: invoiceDB.status,
        paidAt: invoiceDB.paidAt,
        paymentMethod: invoiceDB.paymentMethod,
        notes: invoiceDB.notes,
        createdAt: invoiceDB.createdAt,
        updatedAt: invoiceDB.updatedAt,
      })
      .from(invoiceDB)
      .where(whereClause)
      .orderBy(sql`${invoiceDB.createdAt} DESC`)
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    return result;

  } catch (error) {
    console.error('❌ Error getting invoices:', error);
    throw error;
  }
}

/**
 * Updates invoice status and payment information
 */
export async function updateInvoicePayment(invoiceId: string, paymentData: {
  status: 'Paid' | 'Overdue' | 'Cancelled';
  paymentMethod?: string;
  paidAt?: Date;
  notes?: string;
}) {
  try {
    const result = await db
      .update(invoiceDB)
      .set({
        status: paymentData.status,
        paymentMethod: paymentData.paymentMethod || null,
        paidAt: paymentData.paidAt || (paymentData.status === 'Paid' ? new Date() : null),
        notes: paymentData.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(invoiceDB.id, invoiceId))
      .returning({
        id: invoiceDB.id,
        invoiceNumber: invoiceDB.invoiceNumber,
        status: invoiceDB.status,
        totalAmount: invoiceDB.totalAmount,
      });

    console.log('✅ Invoice payment updated:', {
      id: result[0].id,
      invoiceNumber: result[0].invoiceNumber,
      status: result[0].status,
    });

    return result[0];

  } catch (error) {
    console.error('❌ Error updating invoice payment:', error);
    throw error;
  }
}