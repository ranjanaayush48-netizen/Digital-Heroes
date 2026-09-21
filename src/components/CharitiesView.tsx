import React, { useState } from 'react';
import { Charity, DonationRecord } from '../types';
import { recordDonation } from '../lib/charityService';
import { Search, Heart, MapPin, Calendar, ExternalLink, ArrowRight, DollarSign, Check, X, Sparkles } from 'lucide-react';
import { useAuth } from '../lib/authContext';

interface CharitiesViewProps {
  charities: Charity[];
  onSelectCharity?: (charityId: string) => void;
  onRefresh?: () => void;
}

export const CharitiesView: React.FC<CharitiesViewProps> = ({ charities, onSelectCharity, onRefresh }) => {
  const { currentUser, userProfile, updateUserCharity } = useAuth();
  
  // Track local contribution percentage for each charity card independently
  const [localPercents, setLocalPercents] = useState<Record<string, number>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeCharityModal, setActiveCharityModal] = useState<Charity | null>(null);
  
  // Independent Donation Modal State
  const [donateModalCharity, setDonateModalCharity] = useState<Charity | null>(null);
  const [donationAmount, setDonationAmount] = useState<number>(25);
  const [donorName, setDonorName] = useState(userProfile?.displayName || '');
  const [donorEmail, setDonorEmail] = useState(userProfile?.email || '');
  const [donationMsg, setDonationMsg] = useState('');
  const [donationSubmitting, setDonationSubmitting] = useState(false);
  const [donationSuccess, setDonationSuccess] = useState(false);

  // Extract unique categories
  const categories = ['All', ...Array.from(new Set(charities.map((c) => c.category)))];

  const filteredCharities = charities.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleMakeIndependentDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donateModalCharity) return;
    setDonationSubmitting(true);
    try {
      await recordDonation(
        donateModalCharity.id,
        donateModalCharity.name,
        donationAmount,
        donorName || 'Anonymous Hero',
        donorEmail || 'anonymous@donor.org',
        donationMsg,
        currentUser?.uid
      );
      setDonationSuccess(true);
      if (onRefresh) onRefresh();
      setTimeout(() => {
        setDonationSuccess(false);
        setDonateModalCharity(null);
      }, 1800);
    } catch (err) {
      console.error('Donation failed:', err);
    } finally {
      setDonationSubmitting(false);
    }
  };

  const handleSetPrimaryCharity = async (charityId: string, percent: number) => {
    if (!currentUser) return;
    try {
      await updateUserCharity(charityId, percent);
      alert('Subscription contribution settings updated!');
    } catch (err) {
      console.error('Failed to update charity:', err);
    }
  };

  return (
    <div id="charities-directory" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 text-[#E8EAE6]">
      
      {/* Header */}
      <div className="max-w-3xl mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1b2b20] border border-[#324f3b] text-[#8ae0a0] text-xs font-semibold uppercase tracking-wider mb-4">
          <Heart className="w-3.5 h-3.5" />
          <span>Section 08 · Charity System & Directory</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#F4F6F2] tracking-tight">
          Where Every Swing Creates Real Impact
        </h1>
        <p className="text-sm sm:text-base text-[#91a094] mt-2.5">
          Digital Heroes subscribers direct at least 10% of their subscription fee to featured non-profit partners. Explore our causes, review upcoming community events, or make an independent direct gift.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center pb-6 border-b border-[#28362c] mb-8">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#6e8073] absolute left-3.5 top-3.5" />
          <input
            id="charity-search-input"
            type="text"
            placeholder="Search by cause, name, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#141b16] border border-[#2b3a2f] rounded-lg text-sm text-[#eef3f0] placeholder-[#647668] focus:outline-none focus:border-[#4f8a60]"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              id={`filter-category-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-[#274531] text-[#ebf8ef] border border-[#447653]'
                  : 'bg-[#151c17] text-[#8c9c90] hover:text-[#e8eae6] border border-[#263529]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Charities Grid */}
      {filteredCharities.length === 0 ? (
        <div className="p-12 text-center bg-[#141b16] rounded-xl border border-[#27372b]">
          <p className="text-sm text-[#87998b]">No charities match your search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCharities.map((charity) => {
            const isUserSelected = userProfile?.selectedCharityId === charity.id;
            
            // Get percentage for this card: 
            // Priority: Local pending state > User's current profile percentage > Default 10
            const currentPercent = localPercents[charity.id] ?? (isUserSelected ? userProfile?.charityContributionPercent : 10) ?? 10;

            return (
              <div
                key={charity.id}
                id={`charity-card-${charity.id}`}
                className="bg-[#151c17] border border-[#2c3d31] hover:border-[#405a47] rounded-xl overflow-hidden flex flex-col transition shadow-md group"
              >
                {/* Photo Banner */}
                <div className="h-44 w-full relative overflow-hidden bg-[#1e2821]">
                  {charity.imageUrl ? (
                    <img
                      src={charity.imageUrl}
                      alt={charity.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#18231c] text-[#5e7766]">
                      <Heart className="w-10 h-10 stroke-1" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#151c17] via-transparent to-black/30" />

                  {/* Category Pill */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-[#101712]/90 backdrop-blur-sm border border-[#2c3d31] text-[11px] font-medium text-[#a7ebb9]">
                    {charity.category}
                  </div>

                  {charity.featured && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-[#352c1a]/90 border border-[#6b582b] text-[10px] font-bold text-[#f5d78e] uppercase tracking-wider">
                      Featured Cause
                    </div>
                  )}

                  {isUserSelected && (
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded bg-[#203a27] border border-[#3e6b4a] text-xs font-semibold text-[#8ce2a3] flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Your Active Choice
                    </div>
                  )}
                </div>

                {/* Body Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#F4F6F2] leading-snug">
                      {charity.name}
                    </h3>
                    <p className="text-xs text-[#8f9f92] mt-1.5 line-clamp-2">
                      {charity.tagline}
                    </p>

                    {/* Impact Metric & Total Raised */}
                    <div className="grid grid-cols-2 gap-2 my-4 p-3 rounded-lg bg-[#111713] border border-[#233127] text-xs">
                      <div>
                        <span className="text-[10px] text-[#718476] uppercase tracking-wider block">Raised to Date</span>
                        <span className="font-mono text-sm font-bold text-[#8ee2a5]">
                          ${charity.totalRaised?.toLocaleString() || '0'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#718476] uppercase tracking-wider block">
                          {charity.impactMetric?.label || 'Supporters'}
                        </span>
                        <span className="font-mono text-sm font-semibold text-[#e1e9e3]">
                          {charity.impactMetric?.value || charity.supporterCount?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-[#233127] space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        id={`view-profile-${charity.id}`}
                        onClick={() => setActiveCharityModal(charity)}
                        className="flex-1 py-2 px-3 rounded-lg bg-[#1b251e] hover:bg-[#233027] border border-[#2f4033] text-xs font-medium text-[#dce4de] transition text-center"
                      >
                        Read Profile & Events
                      </button>
                      <button
                        id={`donate-btn-${charity.id}`}
                        onClick={() => setDonateModalCharity(charity)}
                        className="py-2 px-3 rounded-lg bg-[#274631] hover:bg-[#325a40] text-xs font-medium text-[#eef9f2] transition flex items-center gap-1"
                        title="Independent direct gift"
                      >
                        <Heart className="w-3.5 h-3.5 text-rose-300" />
                        <span>Gift</span>
                      </button>
                    </div>

                    {currentUser && (
                      <div className="pt-2 space-y-2">
                        <div className="flex justify-between items-center text-[10px] text-[#8f9f92]">
                          <span>Your Contribution</span>
                          <span className="font-mono text-[#8ce2a3] font-bold">{currentPercent}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="5"
                          value={currentPercent}
                          onChange={(e) => setLocalPercents(prev => ({ ...prev, [charity.id]: Number(e.target.value) }))}
                          className="w-full h-1.5 bg-[#1a251e] rounded-lg appearance-none cursor-pointer accent-[#4f8a60]"
                        />
                        <button
                          id={`set-primary-${charity.id}`}
                          onClick={() => handleSetPrimaryCharity(charity.id, currentPercent)}
                          className={`w-full py-2 rounded-lg text-xs font-semibold transition ${
                            isUserSelected 
                              ? 'bg-[#1b2b20] text-[#8ae0a0] border border-[#324f3b] hover:bg-[#233829]' 
                              : 'bg-[#274631] text-[#eef9f2] hover:bg-[#325a40]'
                          }`}
                        >
                          {isUserSelected ? 'Update Contribution' : 'Select for Subscription'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Charity Detail Modal */}
      {activeCharityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0d0b]/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#151c17] border border-[#2f4033] rounded-xl shadow-2xl p-6 text-[#E8EAE6] relative">
            <button
              onClick={() => setActiveCharityModal(null)}
              className="absolute top-5 right-5 text-[#88988c] hover:text-[#f2f6f3] transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="px-2.5 py-1 rounded bg-[#203125] border border-[#35503d] text-[11px] font-medium text-[#8fe2a4]">
                {activeCharityModal.category}
              </span>
              <h2 className="font-serif text-2xl font-bold text-[#F4F6F2] mt-2">
                {activeCharityModal.name}
              </h2>
              <p className="text-xs text-[#8e9e91] mt-1">{activeCharityModal.tagline}</p>
            </div>

            {activeCharityModal.imageUrl && (
              <div className="h-52 w-full rounded-lg overflow-hidden my-4 border border-[#2a3a2e]">
                <img
                  src={activeCharityModal.imageUrl}
                  alt={activeCharityModal.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="space-y-4 text-xs text-[#cdd8d1] leading-relaxed">
              <div>
                <h4 className="font-serif text-sm font-bold text-[#e6ede8] mb-1">Our Mission</h4>
                <p className="text-[#98a99c]">{activeCharityModal.mission}</p>
              </div>

              <div>
                <h4 className="font-serif text-sm font-bold text-[#e6ede8] mb-1">About the Cause</h4>
                <p className="text-[#98a99c]">{activeCharityModal.description}</p>
              </div>

              {/* Upcoming Events Section (Golf Days etc. as requested by PRD §08) */}
              <div>
                <h4 className="font-serif text-sm font-bold text-[#e6ede8] mb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  Upcoming Charity Events & Golf Days
                </h4>
                {activeCharityModal.upcomingEvents && activeCharityModal.upcomingEvents.length > 0 ? (
                  <div className="space-y-2">
                    {activeCharityModal.upcomingEvents.map((evt) => (
                      <div key={evt.id} className="p-3 rounded-lg bg-[#111612] border border-[#263529]">
                        <div className="flex items-center justify-between font-semibold text-[#f1f5f2]">
                          <span>{evt.title}</span>
                          <span className="font-mono text-[11px] text-emerald-400">{evt.date}</span>
                        </div>
                        <div className="text-[11px] text-[#788e7e] flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          <span>{evt.location}</span>
                        </div>
                        <p className="text-[11px] text-[#93a697] mt-1.5">{evt.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#7d9081]">No upcoming events announced for this period.</p>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#26362a] flex items-center justify-between">
              {activeCharityModal.website && (
                <a
                  href={activeCharityModal.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#8ee2a5] hover:underline flex items-center gap-1"
                >
                  Visit Official Website <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setDonateModalCharity(activeCharityModal);
                    setActiveCharityModal(null);
                  }}
                  className="py-2 px-4 rounded-lg bg-[#274631] hover:bg-[#345d41] text-xs font-semibold text-[#eaf7ee] transition"
                >
                  Make Independent Donation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Independent Donation Modal (PRD § 08.1: "Independent donation option, not tied to gameplay") */}
      {donateModalCharity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0d0b]/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#161c18] border border-[#2e3e32] rounded-xl shadow-2xl p-6 text-[#E8EAE6] relative">
            <button
              onClick={() => setDonateModalCharity(null)}
              className="absolute top-5 right-5 text-[#88988c] hover:text-[#f2f6f3] transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#8ce2a3]">Independent Philanthropy</span>
              <h3 className="font-serif text-xl font-bold text-[#f2f6f3] mt-1">
                Direct Gift to {donateModalCharity.name}
              </h3>
              <p className="text-xs text-[#8f9e92] mt-1">
                100% of this one-off gift goes directly to the charity foundation. Not tied to gameplay or subscriptions.
              </p>
            </div>

            {donationSuccess ? (
              <div className="p-6 rounded-lg bg-[#182b1e] border border-[#3b5e45] text-center space-y-2">
                <Check className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="font-serif text-base font-bold text-[#eef7f0]">Thank you for your generosity!</h4>
                <p className="text-xs text-[#a5c2ac]">Your gift of ${donationAmount} has been registered.</p>
              </div>
            ) : (
              <form onSubmit={handleMakeIndependentDonation} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#bac5bd] mb-1.5">
                    Select Contribution Amount (USD)
                  </label>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {[15, 25, 50, 100].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setDonationAmount(amt)}
                        className={`py-2 rounded-lg text-xs font-mono font-bold transition ${
                          donationAmount === amt
                            ? 'bg-[#274631] text-[#e8f7ed] border border-[#4a805c]'
                            : 'bg-[#121614] text-[#93a296] border border-[#2b3a2f] hover:text-white'
                        }`}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-[#738779] absolute left-3 top-3" />
                    <input
                      type="number"
                      min="5"
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(Math.max(5, Number(e.target.value)))}
                      className="w-full pl-9 pr-3 py-2 bg-[#121614] border border-[#2b3a2f] rounded-lg text-sm text-[#f1f5f2] focus:outline-none focus:border-[#4d8a5f]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#bac5bd] mb-1">Donor Name</label>
                  <input
                    type="text"
                    required
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="Your name or organization"
                    className="w-full px-3 py-2 bg-[#121614] border border-[#2b3a2f] rounded-lg text-xs text-[#f1f5f2] focus:outline-none focus:border-[#4d8a5f]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#bac5bd] mb-1">Donor Email</label>
                  <input
                    type="email"
                    required
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    placeholder="receipt@donor.com"
                    className="w-full px-3 py-2 bg-[#121614] border border-[#2b3a2f] rounded-lg text-xs text-[#f1f5f2] focus:outline-none focus:border-[#4d8a5f]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#bac5bd] mb-1">Optional Message of Support</label>
                  <textarea
                    rows={2}
                    value={donationMsg}
                    onChange={(e) => setDonationMsg(e.target.value)}
                    placeholder="A few words for the charity..."
                    className="w-full px-3 py-2 bg-[#121614] border border-[#2b3a2f] rounded-lg text-xs text-[#f1f5f2] focus:outline-none focus:border-[#4d8a5f]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={donationSubmitting}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#274631] hover:bg-[#325a40] text-[#f2faf4] font-medium text-xs transition border border-[#447854] shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {donationSubmitting ? 'Processing Gift...' : `Submit $${donationAmount} Direct Gift`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
