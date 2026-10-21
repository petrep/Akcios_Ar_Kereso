/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, TrendingDown, ShoppingBag, Tag, ExternalLink, ShieldCheck, 
  Clock, Star, ArrowUpDown, Filter, Bell, CheckCircle2, Copy, Check, 
  BarChart2, X, AlertCircle, Sparkles, Heart, RefreshCw, Layers
} from 'lucide-react';

interface WebshopOffer {
  id: string;
  productName: string;
  shopName: string;
  shopLogo: string;
  currentPriceHuf: number;
  originalPriceHuf: number;
  discountPercent: number;
  inStock: boolean;
  shippingCostHuf: number;
  rating: number;
  reviewCount: number;
  productUrl: string;
  imageUrl: string;
  couponCode?: string;
  priceHistory: { date: string; price: number }[];
  specs: Record<string, string>;
  description: string;
}

interface ProductSearchResponse {
  query: string;
  timestamp: string;
  offers: WebshopOffer[];
  aiBuyingTip: string;
}

interface TrendingDeal {
  id: string;
  productName: string;
  category: string;
  shopName: string;
  currentPriceHuf: number;
  originalPriceHuf: number;
  discountPercent: number;
  imageUrl: string;
  rating: number;
  reviewCount: number;
}

const POPULAR_SEARCHES = [
  'iPhone 16 Pro',
  'Xiaomi Robotporszívó',
  'Delonghi Kávéfőző',
  'PlayStation 5 Slim',
  'Samsung 4K Smart TV',
  'Air Fryer 6L',
  'Dyson Hajszárító',
  'Bosch Akkus Fúró'
];

const CATEGORIES = [
  { id: 'all', label: 'Összes kategória', icon: Layers },
  { id: 'elektronika', label: 'Elektronika & Mobil', icon: ShoppingBag },
  { id: 'otthon', label: 'Otthon & Konyha', icon: Tag },
  { id: 'szepseg', label: 'Szépség & Divat', icon: Sparkles },
  { id: 'sport', label: 'Sport & Játék', icon: BarChart2 }
];

