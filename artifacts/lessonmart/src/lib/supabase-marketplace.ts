import { requireSupabase } from '@/lib/supabase';

export type ProductStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export type ProductRecord = {
  id: string;
  title: string;
  description: string;
  subject: string;
  gradeLevel: string;
  price: number;
  previewUrl: string | null;
  fileUrl: string | null;
  watermarkedFileUrl: string | null;
  status: ProductStatus;
  createdAt: string;
  sellerId: string;
  seller: { name: string; initials: string; avatarUrl: string | null; verified: false };
  coverColor: string;
  coverLabel: string;
};

export type SellerProductInput = {
  title: string;
  description: string;
  subject: string;
  gradeLevel: string;
  price: number;
};

type ProductRow = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  subject: string;
  grade_level: string;
  price: number | string;
  preview_url: string | null;
  file_url: string | null;
  watermarked_file_url: string | null;
  status: string;
  created_at: string;
};

type PublicProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

const coverColors = ['#0D7A5F', '#213B70', '#7C3AED', '#0E7490', '#9F1239', '#166534'];
const productFields = 'id,seller_id,title,description,subject,grade_level,price,preview_url,file_url,watermarked_file_url,status,created_at';
const validStatuses = new Set<ProductStatus>(['draft', 'pending', 'approved', 'rejected']);

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase() || 'LM';
}

function mapProduct(row: ProductRow, profile?: PublicProfile): ProductRecord {
  if (!validStatuses.has(row.status as ProductStatus)) {
    throw new Error(`Unsupported product status "${row.status}" on resource ${row.id}.`);
  }
  const subject = row.subject?.trim() || 'Classroom resource';
  const colorIndex = [...subject].reduce((sum, character) => sum + character.charCodeAt(0), 0) % coverColors.length;
  const sellerName = profile?.full_name?.trim() || 'LessonMart Seller';
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    subject,
    gradeLevel: row.grade_level ?? '',
    price: Number(row.price),
    previewUrl: row.preview_url,
    fileUrl: row.file_url,
    watermarkedFileUrl: row.watermarked_file_url,
    status: row.status as ProductStatus,
    createdAt: row.created_at,
    sellerId: row.seller_id,
    seller: {
      name: sellerName,
      initials: initials(sellerName),
      avatarUrl: profile?.avatar_url ?? null,
      verified: false,
    },
    coverColor: coverColors[colorIndex],
    coverLabel: subject.slice(0, 12).toUpperCase(),
  };
}

async function mapProductRows(rows: ProductRow[]) {
  if (!rows.length) return [];
  const client = requireSupabase();
  const sellerIds = [...new Set(rows.map((row) => row.seller_id).filter(Boolean))];
  const { data: profiles, error: profileError } = sellerIds.length
    ? await client.from('seller_public_profiles').select('id,full_name,avatar_url').in('id', sellerIds)
    : { data: [], error: null };
  if (profileError) throw profileError;
  const profilesById = new Map((profiles ?? []).map((profile: PublicProfile) => [profile.id, profile]));
  return rows.map((row) => mapProduct(row, profilesById.get(row.seller_id)));
}

async function listProducts(status: ProductStatus, orderAscending: boolean) {
  const { data, error } = await requireSupabase()
    .from('products')
    .select(productFields)
    .eq('status', status)
    .order('created_at', { ascending: orderAscending });
  if (error) throw error;
  return mapProductRows((data ?? []) as ProductRow[]);
}

export async function listMarketplaceProducts() {
  return listProducts('approved', false);
}

export async function createSellerProduct(
  input: SellerProductInput,
  sellerId: string,
  sellerName: string,
  file: File | null,
  previewFile: File | null,
) {
  const client = requireSupabase();
  if (file && file.type !== 'application/pdf') throw new Error('Upload a PDF file for the resource.');
  if (file && file.size > 50 * 1024 * 1024) throw new Error('PDF files must be 50 MB or smaller.');
  if (previewFile && !['image/jpeg', 'image/png', 'image/webp'].includes(previewFile.type)) {
    throw new Error('Preview images must be JPG, PNG or WebP.');
  }
  if (previewFile && previewFile.size > 5 * 1024 * 1024) throw new Error('Preview images must be 5 MB or smaller.');

  const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const filePath = file ? `${sellerId}/${crypto.randomUUID()}-${safeFileName(file.name)}` : null;
  const previewPath = previewFile ? `${sellerId}/${crypto.randomUUID()}-${safeFileName(previewFile.name)}` : null;

  if (file && filePath) {
    const { error } = await client.storage.from('lesson-files').upload(filePath, file, {
      contentType: 'application/pdf',
      upsert: false,
    });
    if (error) throw error;
  }
  if (previewFile && previewPath) {
    const { error } = await client.storage.from('previews').upload(previewPath, previewFile, {
      contentType: previewFile.type,
      upsert: false,
    });
    if (error) {
      if (filePath) await client.storage.from('lesson-files').remove([filePath]);
      throw error;
    }
  }

  const previewUrl = previewPath
    ? client.storage.from('previews').getPublicUrl(previewPath).data.publicUrl
    : null;

  const { data, error } = await client
    .from('products')
    .insert({
      seller_id: sellerId,
      title: input.title,
      description: input.description,
      subject: input.subject,
      grade_level: input.gradeLevel,
      price: input.price,
      preview_url: previewUrl,
      file_url: filePath,
      watermarked_file_url: null,
      status: 'pending',
    })
    .select(productFields)
    .single();

  if (error) {
    if (filePath) await client.storage.from('lesson-files').remove([filePath]);
    if (previewPath) await client.storage.from('previews').remove([previewPath]);
    throw error;
  }

  return mapProduct(data as ProductRow, { id: sellerId, full_name: sellerName, avatar_url: null });
}

