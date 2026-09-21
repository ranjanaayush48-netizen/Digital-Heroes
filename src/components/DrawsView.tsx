import React, { useState } from 'react';
import { MonthlyDraw, DrawType } from '../types';
import { Award, CheckCircle2, ChevronRight, HelpCircle, Shield, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/authContext';

interface DrawsViewProps {
  draws: MonthlyDraw[];
  onOpenSubscribe: () => void;
}

export const DrawsView: React.FC<DrawsViewProps> = ({ draws, onOpenSubscribe }) => {
  const { currentUser, userProfile } = useAuth();
  const [selectedDrawId, setSelectedDrawId] = useState<string>(draws[0]?.id || '');

  const activeDraw = draws.find((d) => d.id === selectedDrawId) || draws[0];

  return (
    <div id="draws-engine-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 text-[#E8EAE6]">
      
      {/* Top Hero / Header */}
      <div className="max-w-3xl mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1b2b20] border border-[#324f3b] text-[#8ae0a0] text-xs font-semibold uppercase tracking-wider mb-4">
          <Award className="w-3.5 h-3.5" />
          <span>Section 06 & 07 · Draw & Prize Engine</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#F4F6F2] tracking-tight">
          Transparent, Community-Funded Prize Draws
        </h1>
        <p className="text-sm sm:text-base text-[#91a094] mt-2.5">
          Each month, a fixed allocation from every active subscriber builds our deterministic community prize pool. Match 3, 4, or all 5 of your latest Stableford scores against the draw numbers.
        </p>
      </div>

      {/* PRD Mechanics Explainer Card */}
      <div className="bg-[#151c17] border border-[#2b3c2f] rounded-xl p-6 sm:p-8 mb-12 shadow-lg">
        <h3 className="font-serif text-xl font-bold text-[#f4f7f4] mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#8ee2a5]" />
          Platform Draw Mechanics & Prize Distribution
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Tier 1: 5-Match */}
          <div className="p-5 rounded-lg bg-[#111713] border border-[#27372b] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-amber-400 font-bold uppercase">Grand Jackpot</span>
                <span className="px-2 py-0.5 rounded bg-[#2e2617] border border-[#544324] text-[10px] text-amber-300 font-semibold">
                  Rollover Active
                </span>
              </div>
              <h4 className="font-serif text-lg font-bold text-[#f2f6f3]">5-Number Match</h4>
              <div className="font-mono text-2xl font-extrabold text-amber-300 my-2">
                40% of Pool
              </div>
              <p className="text-xs text-[#8f9e92] leading-relaxed">
                Match all 5 numbers from your active score card. Split equally among winners. If unclaimed, the entire 40% rolls over to augment next month's jackpot!
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#223026] text-[11px] text-[#718476]">
              ✓ Auditable roll-forward logic
            </div>
          </div>

          {/* Tier 2: 4-Match */}
          <div className="p-5 rounded-lg bg-[#111713] border border-[#27372b] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-emerald-400 font-bold uppercase">Major Tier</span>
                <span className="text-[10px] text-[#788e7e]">Single Month</span>
              </div>
              <h4 className="font-serif text-lg font-bold text-[#f2f6f3]">4-Number Match</h4>
              <div className="font-mono text-2xl font-extrabold text-[#8ce2a3] my-2">
                35% of Pool
              </div>
              <p className="text-xs text-[#8f9e92] leading-relaxed">
                Match any 4 numbers from your submitted score list. Distributed equally across all 4-match subscribers for that month.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#223026] text-[11px] text-[#718476]">
              ✓ Balanced high frequency tier
            </div>
          </div>

          {/* Tier 3: 3-Match */}
          <div className="p-5 rounded-lg bg-[#111713] border border-[#27372b] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-[#9bb3a1] font-bold uppercase">Base Tier</span>
                <span className="text-[10px] text-[#788e7e]">Community Pool</span>
              </div>
              <h4 className="font-serif text-lg font-bold text-[#f2f6f3]">3-Number Match</h4>
              <div className="font-mono text-2xl font-extrabold text-[#c0d4c5] my-2">
                25% of Pool
              </div>
              <p className="text-xs text-[#8f9e92] leading-relaxed">
                Match any 3 numbers from your active golf rounds. High probability community prize split evenly among qualifying players.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#223026] text-[11px] text-[#718476]">
              ✓ Accessible player reward tier
            </div>
          </div>

        </div>

        {/* Algorithm vs Random info */}
        <div className="mt-6 pt-5 border-t border-[#253629] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#8e9f92]">
          <div>
            <span className="text-[#f1f5f2] font-semibold block mb-1">Random Draw Logic:</span>
            Standard unbiased pseudo-random selection drawn from numbers 1 to 45 with cryptographic entropy.
          </div>
          <div>
            <span className="text-[#f1f5f2] font-semibold block mb-1">Algorithmic Draw Logic:</span>
            Laplace-smoothed score frequency weighting. Numbers hit more frequently by active members carry proportional weight while preserving fairness.
          </div>
        </div>
      </div>

      {/* Draw History Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Draw selector */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-[#8b9c8e] mb-2">
            Published Draws History
          </h3>
          {draws.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDrawId(d.id)}
              className={`w-full p-4 rounded-xl border text-left transition flex items-center justify-between ${
                activeDraw?.id === d.id
                  ? 'bg-[#1e2921] border-[#44664f] text-[#f2f7f4] shadow-md'
                  : 'bg-[#141b16] border-[#29382d] text-[#8e9f92] hover:bg-[#18221b] hover:text-[#d3ded6]'
              }`}
            >
              <div>
                <div className="font-serif font-bold text-sm text-[#f1f5f2]">{d.title}</div>
                <div className="text-xs text-[#718676] mt-0.5 flex items-center gap-2">
                  <span>{d.drawDate}</span>
                  <span>·</span>
                  <span className="capitalize">{d.drawMethod} Method</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#5e7766]" />
            </button>
          ))}

          {!currentUser && (
            <div className="p-5 rounded-xl bg-[#19241c] border border-[#2f4635] text-xs text-[#9eb6a4] mt-6">
              <h4 className="font-bold text-[#f1f7f2] mb-1">Want to participate in next month's draw?</h4>
              <p className="mb-3 text-[#879d8d]">Subscribe today, log your last 5 Stableford scores, and support a cause.</p>
              <button
                onClick={onOpenSubscribe}
                className="w-full py-2 px-3 rounded-lg bg-[#274832] hover:bg-[#345e41] text-xs font-semibold text-white transition"
              >
                Join & Subscribe Now
              </button>
            </div>
          )}
        </div>

        {/* Right: Active Draw Details */}
        <div className="lg:col-span-8">
          {activeDraw ? (
            <div className="bg-[#151c17] border border-[#2b3c2f] rounded-xl p-6 sm:p-8 shadow-xl space-y-8">
              
              {/* Draw Title banner */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 border-b border-[#253528]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded bg-[#203125] border border-[#37523f] text-[11px] font-mono text-[#8ce2a3]">
                      Status: {activeDraw.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-[#7d9082]">
                      Drawn on {activeDraw.drawDate}
                    </span>
                  </div>
                  <h2 className="font-serif text-2xl font-bold text-[#F4F6F2]">
                    {activeDraw.title}
                  </h2>
                </div>

                <div className="sm:text-right">
                  <span className="text-[11px] uppercase tracking-wider text-[#798e7e] block">Total Prize Pool</span>
                  <span className="font-mono text-2xl font-bold text-[#8ee2a5]">
                    ${activeDraw.totalPrizePool.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-[#718475] block">
                    From {activeDraw.activeSubscribersCount} active subscribers
                  </span>
                </div>
              </div>

              {/* Winning Numbers Row */}
              <div>
                <span className="text-xs font-semibold text-[#8f9f92] uppercase tracking-wider block mb-3">
                  Official 5 Drawn Winning Numbers (1–45)
                </span>
                <div className="flex flex-wrap gap-3">
                  {activeDraw.winningNumbers.map((num, idx) => (
                    <div
                      key={idx}
                      className="w-14 h-14 rounded-xl bg-[#1d2b20] border-2 border-[#41694d] flex items-center justify-center font-mono text-xl font-black text-[#8ce2a3] shadow-inner"
                    >
                      {num}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tier Results & Winners Breakdown */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8f9f92]">
                  Prize Tier Allocations & Results
                </h4>

                {/* 5-Match Card */}
                <div className="p-4 rounded-lg bg-[#111713] border border-[#27372b]">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                      <span className="font-bold text-sm text-[#f1f5f2]">5-Number Match Tier (40%)</span>
                    </div>
                    <div className="font-mono text-xs text-amber-300">
                      Total Available: ${activeDraw.tiers.fiveMatch.totalAvailable.toLocaleString()} 
                      {activeDraw.jackpotRolloverIn > 0 && ` (includes $${activeDraw.jackpotRolloverIn} rollover)`}
                    </div>
                  </div>

                  <div className="text-xs text-[#8f9f92]">
                    {activeDraw.tiers.fiveMatch.winnersCount === 0 ? (
                      <div className="p-3 rounded bg-[#1c1813] border border-[#3b301c] text-amber-200/90">
                        No 5-number matches this month. The entire jackpot of <strong>${activeDraw.tiers.fiveMatch.totalAvailable.toLocaleString()}</strong> rolls over to augment next month's pool!
                      </div>
                    ) : (
                      <div>
                        {activeDraw.tiers.fiveMatch.winnersCount} {activeDraw.tiers.fiveMatch.winnersCount === 1 ? 'winner' : 'winners'} matched 5 numbers, sharing ${activeDraw.tiers.fiveMatch.payoutPerWinner.toLocaleString()} each.
                      </div>
                    )}
                  </div>
                </div>

                {/* 4-Match Card */}
                <div className="p-4 rounded-lg bg-[#111713] border border-[#27372b]">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#8ee2a5]"></span>
                      <span className="font-bold text-sm text-[#f1f5f2]">4-Number Match Tier (35%)</span>
                    </div>
                    <div className="font-mono text-xs text-[#8ee2a5]">
                      Total Pool: ${activeDraw.tiers.fourMatch.totalAvailable.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-xs text-[#8f9f92]">
                    {activeDraw.tiers.fourMatch.winnersCount === 0 ? (
                      <span>No qualifying 4-number matches recorded.</span>
                    ) : (
                      <div>
                        {activeDraw.tiers.fourMatch.winnersCount} {activeDraw.tiers.fourMatch.winnersCount === 1 ? 'winner' : 'winners'} matched 4 numbers, sharing ${activeDraw.tiers.fourMatch.payoutPerWinner.toLocaleString()} each.
                      </div>
                    )}
                  </div>
                </div>

                {/* 3-Match Card */}
                <div className="p-4 rounded-lg bg-[#111713] border border-[#27372b]">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#a3b8a8]"></span>
                      <span className="font-bold text-sm text-[#f1f5f2]">3-Number Match Tier (25%)</span>
                    </div>
                    <div className="font-mono text-xs text-[#a3b8a8]">
                      Total Pool: ${activeDraw.tiers.threeMatch.totalAvailable.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-xs text-[#8f9f92]">
                    {activeDraw.tiers.threeMatch.winnersCount} {activeDraw.tiers.threeMatch.winnersCount === 1 ? 'winner' : 'winners'} matched 3 numbers, sharing ${activeDraw.tiers.threeMatch.payoutPerWinner.toLocaleString()} each.
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-[#151c17] rounded-xl border border-[#29392e]">
              <p className="text-[#7d9082]">No active draw selected.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
