import { Router, type IRouter, type Request } from "express";
import {
  CreateOrderBody,
  CreateOrderResponse,
  CreateSellerProductBody,
  CreateSellerProductResponse,
  GetAdminOverviewResponse,
  GetMarketplaceSummaryResponse,
  GetProductParams,
  GetProductResponse,
  GetSellerOverviewResponse,
  ListProductsQueryParams,
  ListProductsResponse,
} from "@workspace/api-zod";

type Product = {
  id: string;
  title: string;
  description: string;
  category: string;
  subject: string;
  classLevel: string;
  price: number;
  rating: number;
  sales: number;
  badge: string | null;
  coverColor: string;
  coverLabel: string;
  seller: {
    name: string;
    initials: string;
    verified: boolean;
  };
};

const sellers = [
  { name: "Mrs. Adebayo", initials: "MA", verified: true },
  { name: "Mr. Chukwu", initials: "MC", verified: true },
  { name: "Mr. Ade", initials: "MA", verified: true },
  { name: "Mrs. Okafor", initials: "MO", verified: false },
  { name: "Miss Ibrahim", initials: "MI", verified: true },
];

const products: Product[] = [
  { id: "math-jss2-complete", title: "JSS2 Mathematics: Complete Lesson Notes", description: "A comprehensive, classroom-ready collection of JSS2 Mathematics notes with worked examples, exercises, and revision checkpoints.", category: "JSS 1-3", subject: "Mathematics", classLevel: "JSS 2", price: 1800, rating: 4.9, sales: 184, badge: "BESTSELLER", coverColor: "#0D7A5F", coverLabel: "JSS2\\nMATH", seller: sellers[0] },
  { id: "waec-english-2024", title: "WAEC English Language Past Questions 2014–2024", description: "Ten years of WAEC English Language past questions with clear answers and examiner-style explanations.", category: "WAEC Past Q&A", subject: "English", classLevel: "SSS 3", price: 1200, rating: 4.8, sales: 231, badge: "VERIFIED", coverColor: "#213B70", coverLabel: "WAEC\\nENGLISH", seller: sellers[1] },
  { id: "basic-science-primary5", title: "Basic Science Primary 5 — 3rd Term", description: "Engaging Basic Science lesson notes for Primary 5 with diagrams and age-appropriate activities.", category: "Primary 1-6", subject: "Science", classLevel: "Primary 5", price: 900, rating: 4.7, sales: 96, badge: null, coverColor: "#D97706", coverLabel: "BASIC\\nSCIENCE", seller: sellers[3] },
  { id: "jamb-maths-crash", title: "JAMB Mathematics Crash Revision Pack", description: "Focused JAMB Mathematics revision with high-frequency topics, shortcuts, and timed practice.", category: "JAMB Past Q&A", subject: "Mathematics", classLevel: "UTME", price: 1500, rating: 4.9, sales: 142, badge: "VERIFIED", coverColor: "#7C3AED", coverLabel: "JAMB\\nMATHS", seller: sellers[4] },
  { id: "sss1-physics-notes", title: "SSS1 Physics Notes & Practical Guide", description: "A clear, visual introduction to SSS1 Physics with practical activities and exam tips.", category: "SSS 1-3", subject: "Science", classLevel: "SSS 1", price: 2000, rating: 4.6, sales: 73, badge: null, coverColor: "#0E7490", coverLabel: "SSS1\\nPHYSICS", seller: sellers[2] },
  { id: "primary-3-english", title: "Primary 3 English Language Notes", description: "Simple, fun, and complete English Language notes for Primary 3 teachers.", category: "Primary 1-6", subject: "English", classLevel: "Primary 3", price: 700, rating: 4.8, sales: 119, badge: "BESTSELLER", coverColor: "#BE185D", coverLabel: "PRIMARY 3\\nENGLISH", seller: sellers[0] },
  { id: "jss1-basic-tech", title: "JSS1 Basic Technology Scheme of Work", description: "Full term-by-term scheme of work and lesson notes for JSS1 Basic Technology.", category: "Scheme of Work", subject: "Science", classLevel: "JSS 1", price: 1000, rating: 4.5, sales: 61, badge: null, coverColor: "#166534", coverLabel: "BASIC\\nTECH", seller: sellers[2] },
  { id: "sss2-commerce", title: "SSS2 Commerce Lesson Notes", description: "Structured SSS2 Commerce notes with Nigerian business examples, review questions, and activities.", category: "SSS 1-3", subject: "Commercial", classLevel: "SSS 2", price: 1600, rating: 4.7, sales: 88, badge: "VERIFIED", coverColor: "#92400E", coverLabel: "SSS2\\nCOMMERCE", seller: sellers[1] },
  { id: "waec-biology", title: "WAEC Biology Practical Questions & Answers", description: "Practical biology revision with specimen notes, diagrams, and answers to likely questions.", category: "WAEC Past Q&A", subject: "Science", classLevel: "SSS 3", price: 2200, rating: 4.9, sales: 167, badge: "BESTSELLER", coverColor: "#166534", coverLabel: "WAEC\\nBIOLOGY", seller: sellers[4] },
  { id: "nursery-counting", title: "Nursery 2 Number Work Activity Pack", description: "Printable number work activities designed for Nigeria's Nursery 2 classroom.", category: "Nursery", subject: "Mathematics", classLevel: "Nursery 2", price: 500, rating: 4.8, sales: 76, badge: null, coverColor: "#C2410C", coverLabel: "NURSERY 2\\nNUMBER", seller: sellers[3] },
  { id: "jss3-chemistry", title: "JSS3 Introductory Chemistry Notes", description: "A friendly introduction to chemistry concepts with classroom demonstrations and tests.", category: "JSS 1-3", subject: "Science", classLevel: "JSS 3", price: 1400, rating: 4.6, sales: 54, badge: null, coverColor: "#4338CA", coverLabel: "JSS3\\nCHEMISTRY", seller: sellers[1] },
  { id: "ss3-government", title: "SSS3 Government — Complete Revision Notes", description: "Exam-focused Government notes covering every major topic in the senior secondary curriculum.", category: "SSS 1-3", subject: "Arts", classLevel: "SSS 3", price: 1700, rating: 4.8, sales: 132, badge: "VERIFIED", coverColor: "#9F1239", coverLabel: "SSS3\\nGOVT", seller: sellers[0] },
  { id: "primary-scheme-all", title: "Primary 1–6 Scheme of Work Bundle", description: "A complete year-round scheme of work bundle for core primary subjects.", category: "Scheme of Work", subject: "Commercial", classLevel: "Primary 1-6", price: 2500, rating: 4.9, sales: 203, badge: "BESTSELLER", coverColor: "#166534", coverLabel: "PRIMARY\\nBUNDLE", seller: sellers[2] },
  { id: "jamb-english", title: "JAMB Use of English Past Questions", description: "Curated JAMB Use of English practice questions with answers and pacing guidance.", category: "JAMB Past Q&A", subject: "English", classLevel: "UTME", price: 1100, rating: 4.7, sales: 148, badge: null, coverColor: "#0369A1", coverLabel: "JAMB\\nENGLISH", seller: sellers[4] },
  { id: "lesson-plan-basic4", title: "Basic 4 Weekly Lesson Plan Bundle", description: "Ready-to-use weekly lesson plans for Basic 4 classroom teachers.", category: "Lesson Plans", subject: "Commercial", classLevel: "Primary 4", price: 1300, rating: 4.8, sales: 101, badge: "VERIFIED", coverColor: "#B45309", coverLabel: "BASIC 4\\nPLANS", seller: sellers[3] },
  { id: "cbt-physics", title: "SSCE Physics CBT Practice — 300 Questions", description: "Three hundred CBT-style Physics questions to build confidence before exam day.", category: "CBT Practice", subject: "Science", classLevel: "SSS 3", price: 1000, rating: 4.6, sales: 65, badge: null, coverColor: "#0F766E", coverLabel: "PHYSICS\\nCBT", seller: sellers[1] },
  { id: "jss2-social-studies", title: "JSS2 Social Studies Lesson Notes", description: "Thoughtful Social Studies notes with Nigerian examples, classwork, and homework.", category: "JSS 1-3", subject: "Arts", classLevel: "JSS 2", price: 800, rating: 4.5, sales: 47, badge: null, coverColor: "#7E22CE", coverLabel: "JSS2\\nSOCIAL", seller: sellers[0] },
  { id: "ss1-accounting", title: "SSS1 Financial Accounting Made Simple", description: "Practical Accounting notes that make ledgers, journals, and trial balances easier to teach.", category: "SSS 1-3", subject: "Commercial", classLevel: "SSS 1", price: 1900, rating: 4.9, sales: 92, badge: "BESTSELLER", coverColor: "#1D4ED8", coverLabel: "SSS1\\nACCOUNTS", seller: sellers[2] },
];

