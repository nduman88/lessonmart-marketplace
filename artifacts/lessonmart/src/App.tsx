import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation } from 'wouter';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  CreditCard,
  Download,
  FileText,
  Filter,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  MoreHorizontal,
  PackageOpen,
  PenLine,
  Plus,
  Search,
  Share2,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Tag,
  TrendingUp,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import {
  getGetAdminOverviewQueryKey,
  getGetMarketplaceSummaryQueryKey,
  getGetProductQueryKey,
  getGetSellerOverviewQueryKey,
  getHealthCheckQueryKey,
  getListProductsQueryKey,
  useCreateOrder,
  useCreateSellerProduct,
  useGetAdminOverview,
  useGetMarketplaceSummary,
  useGetProduct,
  useGetSellerOverview,
  useHealthCheck,
  useListProducts,
  type Product,
  type SellerProductInput,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

const demoProducts: Product[] = [
  {
    id: 'demo-chemistry-waec',
    title: 'WAEC Chemistry: Organic Chemistry Drill Pack',
    description: 'A teacher-tested revision pack with guided examples, marked practice and the common traps students meet in WAEC Chemistry.',
    category: 'Exam Prep',
    subject: 'Chemistry',
    classLevel: 'SS3',
    price: 3500,
    rating: 4.9,
    sales: 184,
    badge: 'Top seller',
    coverColor: '#e87955',
    coverLabel: 'CHEM',
    seller: { name: 'Chinonso Okeke', initials: 'CO', verified: true },
  },
  {
    id: 'demo-maths-scheme',
    title: 'JSS2 Mathematics Scheme of Work',
    description: 'A clear, term-by-term scheme with lesson objectives, classroom activities and assessment prompts for busy maths teachers.',
    category: 'Lesson Notes',
    subject: 'Mathematics',
    classLevel: 'JSS2',
    price: 2800,
    rating: 4.8,
    sales: 96,
    badge: 'Teacher pick',
    coverColor: '#2d8b83',
    coverLabel: 'MATH',
    seller: { name: 'Amina Bello', initials: 'AB', verified: true },
  },
  {
    id: 'demo-english-cbt',
    title: 'English Language CBT Practice Vault',
    description: '300 objective questions, answer keys and short explanations for senior secondary learners preparing with less panic.',
    category: 'CBT Practice',
    subject: 'English',
    classLevel: 'SS2–SS3',
    price: 4200,
    rating: 4.7,
    sales: 241,
    badge: 'Most downloaded',
    coverColor: '#e7b84a',
    coverLabel: 'CBT',
    seller: { name: 'David Eze', initials: 'DE', verified: false },
  },
  {
    id: 'demo-basic-science',
    title: 'Basic Science Lab Activity Cards',
    description: 'Low-cost practical activity cards built for Nigerian classrooms, including materials lists and teacher talking points.',
    category: 'Classroom Resources',
    subject: 'Basic Science',
    classLevel: 'JSS1',
    price: 2200,
    rating: 4.6,
    sales: 72,
    badge: null,
    coverColor: '#5875a9',
    coverLabel: 'LAB',
    seller: { name: 'Bisi Adebayo', initials: 'BA', verified: true },
  },
  {
    id: 'demo-literacy-notes',
    title: 'Primary 4 Literacy Lesson Notes',
    description: 'Four weeks of practical literacy notes with read-aloud activities and ready-to-use classwork for primary teachers.',
    category: 'Lesson Notes',
    subject: 'English',
    classLevel: 'Primary 4',
    price: 1800,
    rating: 4.9,
    sales: 58,
    badge: 'New',
    coverColor: '#976e9e',
    coverLabel: 'LIT',
    seller: { name: 'Morenike James', initials: 'MJ', verified: true },
  },
  {
    id: 'demo-accounting-waec',
    title: 'Financial Accounting WAEC Quick Revision',
    description: 'Concise worked solutions and topic checklists for final-week revision without the midnight cramming spiral.',
    category: 'Exam Prep',
    subject: 'Accounting',
    classLevel: 'SS3',
    price: 3900,
    rating: 4.8,
    sales: 113,
    badge: 'WAEC ready',
    coverColor: '#315b58',
    coverLabel: 'ACC',
    seller: { name: 'Tunde Ojo', initials: 'TO', verified: true },
  },
];

const demoSummary = { notes: 1284, sellers: 327, paid: 4860, buyersToday: 142 };
const demoSeller = { totalEarnings: 486500, availablePayout: 128400, totalSales: 218, views: 12480, pendingProducts: 2 };
const demoAdmin = { totalRevenue: 18425000, commission: 2763750, pendingApprovals: 18, payouts: 842000 };
const naira = (value: number) => `₦${value.toLocaleString('en-NG')}`;
const compactNaira = (value: number) => value >= 1000000 ? `₦${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}M+` : naira(value);
const compact = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k` : value.toLocaleString();

async function downloadLicensedPdf(product: Product, buyerEmail: string) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const heading = await pdf.embedFont(StandardFonts.HelveticaBold);
  const body = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText('LessonMart', { x: 48, y: 770, size: 18, font: heading, color: rgb(0.05, 0.48, 0.37) });
  page.drawText(product.title, { x: 48, y: 710, size: 22, font: heading, maxWidth: 500, color: rgb(0.06, 0.1, 0.15) });
  page.drawText(`${product.subject} · ${product.classLevel}`, { x: 48, y: 675, size: 12, font: body, color: rgb(0.35, 0.4, 0.4) });
  page.drawText('Preview copy — full classroom resource attached to your order.', { x: 48, y: 615, size: 13, font: body, color: rgb(0.2, 0.25, 0.25) });
  page.drawText(`Licensed to ${buyerEmail} - LessonMart`, { x: 100, y: 380, size: 24, font: heading, color: rgb(0.05, 0.48, 0.37), rotate: degrees(28), opacity: 0.18 });
  page.drawText('Instant download · Verified seller · Watermarked', { x: 48, y: 72, size: 10, font: body, color: rgb(0.35, 0.4, 0.4) });
  const bytes = await pdf.save();
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${product.id}-lessonmart.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

function useDemoNotice() {
  const [notice, setNotice] = useState('');
  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3600);
  };
  return { notice, notify };
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3" data-testid="link-brand">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm">
        <BookOpen size={20} strokeWidth={2.4} />
      </span>
      <span className="font-display text-xl font-bold tracking-tight">lesson<span className="text-[hsl(var(--accent))]">mart</span></span>
    </Link>
  );
}

function Shell({ children, cartCount, onCart }: { children: ReactNode; cartCount: number; onCart: () => void }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: health } = useHealthCheck({ query: { retry: false, queryKey: getHealthCheckQueryKey() } });
  const onMarketplace = location === '/';
  return (
    <div className="noise app-shell">
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.9)] backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
          <Brand />
          <nav className="hidden items-center gap-7 text-sm font-semibold md:flex" aria-label="Primary navigation">
            <Link href="/" className={onMarketplace ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]'} data-testid="link-marketplace">Marketplace</Link>
            <Link href="/seller" className={location === '/seller' ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]'} data-testid="link-sell">Sell on LessonMart</Link>
            <Link href="/admin" className={location === '/admin' ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]'} data-testid="link-admin">Admin</Link>
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full bg-[hsl(var(--secondary))] px-3 py-2 text-xs font-semibold text-[hsl(var(--secondary-foreground))] lg:flex" title={health ? 'Marketplace services online' : 'Demo mode'}>
              <span className={`h-2 w-2 rounded-full ${health ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--accent))]'}`} />
              Lagos · NGN
            </span>
            {onMarketplace && <button onClick={onCart} className="relative grid h-10 w-10 place-items-center rounded-xl border border-[hsl(var(--border))] text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--secondary))]" data-testid="button-open-cart" aria-label="Open cart">
              <ShoppingBag size={18} />
              {cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[hsl(var(--accent))] px-1 text-[10px] font-extrabold text-[hsl(var(--accent-foreground))]" data-testid="text-cart-count">{cartCount}</span>}
            </button>}
            <button className="grid h-10 w-10 place-items-center rounded-xl border border-[hsl(var(--border))] md:hidden" onClick={() => setMenuOpen((value) => !value)} data-testid="button-toggle-menu" aria-label="Toggle navigation">
              {menuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
        {menuOpen && <nav className="border-t border-[hsl(var(--border))] px-5 py-4 md:hidden">
          <div className="flex flex-col gap-4 text-sm font-semibold">
            <Link href="/" onClick={() => setMenuOpen(false)} data-testid="link-mobile-marketplace">Marketplace</Link>
            <Link href="/seller" onClick={() => setMenuOpen(false)} data-testid="link-mobile-sell">Sell on LessonMart</Link>
            <Link href="/admin" onClick={() => setMenuOpen(false)} data-testid="link-mobile-admin">Admin</Link>
          </div>
        </nav>}
      </header>
      {children}
    </div>
  );
}

