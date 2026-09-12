"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { db } from "@/utils/firebase";
import { useAuth } from "@/context/AuthContext";
import RisingLines from "@/components/ui/RisingLines";

const rulesSections = [
  {
    title: "Eligibility",
    points: [
      "The competition is open to bonafide students of recognized colleges.",
      "Each band must consist of 5 to 10 members (minimum 2 vocals and 3 instruments).",
      "All participants must carry a valid college ID card.",
      "2 or 3 recent graduates from same college can also perform with the band, provided, they submit any kindof proof that they belonged to the same college",
      "A participant may represent only one band in the competition.",
    ],
  },
  {
    title: "Performance Rules",
    points: [
      "Each band will be allotted 30 minutes (10-15 mins for performance), including setup and sound check.",
      "Exceeding the time limit will result in negative marking.",
      "Bands may perform songs from any genre.",
      " Use of pre-recorded backing tracks and Virtual Studio Technology (VST) are strictly prohibited.",
      "Lyrics and performances must not contain obscene, offensive, or politically provocative content.",
      "Performances may be in English or any Indian language.",
    ],
  },
  {
    title: "Instruments & Technical Requirements",
    points: [
      "Bands must bring their own musical instruments.",
      "The organizers will provide a standard PA system (2 stereo jacks & 3 mono jack cable on stage), microphones, and drum kit.",
      "Any special technical requirements must be informed during registration (like condenser microphones).",
      "The organizing committee will not be responsible for technical failures caused by personal equipment.",
    ],
  },
  {
    title: "Judging Criteria",
    points: [
      "Bands will be judged based on: Musical precision & rhythm, Originality & creativity, Coordination & harmony, Stage presence & audience engagement, Overall impact.",
      "The verdict of the judging panel is final and shall not be questioned under any circumstances.",
    ],
  },
  {
    title: "Prize Money",
    points: [
      "First Prize: ₹30,000",
      "Second Prize: ₹20,000",
      "Third Prize: ₹10,000",
      "All winners will receive certificates and trophies.",
    ],
  },
  {
    title: "Code of Conduct",
    points: [
      "Participants must maintain discipline and sportsmanship throughout the event.",
      "Any form of misconduct, substance use, or violation of campus rules will result in immediate disqualification.",
      "Any damage to the venue or equipment will be the responsibility of the respective band.",
    ],
  },
  {
    title: "Registration & General Instructions",
    points: [
      "Bands must complete registration before the specified deadline.",
      "Reporting time will be announced; late reporting may lead to disqualification.",
      "The order of performance will be decided by draw of lots or organizer discretion.",
      "The organizing committee reserves the right to modify rules if necessary.",
      "Participation implies acceptance of all the above rules.",
    ],
  },
  {
    title: "Online Competition",
    points: [
      "If registrations exceed 10 teams, a screening round will be conducted through video submissions.",
      "Bands must submit a recorded performance video to the event coordinator.",
      "Judging committee will shortlist 10 bands, and the decision shall be final.",
      "Non-selected bands will receive a full refund of the registration fee.",
    ],
  },
];

const chiefGuestImage = "/ouseppachan.png";