const router: IRouter = Router();

function queryFrom(req: Request) {
  const result = ListProductsQueryParams.safeParse(req.query);
  return result.success ? result.data : { limit: 18 };
}

router.get("/products", (req, res) => {
  const query = queryFrom(req);
  const search = query.search?.toLowerCase();
  const filtered = products
    .filter((product) => !query.category || product.category === query.category)
    .filter((product) => !query.subject || product.subject === query.subject)
    .filter((product) => !search || `${product.title} ${product.subject} ${product.classLevel}`.toLowerCase().includes(search))
    .slice(0, query.limit);
  res.json(ListProductsResponse.parse(filtered));
});

router.get("/products/:productId", (req, res) => {
  const parsed = GetProductParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }
  const product = products.find((item) => item.id === parsed.data.productId);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(GetProductResponse.parse(product));
});

router.get("/marketplace/summary", (_req, res) => {
  res.json(GetMarketplaceSummaryResponse.parse({ notes: 1500, sellers: 500, paid: 2000000, buyersToday: 12 }));
});

router.post("/orders", (req, res) => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please provide a valid buyer email and product." });
    return;
  }
  const product = products.find((item) => item.id === parsed.data.productId);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const order = {
    id: `order-${Date.now()}`,
    productId: product.id,
    amount: product.price,
    commission: product.price * 0.2,
    sellerAmount: product.price * 0.8,
    status: "paid",
    createdAt: new Date().toISOString(),
  };
  res.status(201).json(CreateOrderResponse.parse(order));
});

router.get("/seller/overview", (_req, res) => {
  res.json(GetSellerOverviewResponse.parse({ totalEarnings: 64800, availablePayout: 23500, totalSales: 186, views: 12840, pendingProducts: 3 }));
});

router.post("/seller/products", (req, res) => {
  const parsed = CreateSellerProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please complete all product fields." });
    return;
  }
  const product = {
    id: `seller-${Date.now()}`,
    ...parsed.data,
    rating: 0,
    sales: 0,
    badge: null,
    coverColor: "#0D7A5F",
    coverLabel: parsed.data.subject.toUpperCase(),
    seller: sellers[0],
  };
  products.unshift(product);
  res.status(201).json(CreateSellerProductResponse.parse(product));
});

router.get("/admin/overview", (_req, res) => {
  res.json(GetAdminOverviewResponse.parse({ totalRevenue: 2000000, commission: 400000, pendingApprovals: 18, payouts: 1600000 }));
});

export default router;