function Notice({ message }: { message: string }) {
  if (!message) return null;
  return <div className="fixed bottom-5 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-[hsl(var(--foreground))] px-5 py-3 text-sm font-semibold text-[hsl(var(--background))] shadow-xl fade-up" role="status" data-testid="status-notice">
    <Check size={17} className="text-[hsl(var(--accent))]" /> {message}
  </div>;
}

function Cover({ product, large = false }: { product: Product; large?: boolean }) {
  return <div className={`relative overflow-hidden ${large ? 'h-64 sm:h-80' : 'h-52'} rounded-[calc(var(--radius)-.2rem)]`} style={{ backgroundColor: product.coverColor }}>
    <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 74% 20%, #fff 0, transparent 26%), linear-gradient(125deg, transparent 42%, rgba(255,255,255,.28) 42%, transparent 61%)' }} />
    <div className="absolute left-5 top-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-white/80"><FileText size={14} /> LessonMart file</div>
    <div className={`absolute bottom-4 left-5 font-display font-bold leading-none tracking-tight text-white ${large ? 'text-5xl' : 'text-4xl'}`}>{product.coverLabel}</div>
    {product.badge && <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-[hsl(var(--foreground))]">{product.badge}</span>}
  </div>;
}

function ProductCard({ product, onOpen, onAdd, added }: { product: Product; onOpen: (product: Product) => void; onAdd: (product: Product) => void; added: boolean }) {
  return <article className="lift group rounded-[1.15rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2.5 shadow-[var(--shadow-sm)]" data-testid={`card-product-${product.id}`}>
    <button className="block w-full text-left" onClick={() => onOpen(product)} data-testid={`button-view-product-${product.id}`}>
      <Cover product={product} />
      <div className="px-2 pb-1 pt-4">
        <div className="mb-2 flex items-center justify-between gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          <span>{product.subject} · {product.classLevel}</span>
          <span className="flex items-center gap-1 font-semibold text-[hsl(var(--foreground))]"><Star size={13} fill="currentColor" className="text-[hsl(var(--accent))]" /> {product.rating}</span>
        </div>
        <h3 className="font-display text-[1.1rem] font-bold leading-snug group-hover:text-[hsl(var(--primary))]">{product.title}</h3>
        <div className="mt-4 flex items-end justify-between gap-2">
          <span className="font-display text-xl font-bold">{naira(product.price)}</span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">{product.sales} sold</span>
        </div>
      </div>
    </button>
    <button onClick={() => onAdd(product)} className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition ${added ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:brightness-110'}`} data-testid={`button-add-product-${product.id}`}>
      {added ? <><Check size={16} /> Added to bag</> : <><Plus size={16} /> Add to bag</>}
    </button>
  </article>;
}

function ProductModal({ product, onClose, onAdd, added }: { product: Product | null; onClose: () => void; onAdd: (product: Product) => void; added: boolean }) {
  const { data: fetched } = useGetProduct(product?.id ?? '', { query: { enabled: Boolean(product), queryKey: getGetProductQueryKey(product?.id ?? '') } });
  if (!product) return null;
  const detail = fetched ?? product;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[hsl(var(--foreground)/.55)] p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="product-modal-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} data-testid="dialog-product-detail">
    <div className="max-h-[92dvh] w-full max-w-4xl overflow-auto rounded-t-[1.5rem] bg-[hsl(var(--card))] shadow-2xl sm:rounded-[1.5rem]">
      <div className="grid md:grid-cols-[.85fr_1.15fr]">
        <div className="p-4 sm:p-6"><Cover product={detail} large /></div>
        <div className="relative p-6 sm:p-10">
          <button className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))]" onClick={onClose} aria-label="Close product details" data-testid="button-close-product"><X size={17} /></button>
          <span className="text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">{detail.category}</span>
          <h2 id="product-modal-title" className="mt-3 max-w-lg font-display text-3xl font-bold leading-tight sm:text-4xl">{detail.title}</h2>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[hsl(var(--muted-foreground))]"><span className="flex items-center gap-1 font-bold text-[hsl(var(--foreground))]"><Star size={15} fill="currentColor" className="text-[hsl(var(--accent))]" /> {detail.rating}</span><span>·</span><span>{detail.sales} teachers and students bought this</span></div>
          <p className="mt-7 leading-7 text-[hsl(var(--muted-foreground))]">{detail.description}</p>
          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[hsl(var(--secondary))] p-4"><span className="block text-xs text-[hsl(var(--muted-foreground))]">Format</span><strong className="mt-1 block">PDF download</strong></div>
            <div className="rounded-xl bg-[hsl(var(--secondary))] p-4"><span className="block text-xs text-[hsl(var(--muted-foreground))]">Level</span><strong className="mt-1 block">{detail.classLevel}</strong></div>
          </div>
          <div className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-[hsl(var(--border))] pt-6">
            <span className="font-display text-3xl font-bold">{naira(detail.price)}</span>
            <button onClick={() => onAdd(detail)} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))] hover:brightness-110" data-testid="button-modal-add">
              {added ? <><Check size={17} /> In your bag</> : <><ShoppingBag size={17} /> Add to bag</>}
            </button>
          </div>
          <div className="mt-6 flex items-center gap-3 text-sm"><span className="grid h-9 w-9 place-items-center rounded-full bg-[hsl(var(--accent))] text-xs font-extrabold text-[hsl(var(--accent-foreground))]">{detail.seller.initials}</span><span>By <strong>{detail.seller.name}</strong>{detail.seller.verified && <BadgeCheck size={15} className="ml-1 inline text-[hsl(var(--primary))]" />}</span></div>
        </div>
      </div>
    </div>
  </div>;
}

