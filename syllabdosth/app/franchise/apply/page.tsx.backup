
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function FranchiseApplicationPage() {
  const [investment, setInvestment] = useState('');
  const [customInvestment, setCustomInvestment] = useState('');

  return (
    <main className="min-h-screen bg-[#F7F7FB] px-4 py-12 text-gray-900">
      <div className="mx-auto max-w-3xl">
        <Link href="/franchise" className="text-sm font-semibold text-indigo-600">
          ← Back to Franchise
        </Link>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Syllabdosth Franchise
          </p>

          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            Start Your Own Learning Centre
          </h1>

          <p className="mt-3 leading-7 text-gray-600">
            Interested in becoming a franchise partner? Share your details,
            preferred location and investment plans with us.
          </p>

          <form
            action="mailto:info@syllabdosth.com"
            method="post"
            encType="text/plain"
            className="mt-8 space-y-6"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Full name *
                <input
                  name="Full name"
                  required
                  placeholder="Enter your full name"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </label>

              <label className="block text-sm font-medium">
                Mobile number *
                <input
                  name="Mobile number"
                  type="tel"
                  required
                  placeholder="+91"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </label>

              <label className="block text-sm font-medium">
                Email address *
                <input
                  name="Email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </label>

              <label className="block text-sm font-medium">
                Preferred location *
                <input
                  name="Preferred location"
                  required
                  placeholder="City / District"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-indigo-500"
                />
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium">
                Investment budget *
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {['₹1–2 lakh', '₹2–5 lakh', '₹5 lakh+', 'Custom amount'].map(
                  (option) => (
                    <label
                      key={option}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${
                        investment === option
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="Investment budget"
                        value={option}
                        required
                        checked={investment === option}
                        onChange={() => setInvestment(option)}
                      />
                      <span className="font-medium">{option}</span>
                    </label>
                  )
                )}
              </div>

              {investment === 'Custom amount' && (
                <label className="mt-4 block text-sm font-medium">
                  Enter your investment amount *
                  <input
                    name="Custom investment amount"
                    required
                    value={customInvestment}
                    onChange={(event) => setCustomInvestment(event.target.value)}
                    placeholder="Enter amount in ₹"
                    className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-indigo-500"
                  />
                </label>
              )}
            </div>

            <label className="block text-sm font-medium">
              Do you have business experience?
              <select
                name="Business experience"
                defaultValue=""
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
              >
                <option value="" disabled>
                  Select an option
                </option>
                <option>Yes, I have experience</option>
                <option>No, I am a beginner</option>
              </select>
            </label>

            <label className="block text-sm font-medium">
              Additional details
              <textarea
                name="Additional details"
                rows={4}
                placeholder="Tell us about your plans or ask a question..."
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 px-6 py-4 font-semibold text-white hover:bg-indigo-700"
            >
              Submit Franchise Enquiry →
            </button>

            <p className="text-center text-xs leading-5 text-gray-500">
              Our team will review your enquiry and contact you to discuss
              franchise opportunities and investment requirements.
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
