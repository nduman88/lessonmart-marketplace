import type { Product, SellerProductInput } from '@workspace/api-client-react';
import { requireSupabase } from '@/lib/supabase';

export type ProductRecord = Product & {
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  sellerId: string | null;
  filePath: string | null;
};

type ProductRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  subject: string;
  class_level: string;
  price: number;
  rating: number;
  sales: number;
  badge: string | null;
  cover_color: string;
  cover_label: string;
  seller_name: string;
  seller_initials: string;
  seller_verified: boolean;
  seller_id: string | null;
  file_path: string | null;
  status: ProductRecord['status'];
};

function mapProduct(row: ProductRow): ProductRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    subject: row.subject,
    classLevel: row.class_level,
    price: Number(row.price),
    rating: Number(row.rating),
    sales: Number(row.sales),
    badge: row.badge,
    coverColor: row.cover_color,
    coverLabel: row.cover_label,
    seller: { name: row.seller_name, initials: row.seller_initials, verified: row.seller_verified },
    status: row.status,
    sellerId: row.seller_id,
    filePath: row.file_path,
  };
}

const productFields = 'id,title,description,category,subject,class_level,price,rating,sales,badge,cover_color,cover_label,seller_name,seller_initials,seller_verified,seller_id,file_path,status';

export async function listMarketplaceProducts(): Promise<ProductRecord[]> {
  const { data, error } = await requireSupabase()
    .from('products')
    .select(productFields)
    .eq('status', 'approved')
    .order('sales', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapProduct(row as unknown as ProductRow));
}

export async function getMarketplaceSummary() {
  const { data, error } = await requireSupabase().rpc('marketplace_summary');
  if (error) throw error;
  const summary = Array.isArray(data) ? data[0] : data;
  return {
    notes: Number(summary?.notes ?? 0),
    sellers: Number(summary?.sellers ?? 0),
    paid: Number(summary?.paid ?? 0),
    buyersToday: Number(summary?.buyers_today ?? 0),
  };
}

export async function createSellerProduct(input: SellerProductInput, sellerId: string, sellerName: string, file: File | null) {
  const client = requireSupabase();
  let filePath: string | null = null;
  if (file) {
    if (file.type !== 'application/pdf') throw new Error('Upload a PDF file.');
    if (file.size > 50 * 1024 * 1024) throw new Error('PDF files must be 50 MB or smaller.');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    filePath = `${sellerId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await client.storage.from('lessonmart-files').upload(filePath, file, {
      contentType: 'application/pdf',
      upsert: false,
    });
    if (uploadError) throw uploadError;
  }

  const { data, error } = await client
    .from('products')
    .insert({
      title: input.title,
      description: input.description,
      category: input.category,
      subject: input.subject,
      class_level: input.classLevel,
      price: input.price,
      seller_id: sellerId,
      seller_name: sellerName,
      seller_initials: sellerName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase(),
      seller_verified: false,
      file_path: filePath,
      status: 'pending',
    })
    .select(productFields)
    .single();
  if (error) {
    if (filePath) await client.storage.from('lessonmart-files').remove([filePath]);
    throw error;
  }
  return mapProduct(data as unknown as ProductRow);
}

export async function createPendingOrder(productId: string) {
  const { data, error } = await requireSupabase().rpc('create_order_for_product', {
    requested_product_id: productId,
  });
  if (error) throw error;
  return data;
}

export async function getSellerDashboard(sellerId: string) {
  const client = requireSupabase();
  const [productsResult, ordersResult, payoutsResult] = await Promise.all([
    client.from('products').select(productFields).eq('seller_id', sellerId).order('created_at', { ascending: false }),
    client.from('orders').select('seller_amount,status').eq('seller_id', sellerId).eq('status', 'paid'),
    client.from('payout_requests').select('amount,status').eq('seller_id', sellerId).neq('status', 'rejected'),
  ]);
  const failure = productsResult.error ?? ordersResult.error ?? payoutsResult.error;
  if (failure) throw failure;
  const products = (productsResult.data ?? []).map((row) => mapProduct(row as unknown as ProductRow));
  const earnings = (ordersResult.data ?? []).reduce((sum, order) => sum + Number(order.seller_amount), 0);
  const requestedPayouts = (payoutsResult.data ?? []).reduce((sum, payout) => sum + Number(payout.amount), 0);
  return {
    products,
    overview: {
      totalEarnings: earnings,
      availablePayout: Math.max(0, earnings - requestedPayouts),
      totalSales: ordersResult.data?.length ?? 0,
      views: 0,
      pendingProducts: products.filter((product) => product.status === 'pending').length,
    },
  };
}

export async function createPayoutRequest(sellerId: string, amount: number) {
  const { error } = await requireSupabase().rpc('request_seller_payout', {
    requested_amount: amount,
  });
  if (error) throw error;
}

export async function getAdminDashboard() {
  const client = requireSupabase();
  const [ordersResult, approvalsResult, payoutsResult] = await Promise.all([
    client.from('orders').select('amount,commission,status').eq('status', 'paid'),
    client.from('products').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    client.from('payout_requests').select('amount').in('status', ['pending', 'approved']),
  ]);
  const failure = ordersResult.error ?? approvalsResult.error ?? payoutsResult.error;
  if (failure) throw failure;
  return {
    totalRevenue: (ordersResult.data ?? []).reduce((sum, order) => sum + Number(order.amount), 0),
    commission: (ordersResult.data ?? []).reduce((sum, order) => sum + Number(order.commission), 0),
    pendingApprovals: approvalsResult.count ?? 0,
    payouts: (payoutsResult.data ?? []).reduce((sum, payout) => sum + Number(payout.amount), 0),
  };
}

export async function listPendingProducts(): Promise<ProductRecord[]> {
  const { data, error } = await requireSupabase()
    .from('products')
    .select(productFields)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => mapProduct(row as unknown as ProductRow));
}

export async function setProductReviewStatus(productId: string, status: 'approved' | 'rejected') {
  const { error } = await requireSupabase().from('products').update({ status }).eq('id', productId);
  if (error) throw error;
}

export async function listPendingPayouts() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('payout_requests')
    .select('id,seller_id,amount,status,created_at')
    .in('status', ['pending', 'approved'])
    .order('created_at', { ascending: true });
  if (error) throw error;
  const payouts = data ?? [];
  const sellerIds = [...new Set(payouts.map((payout) => payout.seller_id))];
  if (!sellerIds.length) return payouts.map((payout) => ({ ...payout, seller: null }));
  const { data: profiles, error: profileError } = await client
    .from('profiles')
    .select('id,display_name,email')
    .in('id', sellerIds);
  if (profileError) throw profileError;
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return payouts.map((payout) => ({
    ...payout,
    seller: profileById.get(payout.seller_id) ?? null,
  }));
}

export async function setPayoutStatus(payoutId: string, status: 'approved' | 'paid' | 'rejected') {
  const { error } = await requireSupabase().from('payout_requests').update({ status }).eq('id', payoutId);
  if (error) throw error;
}