function CheckoutModal({ product, onClose, onComplete, loading }: { product: Product | null; onClose: () => void; onComplete: (email: string) => void; loading: boolean }) {
  const [email, setEmail] = useState('');
  if (!product) return null;
  const submit = (event: FormEvent) => { event.preventDefault(); if (email) onComplete(email); };
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[hsl(var(--foreground)/.55)] p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="checkout-title" data-testid="dialog-checkout">
    <div className="w-full max-w-lg rounded-t-[1.5rem] bg-[hsl(var(--card))] p-6 shadow-2xl sm:rounded-[1.5rem] sm:p-9">
      <div className="flex items-start justify-between"><div><span className="text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Secure handoff</span><h2 id="checkout-title" className="mt-2 font-display text-3xl font-bold">One step from ready.</h2></div><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-[hsl(var(--border))]" aria-label="Close checkout" data-testid="button-close-checkout"><X size={17} /></button></div>
      <div className="mt-7 flex items-center gap-4 rounded-xl bg-[hsl(var(--secondary))] p-3"><div className="h-14 w-14 rounded-lg" style={{ backgroundColor: product.coverColor }} /><div className="min-w-0"><p className="truncate font-semibold">{product.title}</p><p className="mt-1 font-mono text-sm">{naira(product.price)}</p></div></div>
      <form onSubmit={submit} className="mt-7 space-y-5"><label className="block text-sm font-bold">Email for your download<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-3.5 outline-none transition focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--ring)/.2)]" data-testid="input-buyer-email" /></label><div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-4 text-sm text-[hsl(var(--muted-foreground))]"><CreditCard size={17} className="mb-2 text-[hsl(var(--primary))]" /> Paystack checkout is ready for connection. In demo mode, your download handoff is simulated.</div><button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--accent))] py-3.5 font-extrabold text-[hsl(var(--accent-foreground))] hover:brightness-105 disabled:opacity-60" data-testid="button-pay-now">{loading ? <><LoaderCircle size={17} className="spin" /> Preparing...</> : <>Continue to Paystack <ArrowRight size={17} /></>}</button></form>
    </div>
  </div>;
}

