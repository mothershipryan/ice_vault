
import React, { useState } from 'react';

const FAQ_ITEMS = [
  {
    q: "Why am i doing this?",
    a: "Ice Vault was born from a fundamental mistrust of Immigration and Customs Enforcement (ICE). History has shown a pattern of systemic abuse and the tragic, senseless deaths of innocent, hardworking individuals at the hands of state actors. When those in power operate without oversight, they often attempt to suppress evidence through intimidation or the destruction of physical devices. This platform exists to strip them of that power by ensuring every interaction is witnessed, encrypted, and stored beyond the reach of those who would seek to bury the truth."
  },
  {
    q: "How do I retrieve my footage for a court case?",
    a: "Switch to 'Retrieval' mode in the main terminal. You can locate your encrypted assets by searching for the State, City, and Date of the occurrence. Each retrieval provides a secure link to the Swiss Retrieval Terminal and a cryptographic hash for authenticity verification."
  },
  {
    q: "How is my privacy guaranteed?",
    a: "We provide zero-knowledge privacy. This means your data is encrypted locally before it ever reaches our servers. Because our infrastructure is hosted in Switzerland, your data is protected by the world's strongest data protection laws."
  },
  {
    q: "Is my footage secure?",
    a: "Yes. All assets are encrypted using zero-knowledge protocols. We utilize Supabase for secure data orchestration and Infomaniak for high-security storage, ensuring that only you hold the keys to your footage."
  },
  {
    q: "Where is the data physically stored?",
    a: "To protect against extrajudicial data requests, all ICE Vault infrastructure is hosted in Switzerland. This ensures your data is protected by strict Swiss data protection laws and international neutrality standards."
  },
  {
    q: "What happens if my phone is seized?",
    a: "Because ICE Vault uploads directly to our secure Swiss Retrieval Terminal, the footage is preserved even if the physical device is destroyed or confiscated immediately after the upload completes."
  },
  {
    q: "Can I delete or edit uploads?",
    a: "Negative. To maintain evidentiary integrity, all vault deposits are immutable once finalized. No post-upload modification is permitted to prevent claims of tampering."
  },
  {
    q: "Why isn't this available on the App Store or Google Play?",
    a: "Centralized app stores are subject to corporate censorship and government pressure. Historically, tools that empower citizens against state actors are targeted for removal. By remaining a Progressive Web App (PWA), we ensure this protocol cannot be remotely de-platformed, wiped from your device, or suppressed by tech giants. It is built to be uncensorable and perpetually accessible."
  }
];

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-full space-y-3 mt-10 mb-6">
      <div className="flex items-center gap-4 justify-center mb-6">
        <div className="h-[1px] flex-1 bg-slate-800"></div>
        <h2 className="text-slate-500 text-[9px] font-black tracking-[0.3em] uppercase">
          FAQ
        </h2>
        <div className="h-[1px] flex-1 bg-slate-800"></div>
      </div>

      {FAQ_ITEMS.map((item, idx) => (
        <div
          key={idx}
          className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-sm"
        >
          <button
            onClick={() => toggle(idx)}
            className="w-full flex items-center justify-between p-5 text-left active:bg-slate-800 transition-colors"
          >
            <span className={`text-xs font-bold transition-colors ${openIndex === idx ? 'text-blue-400' : 'text-slate-300'}`}>
              {item.q}
            </span>
            <svg
              className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${openIndex === idx ? 'rotate-180 text-blue-400' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div
            className={`transition-all duration-300 ease-in-out ${openIndex === idx ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}
          >
            <p className="px-5 pb-5 text-[11px] leading-relaxed text-slate-400 font-medium border-t border-white/5 pt-4">
              {item.a}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FAQ;
