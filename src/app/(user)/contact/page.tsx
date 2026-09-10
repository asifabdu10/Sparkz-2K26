"use client";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, User } from "lucide-react";
import Head from "next/head";
import Link from "next/link";

const coordinators = [
  {
    role: "Staff Coordinator",
    name: "Dr. Kannan C. Bhanu",
    phone: "+91 94963 31267",
    email: "sparkz@carmelcet.in",
  },
  {
    role: "Student Coordinator",
    name: "Mr. Steev Palliath",
    phone: "+91 62358 34190",
    email: "sparkz@carmelcet.in",
  },
];

const contactInfo = {
  address: "Carmel College of Engineering & Technology, Kerala, India",
  generalEmail: "sparkz@carmelcet.in",
  website: "sparkz.carmelcet.in",
};

export default function ContactPage() {
  return (
    <>
      <Head>
        <title>
          Contact Us - Sparkz &apos;26 | Carmel College of Engineering &
          Technology
        </title>
        <meta
          name="description"
          content="Get in touch with Sparkz 2K26 coordinators. Contact Dr. Kannan C. Bhanu (Staff Coordinator) at +91 94963 31267 or Mr. Steev Palliath (Student Coordinator) at +91 62358 34190 for event information, registrations, and inquiries."
        />
        <meta
          name="keywords"
          content="Sparkz contact, Sparkz 2K26 contact, Carmel College tech fest contact, event coordinators, Sparkz registration help, tech fest Kerala contact, Dr Kannan C Bhanu, Steev Palliath, Carmel College events, college fest contact, event inquiry, Sparkz support, tech fest coordinators, ABHERI contact, band competition contact"
        />
        <meta name="author" content="Sparkz 2K26 Team" />
        <link rel="canonical" href="https://sparkz.carmelcet.in/contact" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://sparkz.carmelcet.in/contact" />
        <meta
          property="og:title"
          content="Contact Sparkz 2K26 - Get Event Information & Support"
        />
        <meta
          property="og:description"
          content="Reach out to our coordinators for Sparkz 2K26 event details, registrations, and support. Staff Coordinator: Dr. Kannan C. Bhanu | Student Coordinator: Mr. Steev Palliath"
        />
        <meta
          property="og:image"
          content="https://sparkz.carmelcet.in/sparkz.svg"
        />
        <meta property="og:locale" content="en_IN" />
        <meta property="og:site_name" content="Sparkz 2K26" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:url"
          content="https://sparkz.carmelcet.in/contact"
        />
        <meta
          name="twitter:title"
          content="Contact Sparkz 2K26 - Event Coordinators"
        />
        <meta
          name="twitter:description"
          content="Get in touch with Sparkz 2K26 coordinators for event information and support. Contact us today!"
        />
        <meta
          name="twitter:image"
          content="https://sparkz.carmelcet.in/sparkz.svg"
        />

        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <meta
          name="googlebot"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />

        {/* Contact Information for Search Engines */}
        <meta name="contact:phone:staff" content="+91 94963 31267" />
        <meta name="contact:phone:student" content="+91 62358 34190" />
        <meta name="contact:email" content="sparkz@carmelcet.in" />

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ContactPage",
              name: "Sparkz 2K26 Contact Page",
              description:
                "Contact information for Sparkz 2K26 tech fest coordinators",
              url: "https://sparkz.carmelcet.in/contact",
              mainEntity: {
                "@type": "Organization",
                name: "Sparkz 2K26 - Carmel College of Engineering & Technology",
                url: "https://sparkz.carmelcet.in",
                contactPoint: [
                  {
                    "@type": "ContactPoint",
                    telephone: "+91-94963-31267",
                    contactType: "Staff Coordinator",
                    name: "Dr. Kannan C. Bhanu",
                    areaServed: "IN",
                    availableLanguage: ["English", "Malayalam"],
                  },
                  {
                    "@type": "ContactPoint",
                    telephone: "+91-62358-34190",
                    contactType: "Student Coordinator",
                    name: "Mr. Steev Palliath",
                    areaServed: "IN",
                    availableLanguage: ["English", "Malayalam"],
                  },
                ],
              },
            }),
          }}
        />
      </Head>

      <div className="min-h-screen bg-[#0B0B0E] text-white">
        {/* Background Effects */}
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute left-[-10%] top-[10%] h-96 w-96 rounded-full bg-[#3A270D]/40 blur-[140px]" />
          <div className="absolute right-[-5%] top-[30%] h-96 w-96 rounded-full bg-[#3A270D]/30 blur-[150px]" />
          <div className="absolute left-[20%] bottom-[10%] h-96 w-96 rounded-full bg-[#3A270D]/20 blur-[140px]" />
        </div>

        {/* Grid Pattern */}
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(212,163,89,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(212,163,89,0.03)_1px,transparent_1px)] bg-[size:100px_100px] opacity-30" />

        {/* Content */}
        <div className="relative z-10 px-6 py-20 sm:py-32">
          <div className="mx-auto max-w-7xl">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,163,89,0.3)] bg-[#3A270D]/60 px-4 py-2 text-[13px] font-bold uppercase tracking-widest text-[#F3C87A] backdrop-blur mb-6">
                <span className="h-2 w-2 rounded-full bg-[#F3C87A] animate-pulse" />
                Get in Touch
              </div>

              <h1 className="text-5xl font-black leading-tight sm:text-6xl lg:text-7xl text-white">
                For more{" "}
                <span className="gold-gradient-text">
                  info
                </span>
              </h1>

              <p className="mt-6 text-lg text-[#A1A1AA] leading-relaxed max-w-2xl mx-auto">
                Have questions? Our coordinators are here to help. Reach out to
                us anytime!
              </p>
            </motion.div>

            {/* Coordinators Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
              {coordinators.map((coordinator, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="group"
                >
                  <div className="relative rounded-3xl border border-[rgba(212,163,89,0.25)] bg-[#131318] backdrop-blur overflow-hidden hover:border-[rgba(212,163,89,0.5)] transition-all duration-500 hover:shadow-2xl hover:shadow-black hover:-translate-y-2">
                    <div className="relative p-8 sm:p-10">
                      {/* Role Badge */}
                      <div className="inline-block px-4 py-2 mb-6 rounded-lg bg-[#3A270D] border border-[rgba(212,163,89,0.3)] backdrop-blur-md">
                        <span className="text-[#FDE6B0] text-xs font-bold tracking-widest uppercase">
                          {coordinator.role}
                        </span>
                      </div>

                      {/* Name */}
                      <div className="flex items-start gap-3 mb-6">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#3A270D] flex items-center justify-center border border-[rgba(212,163,89,0.3)]">
                          <User className="w-6 h-6 text-[#F3C87A]" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-white tracking-tight">
                            {coordinator.name}
                          </h3>
                        </div>
                      </div>

                      {/* Contact Details */}
                      <div className="space-y-4">
                        {/* Phone */}
                        <a
                          href={`tel:${coordinator.phone.replace(/\s/g, "")}`}
                          className="flex items-center gap-3 text-[#A1A1AA] hover:text-[#FDE6B0] transition-colors group/link"
                        >
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#3A270D]/80 flex items-center justify-center border border-[rgba(212,163,89,0.3)] group-hover/link:border-[#F3C87A] transition-colors">
                            <Phone className="w-5 h-5 text-[#F3C87A]" />
                          </div>
                          <span className="text-lg font-semibold text-white group-hover/link:text-[#F3C87A] transition-colors">
                            {coordinator.phone}
                          </span>
                        </a>

                        {/* Email */}
                        <a
                          href={`mailto:${coordinator.email}`}
                          className="flex items-center gap-3 text-[#A1A1AA] hover:text-[#FDE6B0] transition-colors group/link"
                        >
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#3A270D]/80 flex items-center justify-center border border-[rgba(212,163,89,0.3)] group-hover/link:border-[#F3C87A] transition-colors">
                            <Mail className="w-5 h-5 text-[#F3C87A]" />
                          </div>
                          <span className="text-sm">{coordinator.email}</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Additional Contact Info */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="relative rounded-3xl border border-[rgba(212,163,89,0.25)] bg-[#131318] backdrop-blur overflow-hidden"
            >
              <div className="relative p-8 sm:p-10">
                <h2 className="text-2xl font-black gold-gradient-text mb-8 tracking-tight">
                  General Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Address */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#3A270D] flex items-center justify-center border border-[rgba(212,163,89,0.3)]">
                      <MapPin className="w-5 h-5 text-[#F3C87A]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#FDE6B0] uppercase tracking-wider mb-1">
                        Location
                      </h3>
                      <p className="text-[#A1A1AA]">{contactInfo.address}</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#3A270D] flex items-center justify-center border border-[rgba(212,163,89,0.3)]">
                      <Mail className="w-5 h-5 text-[#F3C87A]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#FDE6B0] uppercase tracking-wider mb-1">
                        General Email
                      </h3>
                      <a
                        href={`mailto:${contactInfo.generalEmail}`}
                        className="text-[#A1A1AA] hover:text-[#F3C87A] transition-colors"
                      >
                        {contactInfo.generalEmail}
                      </a>
                    </div>
                  </div>

                  {/* Website */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#3A270D] flex items-center justify-center border border-[rgba(212,163,89,0.3)]">
                      <svg
                        className="w-5 h-5 text-[#F3C87A]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#FDE6B0] uppercase tracking-wider mb-1">
                        Website
                      </h3>
                      <p className="text-[#A1A1AA]">{contactInfo.website}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* CTA Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-16 text-center"
            >
              <p className="text-[#A1A1AA] mb-6">
                Ready to be part of Sparkz &apos;26?
              </p>
              <Link
                href="/events"
                className="inline-flex items-center justify-center gap-2 rounded-full btn-gold px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-[#0B0B0E] shadow-[0_0_20px_rgba(212,163,89,0.35)] hover:scale-105 transition-all duration-300 transform"
              >
                Explore Events
                <span className="text-xs">→</span>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