function CartSheet({ product, onClose, onCheckout, onRemove }: { product: Product | null; onClose: () => void; onCheckout: (product: Product) => void; onRemove: () => void }) {
  if (!product) return null;
  return <div className="fixed inset-0 z-40 bg-[hsl(var(--foreground)/.4)]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} data-testid="dialog-cart">
    <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[hsl(var(--card))] p-6 shadow-2xl fade-up">
      <div className="flex items-center justify-between"><div><span className="text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Your bag</span><h2 className="mt-1 font-display text-2xl font-bold">Ready when you are.</h2></div><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-[hsl(var(--border))]" aria-label="Close bag" data-testid="button-close-cart"><X size={17} /></button></div>
      <div className="mt-8 flex-1"><div className="flex gap-4 border-b border-[hsl(var(--border))] pb-5"><div className="h-20 w-20 shrink-0 rounded-xl" style={{ backgroundColor: product.coverColor }} /><div className="min-w-0 flex-1"><p className="font-semibold leading-snug">{product.title}</p><p className="mt-2 font-mono text-sm">{naira(product.price)}</p><button onClick={onRemove} className="mt-2 text-xs font-bold text-[hsl(var(--destructive))]" data-testid="button-remove-cart">Remove</button></div></div></div>
      <div className="border-t border-[hsl(var(--border))] pt-5"><div className="flex justify-between"><span className="text-[hsl(var(--muted-foreground))]">Total</span><strong className="font-display text-2xl">{naira(product.price)}</strong></div><button onClick={() => onCheckout(product)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] py-3.5 font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-checkout">Checkout <ArrowRight size={17} /></button><p className="mt-3 text-center text-xs text-[hsl(var(--muted-foreground))]">Instant PDF access after payment.</p></div>
    </aside>
  </div>;
}

