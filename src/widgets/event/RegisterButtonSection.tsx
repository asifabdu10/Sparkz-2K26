import React from "react";
import Link from "next/link";
import {
  FaArrowLeft,
  FaArrowRight,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { Event } from "@/utils/types/event";

interface Props {
  event: Event;
}

const RegisterButtonSection: React.FC<Props> = ({ event }) => {
  return (
    <div className="relative">
      <div className="space-y-4">
        {event.regLink ? (
          // External Link
          <Link
            href={event.regLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold group relative flex items-center justify-center gap-3 w-full rounded-full p-4 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          >
            <span className="text-lg font-bold text-[#0B0B0E]">Register Now</span>
            <FaExternalLinkAlt className="text-[#0B0B0E] text-sm transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        ) : (
          // Internal Link
          <Link
            href={`./${event.id}/register`}
            className="btn-gold group relative flex items-center justify-center gap-3 w-full rounded-full p-4 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          >
            <span className="text-lg font-bold text-[#0B0B0E]">Register Now</span>
            <FaArrowRight className="text-[#0B0B0E] transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        )}
      </div>
    </div>
  );
};

export default RegisterButtonSection;