export default function App() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<ProductSearchResponse | null>(null);
  const [trendingDeals, setTrendingDeals] = useState<TrendingDeal[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);

  // Sorting & Filtering state
  const [sortBy, setSortBy] = useState<'price_asc' | 'discount_desc' | 'rating_desc'>('price_asc');
  const [selectedShop, setSelectedShop] = useState<string>('all');
  
  // Modals state
  const [compareList, setCompareList] = useState<WebshopOffer[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [activeHistoryOffer, setActiveHistoryOffer] = useState<WebshopOffer | null>(null);
  const [alertModalOffer, setAlertModalOffer] = useState<WebshopOffer | null>(null);
  const [alertEmail, setAlertEmail] = useState('');
  const [alertTargetPrice, setAlertTargetPrice] = useState<number | ''>('');
  const [alertSuccessMsg, setAlertSuccessMsg] = useState('');
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  // Fetch trending deals on mount
  useEffect(() => {
    fetchTrendingDeals();
  }, []);

  const fetchTrendingDeals = async () => {
    try {
      setLoadingTrending(true);
      const res = await fetch('/api/v1/deals/trending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.deals) {
        setTrendingDeals(data.deals);
      }
    } catch (err) {
      console.error('Failed to fetch trending deals:', err);
    } finally {
      setLoadingTrending(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent, searchQuery?: string) => {
    if (e) e.preventDefault();
    const targetQuery = searchQuery || query;
    if (!targetQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/products/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: targetQuery,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          maxPrice: maxPrice !== '' ? Number(maxPrice) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Hiba történt a keresés során.');
      }
      setSearchResult(data);
    } catch (err: any) {
      setError(err.message || 'Ismeretlen hiba történt.');
    } finally {
      setLoading(false);
    }
  };

  const formatHuf = (price: number) => {
    return price.toLocaleString('hu-HU') + ' Ft';
  };

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 2500);
  };

  const toggleCompare = (offer: WebshopOffer) => {
    if (compareList.some(item => item.id === offer.id)) {
      setCompareList(compareList.filter(item => item.id !== offer.id));
    } else {
      if (compareList.length >= 4) {
        alert('Legfeljebb 4 terméket hasonlíthatsz össze egyszerre.');
        return;
      }
      setCompareList([...compareList, offer]);
    }
  };

  const handleSetAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertModalOffer || !alertEmail) return;

    try {
      const res = await fetch('/api/v1/price-alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: alertEmail,
          productName: alertModalOffer.productName,
          targetPriceHuf: alertTargetPrice !== '' ? Number(alertTargetPrice) : alertModalOffer.currentPriceHuf,
          shopName: alertModalOffer.shopName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAlertSuccessMsg(data.message);
        setTimeout(() => {
          setAlertModalOffer(null);
          setAlertSuccessMsg('');
          setAlertEmail('');
          setAlertTargetPrice('');
        }, 3000);
      }
    } catch (err) {
      alert('Nem sikerült beállítani az árértesítőt.');
    }
  };

  // Filter & Sort offers
  const filteredOffers = searchResult?.offers.filter(offer => {
    if (selectedShop !== 'all' && offer.shopName.toLowerCase() !== selectedShop.toLowerCase()) {
      return false;
    }
    if (maxPrice !== '' && offer.currentPriceHuf > Number(maxPrice)) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'price_asc') return a.currentPriceHuf - b.currentPriceHuf;
    if (sortBy === 'discount_desc') return b.discountPercent - a.discountPercent;
    if (sortBy === 'rating_desc') return b.rating - a.rating;
    return 0;
  }) || [];

  const uniqueShops = Array.from(new Set(searchResult?.offers.map(o => o.shopName) || []));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 font-sans antialiased flex flex-col selection:bg-rose-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setSearchResult(null); setQuery(''); }}>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <Tag className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-2xl tracking-tight text-slate-900">Ár<span className="text-rose-600">Vadász</span></span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">HU</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Magyar webshop ár- és akciókereső</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {compareList.length > 0 && (
              <button
                onClick={() => setShowCompareModal(true)}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all shadow-sm"
              >
                <Layers className="w-4 h-4 text-rose-400" />
                <span>Összehasonlítás ({compareList.length})</span>
              </button>
            )}
            <div className="hidden sm:flex items-center space-x-2 text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Hiteles magyar árak</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Search Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-rose-900 via-slate-900 to-slate-950 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#f43f5e_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold mb-6 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span>Mesterséges intelligenciával támogatott árfigyelő</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
            Találd meg a <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-red-300 to-amber-300">legolcsóbb árat</span> azonnal
          </h1>
          <p className="text-base sm:text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
            Keress rá bármilyen termékre, és mi összehasonlítjuk a legnagyobb magyar webshopok (eMAG, Alza, MediaMarkt, Pepco, Praktiker és mások) árait, akcióit és szállítási költségeit.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row items-stretch bg-white rounded-2xl p-2 shadow-2xl shadow-rose-950/40 border border-white/20">
              <div className="relative flex-1 flex items-center px-3 py-2">
                <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Írd be a termék nevét (pl. iPhone 16 Pro, kávéfőző, robotporszívó)..."
                  className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-base focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-2 sm:mt-0 bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold px-8 py-3.5 rounded-xl hover:from-rose-500 hover:to-red-500 transition-all shadow-md shadow-rose-600/30 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Keresés...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    <span>Árak keresése</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Popular Searches */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Népszerű keresések:</span>
            {POPULAR_SEARCHES.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(item);
                  handleSearch(undefined, item);
                }}
                className="bg-white/10 hover:bg-white/20 text-slate-200 px-3 py-1 rounded-lg transition-colors border border-white/10"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {error && (
          <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* If no search result, show Trending Deals */}
        {!searchResult && !loading && (
          <div className="space-y-10">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Népszerű Akciók a Magyar Webshopokban</h2>
                  <p className="text-sm text-slate-500">A nap legjobb kedvezményei valós idejű adatok alapján</p>
                </div>
                <button 
                  onClick={fetchTrendingDeals}
                  className="flex items-center space-x-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-2 rounded-xl transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingTrending ? 'animate-spin' : ''}`} />
                  <span>Frissítés</span>
                </button>
              </div>

              {loadingTrending ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs animate-pulse h-80 flex flex-col justify-between">
                      <div className="w-full h-40 bg-slate-200 rounded-xl mb-4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {trendingDeals.map((deal) => (
                    <div 
                      key={deal.id}
                      onClick={() => {
                        setQuery(deal.productName);
                        handleSearch(undefined, deal.productName);
                      }}
                      className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-rose-200 transition-all cursor-pointer flex flex-col group"
                    >
                      <div className="relative h-48 bg-slate-100 overflow-hidden">
                        <img 
                          src={deal.imageUrl} 
                          alt={deal.productName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3 bg-rose-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                          -{deal.discountPercent}%
                        </div>
                        <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-medium px-2 py-1 rounded-md">
                          {deal.shopName}
                        </div>
                      </div>
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">{deal.category}</span>
                          <h3 className="font-bold text-slate-900 text-base mt-1 line-clamp-2 group-hover:text-rose-600 transition-colors">
                            {deal.productName}
                          </h3>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-xs text-slate-400 line-through block">{formatHuf(deal.originalPriceHuf)}</span>
                            <span className="text-lg font-black text-rose-600">{formatHuf(deal.currentPriceHuf)}</span>
                          </div>
                          <div className="flex items-center space-x-1 bg-amber-50 px-2.5 py-1 rounded-lg">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-xs font-bold text-slate-700">{deal.rating}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State during Search */}
        {loading && (
          <div className="py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Webshopok árainak fésülése...</h3>
            <p className="text-sm text-slate-500">A legfrissebb magyar árak, akciók és kuponok keresése folyamatban</p>
          </div>
        )}

        {/* Search Results */}
        {searchResult && !loading && (
          <div className="space-y-8">
            {/* Results Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div>
                <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Keresési eredmények</span>
                <h2 className="text-2xl font-black text-slate-900 mt-0.5">"{searchResult.query}"</h2>
                <p className="text-xs text-slate-500 mt-1">Összesen {filteredOffers.length} ajánlat talált a magyar webshopokban</p>
              </div>

              {/* Filters & Sorting Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Shop Filter */}
                <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <select
                    value={selectedShop}
                    onChange={(e) => setSelectedShop(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="all">Minden webshop</option>
                    {uniqueShops.map((shop, idx) => (
                      <option key={idx} value={shop}>{shop}</option>
                    ))}
                  </select>
                </div>

                {/* Sort By */}
                <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  <ArrowUpDown className="w-4 h-4 text-slate-500" />
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="price_asc">Legolcsóbb először</option>
                    <option value="discount_desc">Legnagyobb kedvezmény</option>
                    <option value="rating_desc">Legjobb értékelés</option>
                  </select>
                </div>
              </div>
            </div>

            {/* AI Buying Tip */}
            {searchResult.aiBuyingTip && (
              <div className="bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200/60 p-5 rounded-2xl flex items-start space-x-4">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-rose-950 text-sm mb-1">ÁrVadász Szakértői Tipp</h4>
                  <p className="text-xs sm:text-sm text-rose-900/80 leading-relaxed">{searchResult.aiBuyingTip}</p>
                </div>
              </div>
            )}

            {/* Offers List */}
            {filteredOffers.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                <p className="text-slate-600 font-medium">Nincs találat a megadott szűrők alapján.</p>
                <button
                  onClick={() => { setSelectedShop('all'); setMaxPrice(''); }}
                  className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Szűrők törlése
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredOffers.map((offer, index) => {
                  const isCompared = compareList.some(item => item.id === offer.id);
                  return (
                    <div 
                      key={offer.id || index}
                      className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-lg transition-all flex flex-col md:flex-row items-stretch gap-6"
                    >
                      {/* Product Image */}
                      <div className="w-full md:w-48 h-48 bg-slate-100 rounded-xl overflow-hidden relative shrink-0">
                        <img 
                          src={offer.imageUrl} 
                          alt={offer.productName} 
                          className="w-full h-full object-cover"
                        />
                        {offer.discountPercent > 0 && (
                          <div className="absolute top-2 left-2 bg-rose-600 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow-xs">
                            -{offer.discountPercent}%
                          </div>
                        )}
                        <div className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[11px] font-semibold px-2 py-0.5 rounded">
                          {offer.shopName}
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full">
                              {offer.shopName}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${offer.inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                {offer.inStock ? '✓ Készleten' : '⚠ Rendelésre'}
                              </span>
                            </div>
                          </div>

                          <h3 className="text-lg font-bold text-slate-900 mb-2">
                            {offer.productName}
                          </h3>

                          <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                            {offer.description}
                          </p>

                          {/* Specs tags */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {Object.entries(offer.specs || {}).map(([key, val], idx) => (
                              <span key={idx} className="text-[11px] bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-medium">
                                <strong className="text-slate-900">{key}:</strong> {val}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Bottom Bar: Rating, Shipping, Coupon */}
                        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
                          <div className="flex items-center space-x-4 text-xs text-slate-500">
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                              <span className="font-bold text-slate-800">{offer.rating}</span>
                              <span>({offer.reviewCount})</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-slate-400">Szállítás:</span>
                              <span className="font-semibold text-slate-700">+{formatHuf(offer.shippingCostHuf)}</span>
                            </div>
                          </div>

                          {/* Coupon badge if available */}
                          {offer.couponCode && (
                            <div className="flex items-center space-x-1.5 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl text-amber-800 text-xs font-bold">
                              <span>Kupon: {offer.couponCode}</span>
                              <button 
                                onClick={() => copyCouponCode(offer.couponCode!)}
                                className="p-1 hover:bg-amber-200/50 rounded transition-colors"
                                title="Kupon kód másolása"
                              >
                                {copiedCoupon === offer.couponCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-amber-700" />}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Pricing & CTA Actions */}
                      <div className="flex flex-col justify-between items-end border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 shrink-0">
                        <div className="text-right">
                          {offer.originalPriceHuf > offer.currentPriceHuf && (
                            <span className="text-xs text-slate-400 line-through block font-medium">
                              {formatHuf(offer.originalPriceHuf)}
                            </span>
                          )}
                          <div className="text-2xl font-black text-rose-600">
                            {formatHuf(offer.currentPriceHuf)}
                          </div>
                          <span className="text-[11px] text-slate-500 block">bruttó áfaival</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col space-y-2 w-full mt-4">
                          <a
                            href={offer.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-rose-600/20 text-center"
                          >
                            <span>Tovább a boltba</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setActiveHistoryOffer(offer)}
                              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-3 rounded-xl text-[11px] flex items-center justify-center space-x-1 transition-colors"
                              title="Ártörténet"
                            >
                              <BarChart2 className="w-3.5 h-3.5 text-slate-500" />
                              <span>Ártörténet</span>
                            </button>

                            <button
                              onClick={() => setAlertModalOffer(offer)}
                              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-3 rounded-xl text-[11px] flex items-center justify-center space-x-1 transition-colors"
                              title="Árértesítő"
                            >
                              <Bell className="w-3.5 h-3.5 text-slate-500" />
                              <span>Figyelő</span>
                            </button>
                          </div>

                          <button
                            onClick={() => toggleCompare(offer)}
                            className={`w-full py-1.5 px-3 rounded-xl text-[11px] font-semibold border transition-all ${isCompared ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                          >
                            {isCompared ? '✓ Összehasonlítva' : '+ Összehasonlítás'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Price History Modal */}
      {activeHistoryOffer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setActiveHistoryOffer(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">{activeHistoryOffer.shopName}</span>
            <h3 className="text-lg font-bold text-slate-900 mt-1 mb-4">{activeHistoryOffer.productName}</h3>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6">
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-3 flex items-center space-x-1.5">
                <BarChart2 className="w-4 h-4 text-rose-600" />
                <span>30 napos ártörténet</span>
              </h4>
              <div className="space-y-3">
                {activeHistoryOffer.priceHistory?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{item.date}</span>
                    <span className="font-bold text-slate-900">{formatHuf(item.price)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveHistoryOffer(null)}
                className="bg-slate-900 text-white text-xs font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Bezárás
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Price Alert Modal */}
      {alertModalOffer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setAlertModalOffer(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <Bell className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-1">Árértesítő beállítása</h3>
            <p className="text-xs text-slate-500 mb-6">Értesítünk e-mailben, ha ennek a terméknek az ára csökken ebben a boltban: <strong className="text-slate-800">{alertModalOffer.shopName}</strong></p>

            {alertSuccessMsg ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold text-center">
                {alertSuccessMsg}
              </div>
            ) : (
              <form onSubmit={handleSetAlert} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">E-mail címed</label>
                  <input
                    type="email"
                    required
                    value={alertEmail}
                    onChange={(e) => setAlertEmail(e.target.value)}
                    placeholder="pelda@email.hu"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Célár (opcionális)</label>
                  <input
                    type="number"
                    value={alertTargetPrice}
                    onChange={(e) => setAlertTargetPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={`Jelenlegi ár: ${alertModalOffer.currentPriceHuf} Ft`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-md shadow-rose-600/20"
                >
                  Árértesítő aktiválása
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowCompareModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-2">Termékek összehasonlítása</h3>
            <p className="text-xs text-slate-500 mb-6">Egyszerre legfeljebb 4 ajánlat részletes összevetése</p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
              {compareList.map((item) => (
                <div key={item.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded">
                        {item.shopName}
                      </span>
                      <button
                        onClick={() => setCompareList(compareList.filter(c => c.id !== item.id))}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <img src={item.imageUrl} alt={item.productName} className="w-full h-32 object-cover rounded-xl mb-3" />
                    <h4 className="font-bold text-slate-900 text-sm mb-2 line-clamp-2">{item.productName}</h4>

                    <div className="mb-4">
                      <span className="text-lg font-black text-rose-600 block">{formatHuf(item.currentPriceHuf)}</span>
                      <span className="text-xs text-slate-500">Szállítás: +{formatHuf(item.shippingCostHuf)}</span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-200 pt-3">
                      <div className="flex justify-between">
                        <span>Értékelés:</span>
                        <strong className="text-slate-800">⭐ {item.rating}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Készlet:</span>
                        <strong className={item.inStock ? 'text-emerald-600' : 'text-amber-600'}>{item.inStock ? 'Van' : 'Rendelésre'}</strong>
                      </div>
                    </div>
                  </div>

                  <a
                    href={item.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs text-center transition-colors"
                  >
                    Megtekintés
                  </a>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowCompareModal(false)}
                className="bg-slate-900 text-white text-xs font-semibold px-6 py-2.5 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Bezárás
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-lg">ÁrVadász</span>
              <p className="text-xs text-slate-500">A magyar vásárlók okos árkollégája</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 text-center sm:text-right">
            © 2026 ÁrVadász Magyarország. Minden jog fenntartva. Valós idejű webshop árak.
          </p>
        </div>
      </footer>
    </div>
  );
}