export async function createPendingOrder(productId: string) {
  const { data, error } = await requireSupabase().rpc('create_lessonmart_order', {
    requested_product_id: productId,
  });
  if (error) throw error;
  return data as string;
}

export async function activateSellerAccount() {
  const { error } = await requireSupabase().rpc('activate_lessonmart_seller');
  if (error) throw error;
}

export async function getSellerDashboard(sellerId: string) {
  const client = requireSupabase();
  const { data: productRows, error: productsError } = await client
    .from('products')
    .select(productFields)
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });
  if (productsError) throw productsError;

  const rows = (productRows ?? []) as ProductRow[];
  const productIds = rows.map((product) => product.id);
  const [products, ordersResult, payoutsResult] = await Promise.all([
    mapProductRows(rows),
    productIds.length
      ? client.from('orders').select('amount,status,product_id').in('product_id', productIds).eq('status', 'paid')
      : Promise.resolve({ data: [], error: null }),
    client.from('payout_requests').select('amount,status').eq('seller_id', sellerId).neq('status', 'rejected'),
  ]);
  const failure = ordersResult.error ?? payoutsResult.error;
  if (failure) throw failure;
  const earnings = (ordersResult.data ?? []).reduce((sum: number, order: { amount: number | string }) => sum + Number(order.amount), 0);
  const reservedPayouts = (payoutsResult.data ?? []).reduce((sum: number, payout: { amount: number | string }) => sum + Number(payout.amount), 0);

  return {
    products,
    overview: {
      totalEarnings: earnings,
      availablePayout: Math.max(0, earnings - reservedPayouts),
      totalSales: ordersResult.data?.length ?? 0,
      pendingProducts: products.filter((product) => product.status === 'pending').length,
    },
  };
}

export async function createPayoutRequest(amount: number) {
  const { error } = await requireSupabase().rpc('request_lessonmart_payout', {
    requested_amount: amount,
  });
  if (error) throw error;
}

export async function getAdminDashboard() {
  const client = requireSupabase();
  const [ordersResult, approvalsResult, payoutsResult] = await Promise.all([
    client.from('orders').select('amount,status').eq('status', 'paid'),
    client.from('products').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    client.from('payout_requests').select('amount').in('status', ['pending', 'approved']),
  ]);
  const failure = ordersResult.error ?? approvalsResult.error ?? payoutsResult.error;
  if (failure) throw failure;
  return {
    totalRevenue: (ordersResult.data ?? []).reduce((sum: number, order: { amount: number | string }) => sum + Number(order.amount), 0),
    paidOrders: ordersResult.data?.length ?? 0,
    pendingApprovals: approvalsResult.count ?? 0,
    payouts: (payoutsResult.data ?? []).reduce((sum: number, payout: { amount: number | string }) => sum + Number(payout.amount), 0),
  };
}

export async function listPendingProducts() {
  return listProducts('pending', true);
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
  const sellerIds = [...new Set(payouts.map((payout: { seller_id: string }) => payout.seller_id))];
  if (!sellerIds.length) return payouts.map((payout: Record<string, unknown>) => ({ ...payout, seller: null }));
  const { data: profiles, error: profileError } = await client
    .from('profiles')
    .select('id,full_name,email')
    .in('id', sellerIds);
  if (profileError) throw profileError;
  const profileById = new Map((profiles ?? []).map((profile: { id: string; full_name: string | null; email: string }) => [profile.id, profile]));
  return payouts.map((payout: { seller_id: string }) => ({
    ...payout,
    seller: profileById.get(payout.seller_id) ?? null,
  }));
}

export async function setPayoutStatus(payoutId: string, status: 'approved' | 'paid' | 'rejected') {
  const { error } = await requireSupabase().from('payout_requests').update({ status }).eq('id', payoutId);
  if (error) throw error;
}