function Marketplace() {
  const { data: apiProducts, isLoading, isError } = useListProducts({ limit: 50 }, { query: { retry: false, queryKey: getListProductsQueryKey({ limit: 50 }) } });
  const { data: apiSummary } = useGetMarketplaceSummary({ query: { retry: false, queryKey: getGetMarketplaceSummaryQueryKey() } });
  const products = apiProducts?.length ? apiProducts : demoProducts;
  const summary = apiSummary ?? demoSummary;
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All resources');
  const [selected, setSelected] = useState<Product | null>(null);
  const [cart, setCart] = useState<Product | null>(null);
  const [checkout, setCheckout] = useState<Product | null>(null);
  const { notice, notify } = useDemoNotice();
  const order = useCreateOrder();
  const filtered = useMemo(() => products.filter((product) => {
    const matchesSearch = `${product.title} ${product.subject} ${product.category} ${product.classLevel}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (category === 'All resources' || product.category === category);
  }), [products, search, category]);
  const addToCart = (product: Product) => { setCart(product); notify(`${product.title} added to your bag`); };
  const completeOrder = (email: string) => {
    if (!checkout) return;
    order.mutate({ data: { productId: checkout.id, buyerEmail: email, paymentReference: 'demo-paystack-reference' } }, {
      onSuccess: () => { void downloadLicensedPdf(checkout, email); setCheckout(null); setCart(null); notify('Demo payment complete — your watermarked download is ready.'); },
      onError: () => { void downloadLicensedPdf(checkout, email); setCheckout(null); setCart(null); notify('Demo download ready — Paystack is not configured, so no charge was made.'); },
    });
  };
  return <Shell cartCount={cart ? 1 : 0} onCart={() => setCart(cart ?? products[0])}>
    <main>
      <section className="mx-auto max-w-[1240px] px-5 pb-14 pt-12 lg:px-8 lg:pb-20 lg:pt-20">
        <div className="grid items-end gap-10 lg:grid-cols-[1.1fr_.9fr]">
          <div className="fade-up"><div className="mb-6 flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))]"><span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))]" /> Built for the Nigerian classroom</div><h1 className="max-w-3xl font-display text-[3.35rem] font-bold leading-[.98] tracking-[-.06em] sm:text-6xl lg:text-[5.7rem]">Good teaching<br /><span className="text-[hsl(var(--primary))]">should pay off.</span></h1><p className="mt-7 max-w-xl text-lg leading-8 text-[hsl(var(--muted-foreground))]">Find the lesson notes, WAEC drills and classroom resources that make tomorrow easier — or turn your hard-won classroom knowledge into income.</p><div className="mt-8 flex flex-wrap gap-3"><a href="#catalog" className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))] hover:brightness-110" data-testid="link-browse-catalog">Browse the shelf <ArrowDownIcon /></a><Link href="/seller" className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] px-5 py-3.5 text-sm font-bold hover:bg-[hsl(var(--secondary))]" data-testid="link-start-selling">Start selling <ArrowRight size={16} /></Link></div></div>
          <div className="relative hidden min-h-[330px] lg:block fade-up-2"><div className="absolute right-2 top-4 h-64 w-64 rounded-full bg-[hsl(var(--accent)/.55)] blur-3xl" /><div className="absolute right-10 top-10 w-80 rotate-[-7deg] rounded-[1.5rem] border border-white/30 bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))] shadow-2xl"><div className="flex justify-between text-xs font-bold uppercase tracking-[.2em] text-white/70"><span>Teacher income</span><TrendingUp size={17} /></div><p className="mt-12 font-display text-5xl font-bold">₦486k</p><p className="mt-2 text-sm text-white/70">earned by sellers this month</p><div className="mt-8 h-2 rounded-full bg-white/20"><div className="h-2 w-4/5 rounded-full bg-[hsl(var(--accent))]" /></div></div><div className="absolute bottom-3 left-10 w-64 rotate-[8deg] rounded-[1.25rem] bg-[hsl(var(--card))] p-5 shadow-xl"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[hsl(var(--accent))] text-xs font-bold">CO</span><div><p className="text-sm font-bold">Chinonso just sold</p><p className="text-xs text-[hsl(var(--muted-foreground))]">Chemistry Drill Pack</p></div><Check size={16} className="ml-auto text-[hsl(var(--primary))]" /></div></div></div>
        </div>
        <div className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--border))] sm:grid-cols-4 fade-up-3">{[['Notes & resources', compact(summary.notes)], ['Independent sellers', compact(summary.sellers)], ['Paid out so far', compactNaira(summary.paid)], ['Buyers today', compact(summary.buyersToday)]].map(([label, value]) => <div className="bg-[hsl(var(--card))] px-4 py-5 sm:px-6" key={label}><p className="font-display text-2xl font-bold sm:text-3xl">{value}</p><p className="mt-1 text-xs font-semibold text-[hsl(var(--muted-foreground))]">{label}</p></div>)}</div>
      </section>
      <section id="catalog" className="border-t border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.4)]"><div className="mx-auto max-w-[1240px] px-5 py-14 lg:px-8 lg:py-20"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><span className="text-xs font-extrabold uppercase tracking-[.2em] text-[hsl(var(--primary))]">The shelf</span><h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Resources with receipts.</h2><p className="mt-2 text-[hsl(var(--muted-foreground))]">Made in real classrooms. Ready for your next lesson or exam.</p></div><div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]"><span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" /> Updated daily by Nigerian educators</div></div>
        <div className="mt-9 flex flex-col gap-3 lg:flex-row"><label className="relative flex-1"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search WAEC, JSS2 maths, scheme of work..." className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-3.5 pl-11 pr-4 outline-none focus:border-[hsl(var(--primary))]" data-testid="input-search-products" /></label><div className="flex gap-2 overflow-auto pb-1">{['All resources', 'Lesson Notes', 'Exam Prep', 'CBT Practice', 'Classroom Resources'].map((item) => <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-xl px-4 py-3 text-sm font-bold transition ${category === item ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--secondary))]'}`} data-testid={`button-filter-${item.toLowerCase().replaceAll(' ', '-')}`}><Filter size={14} className="mr-2 inline" />{item}</button>)}</div></div>
        {isLoading && !apiProducts ? <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div className="h-[390px] animate-pulse rounded-2xl bg-[hsl(var(--muted))]" key={item} />)}</div> : filtered.length ? <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((product) => <ProductCard key={product.id} product={product} onOpen={setSelected} onAdd={addToCart} added={cart?.id === product.id} />)}</div> : <div className="mt-9 rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-16 text-center"><PackageOpen className="mx-auto text-[hsl(var(--primary))]" size={32} /><h3 className="mt-4 font-display text-xl font-bold">No resources on this shelf yet.</h3><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Try a different subject or clear the search.</p><button onClick={() => { setSearch(''); setCategory('All resources'); }} className="mt-5 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-clear-filters">Clear filters</button></div>}
        {isError && <p className="mt-5 text-xs text-[hsl(var(--muted-foreground))]" data-testid="status-demo-mode">Showing the LessonMart demo shelf while the marketplace API reconnects.</p>}
      </div></section>
      <section className="mx-auto max-w-[1240px] px-5 py-16 lg:px-8 lg:py-24"><div className="grid items-center gap-10 rounded-[1.5rem] bg-[hsl(var(--primary))] p-7 text-[hsl(var(--primary-foreground))] sm:p-12 lg:grid-cols-[1.2fr_.8fr]"><div><span className="text-xs font-extrabold uppercase tracking-[.2em] text-[hsl(var(--accent))]">For teachers with a folder full of gold</span><h2 className="mt-4 max-w-xl font-display text-4xl font-bold leading-tight sm:text-5xl">Your best lesson should not disappear after Friday.</h2><p className="mt-5 max-w-lg leading-7 text-white/70">Package what already works, set your price, and get paid when another teacher or student finds it useful.</p><Link href="/seller" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--accent))] px-5 py-3.5 text-sm font-extrabold text-[hsl(var(--accent-foreground))]" data-testid="link-sell-banner">See the seller desk <ArrowRight size={17} /></Link></div><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/10 p-5"><Upload size={21} className="text-[hsl(var(--accent))]" /><p className="mt-10 font-display text-2xl font-bold">12 min</p><p className="mt-1 text-xs text-white/65">to list a resource</p></div><div className="mt-8 rounded-2xl bg-white/10 p-5"><Wallet size={21} className="text-[hsl(var(--accent))]" /><p className="mt-10 font-display text-2xl font-bold">₦0</p><p className="mt-1 text-xs text-white/65">to open your shelf</p></div></div></div></section>
    </main>
    <ProductModal product={selected} onClose={() => setSelected(null)} onAdd={addToCart} added={cart?.id === selected?.id} />
    <CartSheet product={cart} onClose={() => setCart(null)} onCheckout={(product) => { setCheckout(product); }} onRemove={() => setCart(null)} />
    <CheckoutModal product={checkout} onClose={() => setCheckout(null)} onComplete={completeOrder} loading={order.isPending} />
    <Notice message={notice} />
  </Shell>;
}

