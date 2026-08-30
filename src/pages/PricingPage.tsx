import React from 'react';

interface PricingPageProps {
  navigate: (path: string) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ navigate }) => {
  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-xl mx-auto space-y-2 mb-10">
          <div className="text-xs font-bold uppercase tracking-wider text-[#0088cc] bg-sky-50 px-3 py-0.5 rounded-full inline-block border border-sky-100">
            Simple & Transparent
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Single Bot Pricing Plans
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto mt-4">
            Choose the right storage capacity for your bot's files, databases, and logs. Every plan includes 24/7 dedicated execution, our easy control panel, and unlimited bandwidth.
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="p-4 sm:p-6 w-1/3">Storage Capacity</th>
                  <th className="p-4 sm:p-6 text-center">Included Features</th>
                  <th className="p-4 sm:p-6 text-right w-1/4">Price (per month)</th>
                  <th className="p-4 sm:p-6 text-center w-1/5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 sm:p-6">
                    <div className="font-extrabold text-slate-900 text-base">200 MB <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full ml-2 uppercase font-bold tracking-wider align-middle">Starter</span></div>
                    <div className="text-xs text-slate-500 mt-1">Perfect for basic utility scripts</div>
                  </td>
                  <td className="p-4 sm:p-6 text-xs text-slate-600 space-y-1">
                    <div>✓ 24/7 Bot Hosting</div>
                    <div>✓ Easy Control Panel</div>
                    <div>✓ Auto Crash Recovery</div>
                  </td>
                  <td className="p-4 sm:p-6 text-right font-black text-[#0088cc] text-lg">
                    ₹49
                  </td>
                  <td className="p-4 sm:p-6 text-center">
                    <button onClick={() => navigate('/register')} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors cursor-pointer">
                      Sign up to buy
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 sm:p-6">
                    <div className="font-extrabold text-slate-900 text-base">500 MB</div>
                    <div className="text-xs text-slate-500 mt-1">Great for simple SQLite databases</div>
                  </td>
                  <td className="p-4 sm:p-6 text-xs text-slate-600 space-y-1">
                    <div>✓ 24/7 Bot Hosting</div>
                    <div>✓ Easy Control Panel</div>
                    <div>✓ Auto Crash Recovery</div>
                  </td>
                  <td className="p-4 sm:p-6 text-right font-black text-[#0088cc] text-lg">
                    ₹79
                  </td>
                  <td className="p-4 sm:p-6 text-center">
                    <button onClick={() => navigate('/register')} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors cursor-pointer">
                      Sign up to buy
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 transition-colors bg-sky-50/20">
                  <td className="p-4 sm:p-6">
                    <div className="font-extrabold text-slate-900 text-base">1 GB <span className="text-[10px] text-[#0088cc] bg-sky-100 px-2 py-0.5 rounded-full ml-2 uppercase font-bold tracking-wider align-middle border border-sky-200">Popular</span></div>
                    <div className="text-xs text-slate-500 mt-1">Ideal for media caching & logs</div>
                  </td>
                  <td className="p-4 sm:p-6 text-xs text-slate-600 space-y-1">
                    <div className="font-semibold text-slate-800">✓ All Starter Features</div>
                    <div>✓ Extended File Support</div>
                  </td>
                  <td className="p-4 sm:p-6 text-right font-black text-[#0088cc] text-lg">
                    ₹119
                  </td>
                  <td className="p-4 sm:p-6 text-center">
                    <button onClick={() => navigate('/register')} className="w-full bg-[#24A1DE] hover:bg-[#1e8cc3] text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors cursor-pointer shadow-xs">
                      Sign up to buy
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 sm:p-6">
                    <div className="font-extrabold text-slate-900 text-base">2 GB</div>
                    <div className="text-xs text-slate-500 mt-1">For advanced media and audio bots</div>
                  </td>
                  <td className="p-4 sm:p-6 text-xs text-slate-600 space-y-1">
                    <div className="font-semibold text-slate-800">✓ All Popular Features</div>
                    <div>✓ Heavy processing supported</div>
                  </td>
                  <td className="p-4 sm:p-6 text-right font-black text-[#0088cc] text-lg">
                    ₹199
                  </td>
                  <td className="p-4 sm:p-6 text-center">
                    <button onClick={() => navigate('/register')} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors cursor-pointer">
                      Sign up to buy
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 sm:p-6">
                    <div className="font-extrabold text-slate-900 text-base">5 GB</div>
                    <div className="text-xs text-slate-500 mt-1">Enterprise scale data storage</div>
                  </td>
                  <td className="p-4 sm:p-6 text-xs text-slate-600 space-y-1">
                    <div className="font-semibold text-slate-800">✓ All Features included</div>
                    <div>✓ Highest priority container</div>
                  </td>
                  <td className="p-4 sm:p-6 text-right font-black text-[#0088cc] text-lg">
                    ₹399
                  </td>
                  <td className="p-4 sm:p-6 text-center">
                    <button onClick={() => navigate('/register')} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors cursor-pointer">
                      Sign up to buy
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

