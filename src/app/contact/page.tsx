import React, { Suspense } from 'react';
import Link from 'next/link';
import { ChevronRight, MapPin, Mail, Phone, Clock, MessageSquare, ShieldCheck } from 'lucide-react';
import ContactForm from './ContactForm';
import prisma from '@/lib/prisma';
import { normalizeContactInfo, DEFAULT_CONTACT_INFO } from '@/lib/content';

export const metadata = {
  title: 'Contact Us | Sherman International (P) Limited',
  description:
    'Contact Sherman International in New Delhi for technical queries, product specifications, datasheets, and techno-commercial proposals.',
};
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ContactPage() {
  const contactRecord = await prisma.siteContent.findUnique({
    where: { key: 'contact_info' },
  });
  const contact = normalizeContactInfo(contactRecord);

  const cleanPhone = contact.phone.replace(/[^0-9+]/g, '');
  const cleanWhatsApp = contact.whatsapp.replace(/[^0-9]/g, '');

  const rawPhones = [
    contact.phone,
    contact.phoneSecondary,
  ].filter(Boolean);

  const phoneNumbers = Array.from(
    new Set(
      rawPhones
        .flatMap((p) => (typeof p === 'string' ? p.split(/[\/,]/) : []))
        .map((p) => p.trim())
        .filter(Boolean)
    )
  );

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-900 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-800">Contact Us</span>
        </nav>

        {/* Page Hero */}
        <div className="bg-navy text-white rounded-lg p-8 sm:p-12 mb-10 border border-slate-800">
          <div className="max-w-3xl space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300 px-2.5 py-1 rounded bg-white/10 border border-white/15 inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Direct Communication Desk
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
              Get in Touch with Sherman International
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Our application technocrats and commercial team are ready to assist with technical calculations, product datasheets, and EPC documentation.
            </p>
          </div>
        </div>

        {/* Contact Grid: Form + Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16">
          {/* Contact Form (Col 1-7) */}
          <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 p-8 sm:p-10 shadow-xs">
            <div className="mb-6 space-y-1">
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Send a Message or Enquiry
              </h2>
              <p className="text-xs text-slate-500">
                Fill in your project requirements below. All submissions are dispatched directly to Sherman International's engineering team.
              </p>
            </div>

            <Suspense fallback={<div className="py-8 text-center text-xs text-slate-400">Loading form...</div>}>
              <ContactForm />
            </Suspense>
          </div>

          {/* Contact Details & Office (Col 8-12) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Headquarters Card */}
            <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-xs space-y-6">
              <h3 className="font-display font-bold text-lg text-slate-900 border-b border-slate-100 pb-3">
                {contact.company || 'Corporate Office'}
              </h3>

              <div className="space-y-4 text-xs sm:text-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-slate-100 text-slate-700 mt-0.5 border border-slate-200">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Registered Office Address</div>
                    <div className="text-slate-600 mt-0.5 leading-relaxed whitespace-pre-line">
                      {contact.address || DEFAULT_CONTACT_INFO.address}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-slate-100 text-slate-700 mt-0.5 border border-slate-200">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Sherman Sales &amp; Services Pvt Ltd</div>
                    <div className="text-slate-600 mt-0.5 leading-relaxed whitespace-pre-line">
                      E-105, 10th Floor, Himalaya House<br />
                      23 K. G. Marg, New Delhi - 110001
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-slate-100 text-slate-700 mt-0.5 border border-slate-200">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">General &amp; Commercial Enquiries</div>
                    <a
                      href={`mailto:${contact.enquiryEmail || contact.email || DEFAULT_CONTACT_INFO.enquiryEmail}`}
                      className="text-navy hover:underline font-semibold block mt-0.5"
                    >
                      {contact.enquiryEmail || contact.email || DEFAULT_CONTACT_INFO.enquiryEmail}
                    </a>
                  </div>
                </div>

                {contact.technicalSupportEmail && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded bg-amber-50 text-amber-700 mt-0.5 border border-amber-200">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Technical Support Desk</div>
                      <a
                        href={`mailto:${contact.technicalSupportEmail}`}
                        className="text-navy hover:underline font-semibold block mt-0.5"
                      >
                        {contact.technicalSupportEmail}
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-slate-100 text-slate-700 mt-0.5 border border-slate-200">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Telephone / Mobile</div>
                    <div className="mt-1 space-y-1">
                      {phoneNumbers.length > 0 ? (
                        phoneNumbers.map((num) => {
                          const cleanNum = num.replace(/[^0-9+]/g, '');
                          return (
                            <a
                              key={num}
                              href={`tel:${cleanNum}`}
                              className="block text-slate-700 font-semibold hover:text-navy hover:underline transition-colors"
                            >
                              {num}
                            </a>
                          );
                        })
                      ) : (
                        <a
                          href={`tel:${cleanPhone}`}
                          className="block text-slate-700 font-semibold hover:text-navy hover:underline transition-colors"
                        >
                          {contact.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-slate-100 text-slate-700 mt-0.5 border border-slate-200">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Working Hours</div>
                    <div className="text-slate-600 mt-0.5">
                      {contact.workingHours || DEFAULT_CONTACT_INFO.workingHours}
                    </div>
                  </div>
                </div>
              </div>

              {/* WhatsApp Fast Button */}
              <div className="pt-4 border-t border-slate-100">
                <a
                  href={`https://wa.me/${cleanWhatsApp || '919015122200'}?text=Hello%20Sherman%20International,%20I%20have%20an%20engineering%20enquiry.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Connect with Sherman on WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Google Map Box */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs h-64 relative">
              <iframe
                title="Sherman International Office Location"
                src={contact.googleMapsUrl || DEFAULT_CONTACT_INFO.googleMapsUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