function ArrowDownIcon() { return <ArrowRight size={16} className="rotate-90" />; }

function MetricCard({ label, value, detail, icon: Icon, accent = false }: { label: string; value: string; detail: string; icon: typeof Wallet; accent?: boolean }) {
  return <div className={`rounded-2xl border p-5 ${accent ? 'border-[hsl(var(--accent)/.4)] bg-[hsl(var(--accent)/.15)]' : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'}`}><div className="flex items-start justify-between"><span className={`grid h-9 w-9 place-items-center rounded-xl ${accent ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]'}`}><Icon size={18} /></span><MoreHorizontal size={18} className="text-[hsl(var(--muted-foreground))]" /></div><p className="mt-7 text-sm text-[hsl(var(--muted-foreground))]">{label}</p><p className="mt-1 font-display text-3xl font-bold">{value}</p><p className="mt-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]">{detail}</p></div>;
}

function DashboardFrame({ title, eyebrow, children, nav, onAction }: { title: string; eyebrow: string; children: ReactNode; nav: { label: string; icon: typeof Wallet; active?: boolean }[]; onAction: (label: string) => void }) {
  const [location] = useLocation();
  return <Shell cartCount={0} onCart={() => undefined}><div className="mx-auto flex max-w-[1440px]"><aside className="hidden w-64 shrink-0 border-r border-[hsl(var(--border))] px-5 py-8 lg:block"><div className="mb-10 px-3 text-xs font-extrabold uppercase tracking-[.2em] text-[hsl(var(--muted-foreground))]">Workspace</div><div className="space-y-1">{nav.map(({ label, icon: Icon, active }) => <button key={label} onClick={() => onAction(label)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${active ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]'}`} data-testid={`button-dashboard-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={17} />{label}</button>)}</div><div className="mt-12 rounded-2xl bg-[hsl(var(--secondary))] p-4"><Sparkles size={18} className="text-[hsl(var(--accent))]" /><p className="mt-4 text-sm font-bold">Small moves, steady income.</p><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Your knowledge can travel further than your timetable.</p></div></aside><main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[hsl(var(--primary))]">{eyebrow}</p><h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1><p className="mt-2 text-[hsl(var(--muted-foreground))]">{location === '/admin' ? 'A clear view of the marketplace, without the spreadsheet fog.' : 'Keep your resources moving and your classroom work earning.'}</p></div><div className="flex gap-2 lg:hidden">{nav.slice(0, 3).map(({ label, icon: Icon, active }) => <button onClick={() => onAction(label)} key={label} className={`grid h-10 w-10 place-items-center rounded-xl border ${active ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border-[hsl(var(--border))]'}`} aria-label={label} data-testid={`button-mobile-dashboard-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={17} /></button>)}</div></div>{children}</main></div></Shell>;
}