export default function AbheriPage() {
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();

  const [abheriRegistered, setAbheriRegistered] = useState(false);
  const [checkingAbheriRegistration, setCheckingAbheriRegistration] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const checkAbheriRegistration = async () => {
      if (!user) {
        setAbheriRegistered(false);
        setCheckingAbheriRegistration(false);
        return;
      }

      try {
        const q = query(
          collection(db, "abheri_registrations"),
          where("userId", "==", user.uid),
          limit(1)
        );

        const snapshot = await getDocs(q);
        setAbheriRegistered(!snapshot.empty);
      } catch (error) {
        console.error("Failed to check Abheri registration:", error);
        setAbheriRegistered(false);
      } finally {
        setCheckingAbheriRegistration(false);
      }
    };

    checkAbheriRegistration();
  }, [user]);

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative isolate overflow-hidden pt-10 pb-20 sm:py-15">
        {mounted && (
          <>
            <div className="pointer-events-none absolute inset-0 z-0">
              <RisingLines
                color="#D4A359"
                horizonColor="#3A270D"
                particles={500}
                riseSpeed={30}
                opacity={90}
                scale={8}
                showHorizon={true}
                horizonOpacity={40}
              />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0B0B0E] via-transparent to-transparent h-64" />
            <div className="pointer-events-none absolute left-[-10%] top-[10%] h-96 w-96 rounded-full bg-[#3A270D]/40 blur-[140px]" />
            <div className="hidden sm:block pointer-events-none absolute right-[-5%] top-[15%] h-96 w-96 rounded-full bg-[#3A270D]/30 blur-[150px]" />
          </>
        )}
        <div className="relative z-10 px-[5vw]">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center space-y-8"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,163,89,0.3)] bg-[#3A270D]/60 px-4 py-2 text-[13px] font-bold uppercase tracking-widest text-[#F3C87A] backdrop-blur mx-auto">
                <span className="h-2 w-2 rounded-full bg-[#F3C87A] animate-pulse" />
                Inter-Collegiate Band Competition
              </div>
              <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-7xl">
                <span className="gold-gradient-text">
                  ABHERI
                </span>
                <br />
                <span className="text-white">Rock the Stage on</span> <br />
                <span className="text-[#F3C87A]">8 Oct 2026</span>
              </h1>
              <div className="max-w-2xl mx-auto rounded-2xl border border-[rgba(212,163,89,0.3)] bg-[#131318]/90 p-5 sm:p-6 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.7)]">
                <p className="text-lg sm:text-xl text-[#FDE6B0] font-medium leading-relaxed">
                  Unleash your band&apos;s energy at Sparkz 2K26 – Prize pool up to{" "}
                  <span className="text-[#F3C87A] font-bold">₹60,000</span> | Teams of 5-10 | Reg:{" "}
                  <span className="text-[#F3C87A] font-bold">₹1,200</span>
                </p>
              </div>
              {abheriRegistered ? (
                <div className="inline-flex items-center justify-center gap-2 rounded-full border border-[rgba(212,163,89,0.4)] bg-[#3A270D]/80 px-8 py-3 text-sm font-bold uppercase tracking-widest text-[#F3C87A] w-full md:w-auto">
                  ✓ Registered
                </div>
              ) : (
                <Link
                  href="/abheri/register"
                  className="inline-flex items-center justify-center gap-2 rounded-full btn-gold px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-[#0B0B0E] shadow-[0_0_20px_rgba(212,163,89,0.35)] hover:scale-105 transition-transform w-full md:w-auto"
                >
                  Register Now
                </Link>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Chief Guest Section */}
      <section className="relative isolate overflow-hidden pb-20 pt-10 sm:pt-14">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0E] via-[#131318]/50 to-[#0B0B0E]" />
        {mounted && (
          <div className="hidden sm:block pointer-events-none absolute left-[-10%] top-[-10%] h-[600px] w-[600px] rounded-full bg-[#3A270D]/30 blur-[180px]" />
        )}
        <div className="relative z-10 px-[5vw]">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                {/* Image Side */}
                <div className="w-full lg:w-1/2">
                  <div className="relative mx-auto w-full max-w-sm lg:max-w-md aspect-[4/5] sm:aspect-[3/4] lg:aspect-[4/5] overflow-hidden rounded-3xl border border-[rgba(212,163,89,0.3)] shadow-2xl shadow-black group">
                    <Image
                      src={chiefGuestImage}
                      alt="Ouseppachan"
                      fill
                      className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0E] via-transparent to-transparent opacity-80" />
                  </div>
                </div>

                {/* Content Side */}
                <div className="w-full lg:w-1/2 space-y-8 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,163,89,0.3)] bg-[#3A270D]/60 px-4 py-2 text-[13px] font-bold uppercase tracking-widest text-[#F3C87A] backdrop-blur">
                    <span className="h-2 w-2 rounded-full bg-[#F3C87A] animate-pulse" />
                    Chief Guest Spotlight
                  </div>

                  <h2 className="text-4xl font-black leading-tight sm:text-5xl lg:text-7xl">
                    <span className="gold-gradient-text">Ouseppachan</span>
                  </h2>

                  <div className="space-y-4">
                    <p className="text-xl text-[#FDE6B0] font-medium leading-relaxed">
                      Renowned Film Composer, Music Director, Producer, Violinist &amp; Singer.
                    </p>
                    <p className="text-lg text-[#A1A1AA] leading-relaxed max-w-xl mx-auto lg:mx-0">
                      Gracing the stage of Sparkz at Abheri 2K26, experience the
                      timeless artistry of a legendary musician whose music continues to resonate across generations.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Competition Judge Section - Roshan NC */}
      <section className="relative isolate overflow-hidden pb-20 pt-10 sm:pt-14">
        <div className="absolute inset-0 bg-[#0B0B0E]" />
        {mounted && (
          <div className="hidden sm:block pointer-events-none absolute right-[-10%] bottom-[-10%] h-[500px] w-[500px] rounded-full bg-[#3A270D]/25 blur-[150px]" />
        )}
        <div className="relative z-10 px-[5vw]">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-20">
                {/* Image Side */}
                <div className="w-full lg:w-1/2">
                  <div className="relative mx-auto w-full max-w-sm lg:max-w-md aspect-[4/5] sm:aspect-[3/4] lg:aspect-[4/5] overflow-hidden rounded-3xl border border-[rgba(212,163,89,0.3)] shadow-2xl shadow-black group">
                    <Image
                      src="/roshan_nc.png"
                      alt="Roshan NC"
                      fill
                      className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0E] via-transparent to-transparent opacity-80" />
                  </div>
                </div>

                {/* Content Side */}
                <div className="w-full lg:w-1/2 space-y-8 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,163,89,0.3)] bg-[#3A270D]/60 px-4 py-2 text-[13px] font-bold uppercase tracking-widest text-[#F3C87A] backdrop-blur">
                    <span className="h-2 w-2 rounded-full bg-[#F3C87A] animate-pulse" />
                    Competition Judge
                  </div>

                  <h2 className="text-4xl font-black leading-tight sm:text-5xl lg:text-7xl">
                    <span className="gold-gradient-text">Roshan NC</span>
                  </h2>

                  <div className="space-y-4">
                    <p className="text-xl text-[#FDE6B0] font-medium leading-relaxed">
                      Acclaimed Musician &amp; Guitarist.
                    </p>
                    <p className="text-lg text-[#A1A1AA] leading-relaxed max-w-xl mx-auto lg:mx-0">
                      Bringing his technical expertise and cinematic music experience to judge the performances at Abheri 2K26.
                      Elevate your performance under the keen eye of a true industry professional.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Rules Section */}
      <section id="rules" className="relative py-20 bg-[#0B0B0E]">
        <div className="relative z-10 px-[5vw]">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center space-y-8 mb-16"
            >
              <h2 className="text-4xl font-black sm:text-5xl">
                <span className="text-white">Rules &amp; </span>
                <span className="gold-gradient-text">Regulations</span>
              </h2>
              <p className="text-xl text-[#A1A1AA] max-w-2xl mx-auto">
                Know the guidelines to rock the stage without a hitch.
              </p>
            </motion.div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
              {rulesSections.map((section, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="rounded-3xl border border-[rgba(212,163,89,0.25)] bg-[#131318] overflow-hidden flex flex-col hover:border-[rgba(212,163,89,0.45)] transition-all duration-300"
                >
                  <div className="px-8 py-5 bg-[#3A270D]/60 border-b border-[rgba(212,163,89,0.25)]">
                    <h3 className="text-md font-bold uppercase tracking-widest text-[#FDE6B0]">
                      {section.title}
                    </h3>
                  </div>
                  <div className="p-8 space-y-4 flex-1">
                    {section.points.map((point, pIdx) => (
                      <div key={pIdx} className="flex items-start gap-4">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3A270D] text-[#F3C87A] font-bold text-xs mt-0.5 border border-[rgba(212,163,89,0.3)]">
                          {pIdx + 1}
                        </div>
                        <p className="text-[#A1A1AA] leading-relaxed text-base">
                          {point}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contacts & CTA Section */}
      <section className="relative py-24 bg-[#0B0B0E]">
        <div className="relative z-10 px-[5vw]">
          <div className="mx-auto max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center space-y-12"
            >
              <div className="space-y-6">
                <h2 className="text-4xl font-black sm:text-5xl">
                  <span className="text-white">Ready to </span>
                  <span className="gold-gradient-text">Jam?</span>
                </h2>
                <div className="inline-flex flex-wrap justify-center gap-4">
                  <span className="px-6 py-2 rounded-full bg-[#131318] border border-[rgba(212,163,89,0.25)] text-[#A1A1AA] text-sm font-medium">
                    Reg Fee:{" "}
                    <span className="text-[#F3C87A] font-bold">₹1,200</span> / team
                  </span>
                  <span className="px-6 py-2 rounded-full bg-[#131318] border border-[rgba(212,163,89,0.25)] text-[#A1A1AA] text-sm font-medium">
                    Date:{" "}
                    <span className="text-[#F3C87A] font-bold">8 Oct 2026</span>
                  </span>
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
                {[
                  {
                    title: "Faculty Coordinator",
                    name: "Dr. Kannan C. Bhanu",
                    phone: "+91 94963 31267",
                  },
                  {
                    title: "Student Coordinator",
                    name: "Mr. Steev Palliath",
                    phone: "+91 62358 34190",
                  },
                ].map((contact, i) => (
                  <div
                    key={i}
                    className="p-6 rounded-2xl border border-[rgba(212,163,89,0.25)] bg-[#131318] hover:border-[rgba(212,163,89,0.45)] transition-colors"
                  >
                    <h3 className="text-sm font-bold text-[#F3C87A] uppercase tracking-widest mb-2">
                      {contact.title}
                    </h3>
                    <p className="text-xl font-bold text-white mb-1">
                      {contact.name}
                    </p>
                    <a
                      href={`tel:${contact.phone.replace(/ /g, "")}`}
                      className="text-[#A1A1AA] hover:text-[#FDE6B0] transition-colors"
                    >
                      {contact.phone}
                    </a>
                  </div>
                ))}
              </div>
              {abheriRegistered ? (
                <div className="inline-flex items-center justify-center gap-2 rounded-full border border-[rgba(212,163,89,0.4)] bg-[#3A270D]/80 px-8 py-3 text-sm font-bold uppercase tracking-widest text-[#F3C87A] w-full md:w-auto">
                  ✓ Registered
                </div>
              ) : (
                <Link
                  href="/abheri/register"
                  className="inline-flex items-center justify-center gap-2 rounded-full btn-gold px-8 py-3.5 text-sm font-bold uppercase tracking-widest text-[#0B0B0E] shadow-[0_0_20px_rgba(212,163,89,0.35)] hover:scale-105 transition-transform w-full md:w-auto"
                >
                  Register Now
                </Link>
              )}
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
