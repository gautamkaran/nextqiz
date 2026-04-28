import Image from "next/image";
import Link from "next/link";
import { Lobster } from "next/font/google";

const lobster = Lobster({
  weight: "400",
  subsets: ["latin"],
});

const Logo = ({ size = 38 }) => {
  return (
    <Link
      href="/"
      aria-label="NextQiz - Online Quiz and Assessment Platform"
      className="flex items-end"
    >
      <Image
        src="/Icon.svg"
        alt="NextQiz Online Quiz Platform Logo"
        height={size}
        width={size}
        priority
      />

      <span
        className={`${lobster.className} inline-flex items-center font-semibold tracking-tight leading-none`}
        style={{ fontSize: size * 0.72 }}
      >
        <span className="text-white">Next</span>
        <span className="text-emerald-400">Qiz</span>
      </span>
    </Link>
  );
};

export default Logo;