function Seller() {
  const { data: apiSeller, isLoading } = useGetSellerOverview({ query: { retry: false, queryKey: getGetSellerOverviewQueryKey() } });
  const seller = apiSeller ?? demoSeller;
  const createProduct = useCreateSellerProduct();
  const client = useQueryClient();
  const { notice, notify } = useDemoNotice();
  const [tab, setTab] = useState('Overview');
  const [showForm, setShowForm] = useState(false);
  const [showPayout, setShowPayout] = useState(false);
  const [form, setForm] = useState<SellerProductInput>({ title: '', description: '', category: 'Lesson Notes', subject: 'Mathematics', classLevel: 'SS2', price: 2500 });
  const submitProduct = (event: FormEvent) => { event.preventDefault(); createProduct.mutate({ data: form }, { onSuccess: () => { setShowForm(false); notify('Your resource is queued for approval.'); client.invalidateQueries({ queryKey: getGetSellerOverviewQueryKey() }); }, onError: () => { setShowForm(false); notify('Demo mode: resource saved locally and queued for approval.'); } }); };
  const action = (label: string) => { setTab(label); if (label === 'Upload product') setShowForm(true); else if (label === 'Payouts') setShowPayout(true); else if (label === 'Marketing tools') notify('Share kit copied — your product link is ready to post.'); };
  return <><DashboardFrame title={tab === 'Overview' ? 'Good morning, teacher.' : tab} eyebrow="Seller desk" nav={[{ label: 'Overview', icon: LayoutDashboard, active: tab === 'Overview' }, { label: 'Products', icon: PackageOpen, active: tab === 'Products' }, { label: 'Upload product', icon: Upload }, { label: 'Marketing tools', icon: Share2 }, { label: 'Payouts', icon: Wallet }]} onAction={action}>
    {isLoading ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div className="h-36 animate-pulse rounded-2xl bg-[hsl(var(--muted))]" key={item} />)}</div> : <><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total earnings" value={naira(seller.totalEarnings)} detail="+18.4% from last month" icon={TrendingUp} accent /><MetricCard label="Available to withdraw" value={naira(seller.availablePayout)} detail="Settled and ready" icon={Wallet} /><MetricCard label="Resource sales" value={seller.totalSales.toLocaleString()} detail="Across 12 products" icon={ShoppingBag} /><MetricCard label="Shelf views" value={compact(seller.views)} detail="+1,240 this week" icon={BarChart3} /></div><div className="mt-7 grid gap-7 xl:grid-cols-[1.2fr_.8fr]"><section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Your shelf</p><h2 className="mt-2 font-display text-2xl font-bold">Products that keep teaching.</h2></div><button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-upload-product"><Plus size={16} /> Add product</button></div><div className="mt-7 space-y-3">{demoProducts.slice(0, 3).map((product, index) => <div key={product.id} className="flex items-center gap-4 rounded-xl border border-[hsl(var(--border))] p-3"><div className="h-12 w-12 shrink-0 rounded-lg" style={{ backgroundColor: product.coverColor }} /><div className="min-w-0 flex-1"><p className="truncate font-bold">{product.title}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{index === 2 ? 'Draft' : `${product.sales} sales · ${naira(product.price)}`}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${index === 2 ? 'bg-[hsl(var(--accent)/.2)] text-[hsl(var(--accent-foreground))]' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]'}`}>{index === 2 ? 'Draft' : 'Live'}</span><button onClick={() => notify('Product editor is available in the next release.')} aria-label={`Edit ${product.title}`} className="text-[hsl(var(--muted-foreground))]" data-testid={`button-edit-product-${product.id}`}><PenLine size={16} /></button></div>)}</div><button onClick={() => setTab('Products')} className="mt-6 flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))]" data-testid="button-view-all-products">View all products <ArrowRight size={15} /></button></section><section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">This month</p><h2 className="mt-2 font-display text-2xl font-bold">A useful little lift.</h2><div className="mt-8 flex h-40 items-end gap-2">{[32, 48, 42, 63, 56, 78, 69, 88, 76, 100].map((height, index) => <div key={index} className="flex-1 rounded-t-md bg-[hsl(var(--primary)/.18)]" style={{ height: `${height}%` }}><div className="h-full rounded-t-md bg-[hsl(var(--primary))]" style={{ transform: `scaleY(${index > 6 ? .72 : .42})`, transformOrigin: 'bottom' }} /></div>)}</div><div className="mt-5 flex justify-between text-xs text-[hsl(var(--muted-foreground))]"><span>1 Jun</span><span>30 Jun</span></div><div className="mt-8 rounded-xl bg-[hsl(var(--secondary))] p-4"><p className="text-sm font-bold">Next best move</p><p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Add a WAEC or JAMB resource to meet the July revision rush.</p></div></section></div></>}</DashboardFrame>;
    {showForm && <ProductForm form={form} setForm={setForm} onClose={() => setShowForm(false)} onSubmit={submitProduct} loading={createProduct.isPending} />}{showPayout && <PayoutModal amount={seller.availablePayout} onClose={() => setShowPayout(false)} onSubmit={() => { setShowPayout(false); notify('Payout request received. We will confirm your bank details shortly.'); }} />}<Notice message={notice} /></>;
}

function ProductForm({ form, setForm, onClose, onSubmit, loading }: { form: SellerProductInput; setForm: (form: SellerProductInput) => void; onClose: () => void; onSubmit: (event: FormEvent) => void; loading: boolean }) {
  const update = (key: keyof SellerProductInput, value: string) => setForm({ ...form, [key]: key === 'price' ? Number(value) : value });
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[hsl(var(--foreground)/.55)] p-0 backdrop-blur-sm sm:items-center sm:p-5"><div className="max-h-[94dvh] w-full max-w-2xl overflow-auto rounded-t-[1.5rem] bg-[hsl(var(--card))] p-6 shadow-2xl sm:rounded-[1.5rem] sm:p-9"><div className="flex justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">New resource</p><h2 className="mt-2 font-display text-3xl font-bold">Put your best work on the shelf.</h2></div><button onClick={onClose} aria-label="Close upload form" data-testid="button-close-upload"><X /></button></div><form onSubmit={onSubmit} className="mt-8 grid gap-5 sm:grid-cols-2"><label className="sm:col-span-2 text-sm font-bold">Product title<input required value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. SS2 Physics: Electricity Notes" className="field" data-testid="input-product-title" /></label><label className="sm:col-span-2 text-sm font-bold">What will buyers get?<textarea required rows={4} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Tell students and teachers what makes this useful." className="field resize-none" data-testid="input-product-description" /></label><SelectField label="Category" value={form.category} options={['Lesson Notes', 'Exam Prep', 'CBT Practice', 'Classroom Resources']} onChange={(value) => update('category', value)} testId="select-product-category" /><label className="text-sm font-bold">Subject<input required value={form.subject} onChange={(e) => update('subject', e.target.value)} className="field" data-testid="input-product-subject" /></label><label className="text-sm font-bold">Class level<input required value={form.classLevel} onChange={(e) => update('classLevel', e.target.value)} className="field" data-testid="input-product-level" /></label><label className="text-sm font-bold">Price in naira<input required min="500" type="number" value={form.price} onChange={(e) => update('price', e.target.value)} className="field" data-testid="input-product-price" /></label><div className="sm:col-span-2 flex justify-end gap-3 border-t border-[hsl(var(--border))] pt-5"><button type="button" onClick={onClose} className="rounded-xl px-5 py-3 text-sm font-bold" data-testid="button-cancel-upload">Cancel</button><button disabled={loading} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="button-submit-product">{loading && <LoaderCircle size={16} className="spin" />} Submit for review</button></div></form></div></div>;
}

function SelectField({ label, value, options, onChange, testId }: { label: string; value: string; options: string[]; onChange: (value: string) => void; testId: string }) {
  return <label className="text-sm font-bold">{label}<span className="relative mt-2 block"><select value={value} onChange={(e) => onChange(e.target.value)} className="field mt-0 appearance-none" data-testid={testId}>{options.map((option) => <option value={option} key={option}>{option}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" /></span></label>;
}

function PayoutModal({ amount, onClose, onSubmit }: { amount: number; onClose: () => void; onSubmit: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--foreground)/.55)] p-5 backdrop-blur-sm"><div className="w-full max-w-md rounded-[1.5rem] bg-[hsl(var(--card))] p-7 shadow-2xl"><div className="flex justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Payouts</p><h2 className="mt-2 font-display text-3xl font-bold">Take your work home.</h2></div><button onClick={onClose} aria-label="Close payout modal" data-testid="button-close-payout"><X /></button></div><p className="mt-5 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Request a transfer to your verified Nigerian bank account. Demo mode does not initiate a real transfer.</p><div className="mt-6 rounded-xl bg-[hsl(var(--secondary))] p-5"><span className="text-xs text-[hsl(var(--muted-foreground))]">Available</span><p className="mt-1 font-display text-3xl font-bold">{naira(amount)}</p></div><button onClick={onSubmit} className="mt-6 w-full rounded-xl bg-[hsl(var(--accent))] py-3.5 font-extrabold text-[hsl(var(--accent-foreground))]" data-testid="button-request-payout">Request payout</button></div></div>;
}

function Admin() {
  const { data: apiAdmin, isLoading } = useGetAdminOverview({ query: { retry: false, queryKey: getGetAdminOverviewQueryKey() } });
  const admin = apiAdmin ?? demoAdmin;
  const { notice, notify } = useDemoNotice();
  const [tab, setTab] = useState('Overview');
  const action = (label: string) => { setTab(label); if (label !== 'Overview') notify(`${label} queue selected — demo data is ready for review.`); };
  return <><DashboardFrame title="Marketplace control room" eyebrow="Admin desk" nav={[{ label: 'Overview', icon: LayoutDashboard, active: tab === 'Overview' }, { label: 'Approvals', icon: ClipboardList }, { label: 'Payouts', icon: Wallet }, { label: 'Revenue', icon: BarChart3 }]} onAction={action}>{isLoading ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div className="h-36 animate-pulse rounded-2xl bg-[hsl(var(--muted))]" key={item} />)}</div> : <><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total revenue" value={naira(admin.totalRevenue)} detail="Gross marketplace volume" icon={BarChart3} accent /><MetricCard label="Commission earned" value={naira(admin.commission)} detail="15% marketplace share" icon={TrendingUp} /><MetricCard label="Pending approvals" value={admin.pendingApprovals.toString()} detail="Need a human look" icon={Clock3} /><MetricCard label="Payouts this cycle" value={naira(admin.payouts)} detail="Next run · Friday" icon={Wallet} /></div><div className="mt-7 grid gap-7 xl:grid-cols-[1.1fr_.9fr]"><section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Needs a look</p><h2 className="mt-2 font-display text-2xl font-bold">Keep the shelf trustworthy.</h2></div><button onClick={() => action('Approvals')} className="text-sm font-bold text-[hsl(var(--primary))]" data-testid="button-review-approvals">Review all</button></div><div className="mt-7 space-y-3">{demoProducts.slice(0, 3).map((product, index) => <div key={product.id} className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] p-3"><div className="h-11 w-11 rounded-lg" style={{ backgroundColor: product.coverColor }} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{product.title}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{product.seller.name} · submitted {index + 1}h ago</p></div><button onClick={() => notify(`${product.title} approved for the shelf.`)} className="rounded-lg bg-[hsl(var(--secondary))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary))]" data-testid={`button-approve-${product.id}`}>Approve</button><button onClick={() => notify('Product held for a closer review.')} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))]" aria-label={`More actions for ${product.title}`} data-testid={`button-more-${product.id}`}><MoreHorizontal size={17} /></button></div>)}</div></section><section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8"><div className="flex items-start justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Volume pulse</p><h2 className="mt-2 font-display text-2xl font-bold">The marketplace is moving.</h2></div><span className="rounded-full bg-[hsl(var(--secondary))] px-3 py-1 text-xs font-bold text-[hsl(var(--primary))]">30 days</span></div><div className="mt-8 flex h-48 items-end gap-1.5">{[28, 36, 32, 44, 42, 57, 52, 68, 64, 78, 74, 91].map((height, index) => <div key={index} className="flex-1 rounded-t-md bg-[hsl(var(--primary))]" style={{ height: `${height}%`, opacity: .32 + index / 24 }} />)}</div><div className="mt-5 grid grid-cols-3 gap-3 border-t border-[hsl(var(--border))] pt-5"><div><p className="font-display text-xl font-bold">+24%</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">GMV</p></div><div><p className="font-display text-xl font-bold">+18%</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">New sellers</p></div><div><p className="font-display text-xl font-bold">4.8</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Avg rating</p></div></div></section></div><div className="mt-7 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Operations note</p><h2 className="mt-2 font-display text-xl font-bold">The next payout run is Friday.</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Review the pending queue before 4:00 PM to keep seller trust high.</p></div><button onClick={() => action('Payouts')} className="flex items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] px-4 py-3 text-sm font-bold hover:bg-[hsl(var(--secondary))]" data-testid="button-open-payouts">Open payouts <ArrowRight size={16} /></button></div></div></>}</DashboardFrame><Notice message={notice} /></>;
}

function AppRouter() {
  return <ErrorBoundary resetKey={window.location.pathname}><Switch><Route path="/" component={Marketplace} /><Route path="/seller" component={Seller} /><Route path="/admin" component={Admin} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><AppRouter /><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;