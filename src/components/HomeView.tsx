import React from 'react';
import { Charity, MonthlyDraw } from '../types';
import { 
  Heart, 
  Award, 
  TrendingUp, 
  ShieldCheck, 
  ArrowRight, 
  Users, 
  Calendar, 
  Check, 
  Sparkles,
  Target
} from 'lucide-react';

interface HomeViewProps {
  charities: Charity[];
  latestDraw?: MonthlyDraw;
  onOpenSubscribe: () => void;
  onOpenCharities: () => void;
  onOpenDraws: () => void;
  onOpenAuth: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  charities,
  latestDraw,
  onOpenSubscribe,
  onOpenCharities,
  onOpenDraws,
  onOpenAuth,
}) => {
  const featuredCharities = charities.filter((c) => c.featured).slice(0, 3);
  const totalRaisedSum = charities.reduce((acc, c) => acc + (c.totalRaised || 0), 0);

  return (
    <div id="digital-heroes-homepage" className="text-[#E8EAE6]">
      
      {/* 1. HERO SECTION: "FEEL, NOT FAIRWAY" */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 border-b border-[#233126]">
        {/* Subtle warm architectural texture */}
        <div className="absolute inset-0 bg-[#0f1411] opacity-90 -z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-3xl">
            {/* PRD Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1b2b20] border border-[#304e39] text-[#8ce2a3] text-xs font-semibold uppercase tracking-widest mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>The Movement In Motion · 2026 Edition</span>
            </div>

            {/* Headline */}
            <h1 className="font-serif text-4xl sm:text-6xl font-extrabold text-[#F4F6F2] tracking-tight leading-[1.12]">
              Play with Purpose.<br />
              <span className="text-[#8ee2a5]">Win Together.</span><br />
              Fund Real Change.
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-[#95a698] mt-6 leading-relaxed max-w-2xl">
              Digital Heroes is the subscription-driven performance and prize-draw platform where every Stableford score you record unlocks monthly community jackpots while directly funding youth, veteran, and environmental charities.
            </p>

            {/* Call to Actions */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                id="hero-subscribe-cta-btn"
                onClick={onOpenSubscribe}
                className="py-3.5 px-7 rounded-xl bg-[#274832] hover:bg-[#345f42] text-[#f2faf4] font-semibold text-sm transition border border-[#447854] shadow-lg flex items-center justify-center gap-2 group"
              >
                <span>Subscribe & Enter Next Draw</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </button>

              <button
                id="hero-explore-charities-btn"
                onClick={onOpenCharities}
                className="py-3.5 px-6 rounded-xl bg-[#141b16] hover:bg-[#1a241d] text-[#b8c7bd] font-medium text-sm transition border border-[#2b3a2f] text-center"
              >
                Explore {charities.length} Causes
              </button>
            </div>

            {/* Proof metrics bar */}
            <div className="mt-12 pt-8 border-t border-[#233327] grid grid-cols-3 gap-6 text-xs">
              <div>
                <span className="text-[#718575] uppercase font-mono block">Direct Impact</span>
                <span className="font-mono text-lg sm:text-xl font-bold text-[#8ce2a3]">
                  ${totalRaisedSum.toLocaleString()}+
                </span>
                <span className="text-[11px] text-[#8e9f92] block">Funded to Charities</span>
              </div>
              <div>
                <span className="text-[#718575] uppercase font-mono block">Min Contribution</span>
                <span className="font-mono text-lg sm:text-xl font-bold text-[#f1f6f2]">10% Guaranteed</span>
                <span className="text-[11px] text-[#8e9f92] block">Every Subscription</span>
              </div>
              <div>
                <span className="text-[#718575] uppercase font-mono block">Prize Jackpots</span>
                <span className="font-mono text-lg sm:text-xl font-bold text-amber-300">Rollover 5-Match</span>
                <span className="text-[11px] text-[#8e9f92] block">Server-Audited Draw</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 2. THE THREE PILLARS (WHAT USERS DO, HOW THEY WIN, CHARITY IMPACT) */}
      <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs uppercase font-mono text-emerald-400 tracking-widest">Platform Workflow</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#F4F6F2] mt-2">
            How Digital Heroes Operates
          </h2>
          <p className="text-sm text-[#8fa092] mt-2">
            A harmonious circle of performance improvement, transparent gaming, and non-profit support.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Step 1 */}
          <div className="p-8 rounded-xl bg-[#141c16] border border-[#2b3c2f] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#1d2b20] border border-[#35523d] flex items-center justify-center text-emerald-400 mb-6">
                <Target className="w-6 h-6" />
              </div>
              <span className="font-mono text-xs text-[#718676] uppercase">01 · Log Your Rounds</span>
              <h3 className="font-serif text-xl font-bold text-[#f2f6f3] mt-2 mb-3">
                Score Management
              </h3>
              <p className="text-xs text-[#90a294] leading-relaxed">
                Log your latest Stableford scores (1–45 points). Our system maintains your most recent 5 scores in rolling reverse chronological order, cleanly swapping out the oldest score with each fresh round.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#223026] text-[11px] text-[#788e7f]">
              ✓ Strict 1 score per date rule
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-8 rounded-xl bg-[#141c16] border border-[#2b3c2f] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#1d2b20] border border-[#35523d] flex items-center justify-center text-rose-300 mb-6">
                <Heart className="w-6 h-6" />
              </div>
              <span className="font-mono text-xs text-[#718676] uppercase">02 · Choose Your Cause</span>
              <h3 className="font-serif text-xl font-bold text-[#f2f6f3] mt-2 mb-3">
                Seamless Charity Impact
              </h3>
              <p className="text-xs text-[#90a294] leading-relaxed">
                Choose the foundation you wish to empower. A minimum of 10% of your subscription fee goes directly to their mission, with the option to voluntarily elevate your contribution.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#223026] text-[11px] text-[#788e7f]">
              ✓ Direct non-profit receipts
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-8 rounded-xl bg-[#141c16] border border-[#2b3c2f] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#1d2b20] border border-[#35523d] flex items-center justify-center text-amber-300 mb-6">
                <Award className="w-6 h-6" />
              </div>
              <span className="font-mono text-xs text-[#718676] uppercase">03 · Community Draws</span>
              <h3 className="font-serif text-xl font-bold text-[#f2f6f3] mt-2 mb-3">
                Monthly Prize Pool
              </h3>
              <p className="text-xs text-[#90a294] leading-relaxed">
                At the end of every month, your active 5 scores are checked against the drawn numbers. Match 3, 4, or 5 numbers for equal tier shares. Unclaimed 5-number jackpots roll over indefinitely!
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#223026] text-[11px] text-[#788e7f]">
              ✓ Server-side deterministic audit
            </div>
          </div>

        </div>

      </section>

      {/* 3. FEATURED CHARITY SPOTLIGHT (PRD § 08.2) */}
      <section className="py-16 bg-[#121814] border-y border-[#233126]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-12">
            <div>
              <span className="text-xs uppercase font-mono text-emerald-400 tracking-widest">Philanthropic Partners</span>
              <h2 className="font-serif text-3xl font-bold text-[#F4F6F2] mt-1">
                Featured Cause Spotlight
              </h2>
            </div>
            <button
              onClick={onOpenCharities}
              className="text-xs font-semibold text-[#8ee2a5] hover:underline flex items-center gap-1"
            >
              <span>View All Registered Charities</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredCharities.map((charity) => (
              <div
                key={charity.id}
                className="bg-[#151c17] border border-[#2b3c2e] rounded-xl overflow-hidden shadow-md flex flex-col justify-between group"
              >
                <div className="h-44 relative overflow-hidden bg-[#1f2a22]">
                  {charity.imageUrl && (
                    <img
                      src={charity.imageUrl}
                      alt={charity.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#151c17] to-transparent" />
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-[#101512]/90 border border-[#2b3a2f] text-[10px] font-mono text-[#8ee2a5]">
                    {charity.category}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#F4F6F2]">{charity.name}</h3>
                    <p className="text-xs text-[#8f9f92] mt-1.5 line-clamp-2">{charity.tagline}</p>
                    
                    <div className="mt-4 p-2.5 rounded bg-[#101512] border border-[#243327] flex justify-between text-xs">
                      <span className="text-[#738879]">Total Raised:</span>
                      <span className="font-mono text-emerald-400 font-bold">${charity.totalRaised?.toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={onOpenCharities}
                    className="mt-4 w-full py-2 rounded-lg bg-[#1a241d] hover:bg-[#233127] border border-[#2c3d31] text-xs text-[#d5e0d7] transition"
                  >
                    View Events & Details
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 4. DRAW MECHANICS SUMMARY & CTA */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-3xl mx-auto bg-[#151d18] border border-[#2e4033] rounded-2xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e2e23] border border-[#35523e] text-[#8ce2a3] text-xs font-semibold mb-4">
            <Award className="w-3.5 h-3.5" />
            <span>Auditable Prize Distribution</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#F4F6F2]">
            Ready to become a Digital Hero?
          </h2>
          <p className="text-xs sm:text-sm text-[#90a294] mt-3 max-w-xl mx-auto">
            Choose either monthly ($29) or annual ($290) membership. Your registration immediately directs funds to your selected non-profit and activates your Stableford score card.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-3">
            <button
              id="cta-join-now-btn"
              onClick={onOpenSubscribe}
              className="w-full sm:w-auto py-3 px-8 rounded-xl bg-[#274832] hover:bg-[#345f42] text-[#f2faf4] font-bold text-sm transition border border-[#447854] shadow-lg"
            >
              Start Your Subscription
            </button>
            <button
              onClick={onOpenDraws}
              className="w-full sm:w-auto py-3 px-6 rounded-xl bg-[#111713] hover:bg-[#18211a] text-[#a0b0a3] text-xs font-medium transition border border-[#2b3a2f]"
            >
              Learn Draw Math & Rollovers
            </button>
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="border-t border-[#212c24] bg-[#0e1310] py-12 text-xs text-[#718376]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <div className="font-serif font-bold text-[#dbe2dc] text-sm flex items-center gap-1.5">
              <span>digital</span>
              <span className="text-[#88dd9e] uppercase text-xs tracking-widest font-sans">.Heroes</span>
            </div>
            <p className="mt-1">A golf performance, charity and monthly prize-draw platform brief · Edition 2026</p>
          </div>

          <div className="text-right sm:text-right">
            <div>Author: <span className="text-[#e2e8e4] font-semibold">Ayush Ranjan</span></div>
            <div className="text-[11px] text-[#5d6f62] mt-0.5">Vercel & Firebase Production Architecture</div>
          </div>
        </div>
      </footer>

    </div>
  );
};
